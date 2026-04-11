import { fetchJson, getIdToken } from '../../../shared/api/apiClient';

const DEVICE_ID_KEY = 'pushDeviceId';

const logPushEvent = (event: string, details?: Record<string, unknown>): void => {
  console.info('[push]', event, details ?? {});
};

export const getPushApiOrigin = (): string => {
  const value = import.meta.env.VITE_PUSH_API_ORIGIN;
  return typeof value === 'string' && value.trim() ? value.trim() : 'https://api.herculito.exloz.site';
};

const generateDeviceId = (): string => {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return `${Date.now()}-${Math.random()}`;
};

export const getOrCreateDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const created = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return generateDeviceId();
  }
};

export const isIosDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua);
};

export const isAndroidDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

export const isStandalonePwa = (): boolean => {
  if (typeof window === 'undefined') return false;

  const standaloneFromMedia = window.matchMedia?.('(display-mode: standalone)')?.matches;
  if (standaloneFromMedia) return true;

  const nav = navigator as Navigator & { standalone?: unknown };
  return nav.standalone === true;
};

export const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const isIosPushCapable = (): boolean => {
  return isIosDevice() && isPushSupported();
};

export const isAndroidPushCapable = (): boolean => {
  return isAndroidDevice() && isPushSupported();
};

export const parseBooleanEnvFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export const isAndroidBackgroundPushEnabled = (): boolean => {
  return parseBooleanEnvFlag(import.meta.env.VITE_ANDROID_BACKGROUND_PUSH_ENABLED);
};

export const shouldUseBackgroundRestPushForPlatform = (args: {
  iosPushCapable: boolean;
  androidPushCapable: boolean;
  standalonePwa: boolean;
  androidBackgroundPushEnabled: boolean;
}): boolean => {
  if (args.iosPushCapable) return args.standalonePwa;
  return args.androidPushCapable && args.androidBackgroundPushEnabled;
};

export const shouldUseBackgroundRestPush = (): boolean => {
  return shouldUseBackgroundRestPushForPlatform({
    iosPushCapable: isIosPushCapable(),
    androidPushCapable: isAndroidPushCapable(),
    standalonePwa: isStandalonePwa(),
    androidBackgroundPushEnabled: isAndroidBackgroundPushEnabled()
  });
};

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
};

let cachedVapidPublicKey: string | null = null;
let vapidPublicKeyPromise: Promise<string> | null = null;
let pushSubscriptionPromise: Promise<PushSubscription> | null = null;

export const getVapidPublicKey = async (): Promise<string> => {
  if (cachedVapidPublicKey) return cachedVapidPublicKey;
  if (vapidPublicKeyPromise) return vapidPublicKeyPromise;

  vapidPublicKeyPromise = (async () => {
    const origin = getPushApiOrigin();
    const data = await fetchJson<{ vapidPublicKey: unknown }>(`${origin}/v1/push/vapidPublicKey`);
    if (typeof data.vapidPublicKey !== 'string' || !data.vapidPublicKey.trim()) {
      throw new Error('Invalid VAPID key');
    }

    cachedVapidPublicKey = data.vapidPublicKey;
    return data.vapidPublicKey;
  })();

  try {
    return await vapidPublicKeyPromise;
  } finally {
    vapidPublicKeyPromise = null;
  }
};

const getExistingPushSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

export const ensurePushSubscription = async (): Promise<PushSubscription> => {
  const existing = await getExistingPushSubscription();
  if (existing) return existing;

  if (pushSubscriptionPromise) return pushSubscriptionPromise;

  pushSubscriptionPromise = (async () => {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) return existingSubscription;

    const vapidPublicKey = await getVapidPublicKey();
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey)
    });
  })();

  try {
    return await pushSubscriptionPromise;
  } finally {
    pushSubscriptionPromise = null;
  }
};

export const registerSubscriptionInApi = async (deviceId: string, subscription: PushSubscription): Promise<void> => {
  const origin = getPushApiOrigin();
  const token = await getIdToken();

  await fetchJson<{ ok: boolean }>(`${origin}/v1/push/subscribe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      deviceId,
      subscription: subscription.toJSON()
    })
  });
};

export const ensureBackgroundRestPushReady = async (): Promise<{ deviceId: string } | null> => {
  if (!shouldUseBackgroundRestPush()) {
    return null;
  }

  if (isIosDevice() && !isStandalonePwa()) {
    if (typeof globalThis.alert === 'function') {
      globalThis.alert('Para notificaciones con pantalla bloqueada en iPhone, instala la app: Compartir → Añadir a pantalla de inicio.');
    }
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  const deviceId = getOrCreateDeviceId();
  const subscription = await ensurePushSubscription();
  await registerSubscriptionInApi(deviceId, subscription);
  logPushEvent('background_push_ready', {
    deviceId,
    platform: isIosDevice() ? 'ios' : isAndroidDevice() ? 'android' : 'other'
  });
  return { deviceId };
};

export const ensureIosBackgroundPushReady = async (): Promise<{ deviceId: string } | null> => {
  if (!isIosPushCapable()) return null;
  return ensureBackgroundRestPushReady();
};

export const scheduleRestPush = async (
  seconds: number,
  overrides?: { title?: string; body?: string; url?: string },
  options?: { commandAtMs?: number }
): Promise<void> => {
  if (!shouldUseBackgroundRestPush()) return;
  if (Notification.permission !== 'granted') return;

  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const deviceId = getOrCreateDeviceId();

  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return;
  }

  const commandAtMs = options?.commandAtMs ?? Date.now();
  const notificationTag = isIosDevice() ? 'rest-timer' : `rest-timer:${commandAtMs}`;

  await fetchJson<{ ok: boolean }>(`${origin}/v1/rest/schedule`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      deviceId,
      seconds,
      commandAtMs,
      title: overrides?.title,
      body: overrides?.body,
      url: overrides?.url,
      tag: notificationTag
    })
  });

  logPushEvent('rest_schedule_sent', { deviceId, seconds, commandAtMs, notificationTag });
};

export const cancelRestPush = async (options?: { commandAtMs?: number }): Promise<void> => {
  if (!shouldUseBackgroundRestPush()) return;

  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const deviceId = getOrCreateDeviceId();

  const commandAtMs = options?.commandAtMs ?? Date.now();

  await fetchJson<{ ok: boolean }>(`${origin}/v1/rest/cancel`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      deviceId,
      commandAtMs
    })
  });

  logPushEvent('rest_cancel_sent', { deviceId, commandAtMs });
};
