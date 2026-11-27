export function formatMoney(amount: number, currency = "PKR"): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(abs);
  const sign = amount < 0 ? "−" : amount > 0 ? "+" : "";
  return `${sign}${currency} ${formatted}`;
}

export function formatMoneyPlain(amount: number, currency = "PKR"): string {
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${currency} ${formatted}`;
}

/** Shows minus sign when balance is negative. */
export function formatBalance(amount: number, currency = "PKR"): string {
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  if (amount < -0.004) return `−${currency} ${formatted}`;
  return `${currency} ${formatted}`;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function advanceOf(balance: number): number {
  return balance > 0.004 ? roundMoney(balance) : 0;
}

export function remainingOf(balance: number): number {
  return balance < -0.004 ? roundMoney(Math.abs(balance)) : 0;
}
