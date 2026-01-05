import { auth } from '../firebase/config';

const DEVICE_ID_KEY = 'pushDeviceId';

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

export const shouldUseBackgroundRestPush = (): boolean => {
  return isIosPushCapable() && isStandalonePwa();
};

const getIdToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.getIdToken();
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

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    throw new Error('Invalid response type');
  }

  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return data;
};

export const getVapidPublicKey = async (): Promise<string> => {
  const origin = getPushApiOrigin();
  const data = await fetchJson<{ vapidPublicKey: unknown }>(`${origin}/v1/push/vapidPublicKey`);
  if (typeof data.vapidPublicKey !== 'string' || !data.vapidPublicKey.trim()) {
    throw new Error('Invalid VAPID key');
  }
  return data.vapidPublicKey;
};

const getExistingPushSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

export const ensurePushSubscription = async (): Promise<PushSubscription> => {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const vapidPublicKey = await getVapidPublicKey();
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey)
  });
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

export const ensureIosBackgroundPushReady = async (): Promise<{ deviceId: string } | null> => {
  if (!isIosPushCapable()) return null;

  if (!isStandalonePwa()) {
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
  return { deviceId };
};

export const scheduleRestPush = async (seconds: number, overrides?: { title?: string; body?: string; url?: string }): Promise<void> => {
  if (!shouldUseBackgroundRestPush()) return;
  if (Notification.permission !== 'granted') return;

  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const deviceId = getOrCreateDeviceId();

  const subscription = await getExistingPushSubscription();
  if (!subscription) {
    return;
  }

  await fetchJson<{ ok: boolean }>(`${origin}/v1/rest/schedule`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      deviceId,
      seconds,
      title: overrides?.title,
      body: overrides?.body,
      url: overrides?.url
    })
  });
};

export const cancelRestPush = async (): Promise<void> => {
  if (!shouldUseBackgroundRestPush()) return;

  const origin = getPushApiOrigin();
  const token = await getIdToken();
  const deviceId = getOrCreateDeviceId();

  await fetchJson<{ ok: boolean }>(`${origin}/v1/rest/cancel`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ deviceId })
  });
};
