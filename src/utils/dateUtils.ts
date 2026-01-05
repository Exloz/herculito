export const APP_TIME_ZONE = 'America/Bogota';

const FALLBACK_OFFSET_HOURS = -5;

const pad2 = (value: number) => String(value).padStart(2, '0');

const dateFromYMD = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

export const getDateStringInAppTimeZone = (date: Date): string => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Invalid date parts');
    }

    return `${year}-${month}-${day}`;
  } catch {
    const shifted = new Date(date.getTime() + FALLBACK_OFFSET_HOURS * 3600000);
    return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
  }
};

export const formatDateInAppTimeZone = (date: Date, locale: string = 'es-CO'): string => {
  try {
    return date.toLocaleDateString(locale, { timeZone: APP_TIME_ZONE });
  } catch {
    return date.toLocaleDateString(locale);
  }
};

export function getCurrentDateString(): string {
  return getDateStringInAppTimeZone(new Date());
}

export function formatDateString(dateString: string): string {
  const date = dateFromYMD(dateString);

  const formattedDate = date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIME_ZONE
  });

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

export function getCurrentDayOfWeek(): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: APP_TIME_ZONE
    }).format(new Date()).toLowerCase();
  } catch {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shifted = new Date(Date.now() + FALLBACK_OFFSET_HOURS * 3600000);
    return days[shifted.getUTCDay()];
  }
}

export function formatDateForDisplay(dateString: string): string {
  const today = getCurrentDateString();
  const yesterday = getDateStringInAppTimeZone(new Date(Date.now() - 86400000));

  if (dateString === today) return 'Hoy';
  if (dateString === yesterday) return 'Ayer';

  const date = dateFromYMD(dateString);

  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIME_ZONE
  });
}

export function getStartOfWeek(): string {
  const weekday = getCurrentDayOfWeek();
  const weekdayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekdayIndex = Math.max(0, weekdayOrder.indexOf(weekday));
  return addDays(getCurrentDateString(), -weekdayIndex);
}

export function isToday(dateString: string): boolean {
  return dateString === getCurrentDateString();
}

export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

export function addDays(dateString: string, days: number): string {
  const date = dateFromYMD(dateString);
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function getWeekDates(): string[] {
  const dates: string[] = [];
  const startOfWeek = getStartOfWeek();
  let currentDate = startOfWeek;

  for (let i = 0; i < 7; i++) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}
