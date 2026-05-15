export function getTodaysCT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())
}

export function getTomorrowCT(): string {
  const [y, m, d] = getTodaysCT().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0]
}
