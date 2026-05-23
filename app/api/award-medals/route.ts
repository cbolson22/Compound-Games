import { NextResponse } from 'next/server'
import { getYesterdayCT } from '@/lib/dates'
import { awardMedalsForDate } from '@/lib/medals'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = getYesterdayCT()
  await awardMedalsForDate(date)
  return NextResponse.json({ awarded: date })
}
