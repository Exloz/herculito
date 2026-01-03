const TIMEZONE_OFFSET = -5;

function getLocalDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + TIMEZONE_OFFSET * 3600000);
}

export function getCurrentDateString(): string {
  const date = getLocalDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const formattedDate = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

export function getCurrentDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const date = getLocalDate();
  return days[date.getDay()];
}

export function formatDateForDisplay(dateString: string): string {
  const date = getLocalDate();
  const today = getCurrentDateString();
  const yesterday = new Date(date.getTime() - 86400000).toISOString().split('T')[0];

  if (dateString === today) return 'Hoy';
  if (dateString === yesterday) return 'Ayer';

  const [year, month, day] = dateString.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);

  return parsedDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short'
  });
}

export function getStartOfWeek(): string {
  const date = getLocalDate();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

export function isToday(dateString: string): boolean {
  return dateString === getCurrentDateString();
}

export function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

export function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const result = getLocalDate();
  result.setTime(date.getTime() + TIMEZONE_OFFSET * 3600000);
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
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
