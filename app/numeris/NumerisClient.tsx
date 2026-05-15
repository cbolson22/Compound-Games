'use client'

import dynamic from 'next/dynamic'

const NumerisBoard = dynamic(
  () => import('@/components/games/numeris/NumerisBoard'),
  { ssr: false }
)

export default function NumerisClient() {
  return <NumerisBoard />
}
