// FORMATTING UTILITIES FOR CURRENCY, DATES, AND PERCENTAGES
// Default Currency: IDR
// Default Timezone: Asia/Makassar

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  return new Intl.NumberFormat('id-ID').format(val);
}

export function formatPercent(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0%';
  return `${val.toFixed(1)}%`;
}

export function formatDateTime(
  dateString: string | Date,
  includeTime = true,
  timeZone = 'Asia/Makassar'
): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: includeTime ? '2-digit' : undefined,
      minute: includeTime ? '2-digit' : undefined,
    }).format(date);
  } catch (e) {
    return String(dateString);
  }
}

export function formatDateShort(
  dateString: string | Date,
  timeZone = 'Asia/Makassar'
): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone,
      day: '2-digit',
      month: 'short',
    }).format(date);
  } catch (e) {
    return String(dateString);
  }
}

export function formatCompactRupiah(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rp 0';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace('.0', '')} jt`;
  }
  if (abs >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return `Rp ${amount}`;
}
