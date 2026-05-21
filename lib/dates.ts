export function getTodaysCT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())
}

export function getTomorrowCT(): string {
  const [y, m, d] = getTodaysCT().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().split('T')[0]
}

export function getYesterdayCT(): string {
  const today = getTodaysCT()
  const dt = new Date(today + 'T12:00:00')
  dt.setDate(dt.getDate() - 1)
  return dt.toISOString().split('T')[0]
}
