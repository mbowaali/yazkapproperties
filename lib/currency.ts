export function fmt(n: number, cur = "AED") {
  return `${cur} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}