export function getTodaysCT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())
}

export function getTomorrowCT(): string {
  const [y, m, d] = getTodaysCT().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0]
}

export function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export function getYesterdayCT(): string {
  return dayBefore(getTodaysCT())
}
