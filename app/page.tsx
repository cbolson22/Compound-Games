import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="font-serif text-5xl mb-2">Compound Games</h1>
      <p className="text-xs uppercase tracking-widest text-[#ccc] mb-12">Daily Puzzles</p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link
          href="/numeris"
          className="flex flex-col gap-1 p-6 border border-[#f0f0f0] rounded-2xl hover:border-[#ddd] transition-colors"
        >
          <span className="font-serif text-2xl">Numeris</span>
          <span className="text-sm text-[#aaa]">Daily Number Puzzle</span>
        </Link>
      </div>
    </main>
  )
}
