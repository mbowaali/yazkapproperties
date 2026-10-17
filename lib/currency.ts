// Supported currencies with their symbols and decimal places
export const SUPPORTED_CURRENCIES = [
  { code: "AED", name: "UAE Dirham", symbol: "AED", decimals: 0 },
  { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  { code: "UGX", name: "Ugandan Shilling", symbol: "UGX", decimals: 0 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", decimals: 2 },
];

export function getCurrencyInfo(code: string) {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export function fmt(n: number, cur = "AED") {
  const currency = getCurrencyInfo(cur);
  const num = Number(n ?? 0);
  
  // Use symbol for major currencies that use symbol prefixes
  if (["USD", "EUR", "GBP"].includes(cur)) {
    return `${currency.symbol}${num.toLocaleString(undefined, { 
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals 
    })}`;
  }
  
  // For currencies that use code prefix (AED, UGX)
  return `${currency.symbol} ${num.toLocaleString(undefined, { 
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals 
  })}`;
}

// Format with full locale support for international users
export function formatCurrency(n: number, cur = "AED", locale = "en-US") {
  const currency = getCurrencyInfo(cur);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(n);
}