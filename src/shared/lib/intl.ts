export const APP_LOCALE = 'es-CO';

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const pluralRules = new Map<string, Intl.PluralRules>();

const getOptionsKey = (options?: object): string => JSON.stringify(
  options
    ? Object.entries(options).sort(([first], [second]) => first.localeCompare(second))
    : []
);

const getNumberFormatter = (locale: string, options?: Intl.NumberFormatOptions) => {
  const key = `${locale}:${getOptionsKey(options)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
};

const getDateTimeFormatter = (locale: string, options?: Intl.DateTimeFormatOptions) => {
  const key = `${locale}:${getOptionsKey(options)}`;
  let formatter = dateTimeFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateTimeFormatters.set(key, formatter);
  }
  return formatter;
};

const getPluralRules = (locale: string) => {
  let formatter = pluralRules.get(locale);
  if (!formatter) {
    formatter = new Intl.PluralRules(locale);
    pluralRules.set(locale, formatter);
  }
  return formatter;
};

export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = APP_LOCALE
): string => {
  try {
    return getNumberFormatter(locale, options).format(value);
  } catch {
    return getNumberFormatter(APP_LOCALE, options).format(value);
  }
};

export const formatDateValue = (
  value: Date,
  options?: Intl.DateTimeFormatOptions,
  locale: string = APP_LOCALE
): string => {
  try {
    return getDateTimeFormatter(locale, options).format(value);
  } catch {
    return getDateTimeFormatter(APP_LOCALE, options).format(value);
  }
};

export const formatCountLabel = (
  count: number,
  singular: string,
  plural: string,
  locale: string = APP_LOCALE
): string => {
  try {
    const pluralRule = getPluralRules(locale).select(count);
    return `${formatNumber(count, { maximumFractionDigits: 0 }, locale)} ${pluralRule === 'one' ? singular : plural}`;
  } catch {
    return `${count} ${count === 1 ? singular : plural}`;
  }
};
