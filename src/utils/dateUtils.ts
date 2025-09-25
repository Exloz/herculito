/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * Evita problemas de zona horaria al usar componentes de fecha locales
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha en formato YYYY-MM-DD para mostrar en español
 * Evita problemas de zona horaria al crear la fecha explícitamente
 */
export function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month es 0-indexado
  
  const formattedDate = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Capitalizar la primera letra
  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

/**
 * Obtiene el día de la semana en inglés para matching con workouts
 */
export function getCurrentDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}