export const APP_LOCALE = 'es-CO';

export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = APP_LOCALE
): string => {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat(APP_LOCALE, options).format(value);
  }
};

export const formatDateValue = (
  value: Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = APP_LOCALE
): string => {
  try {
    return new Intl.DateTimeFormat(locale, options).format(value);
  } catch {
    return value.toLocaleDateString(locale, options);
  }
};

export const formatCountLabel = (
  count: number,
  singular: string,
  plural: string,
  locale: string = APP_LOCALE
): string => {
  try {
    const pluralRule = new Intl.PluralRules(locale).select(count);
    return `${formatNumber(count, { maximumFractionDigits: 0 }, locale)} ${pluralRule === 'one' ? singular : plural}`;
  } catch {
    return `${count} ${count === 1 ? singular : plural}`;
  }
};
