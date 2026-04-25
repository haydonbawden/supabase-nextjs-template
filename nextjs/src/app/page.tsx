import Link from 'next/link'
import AuthAwareButtons from '@/components/AuthAwareButtons'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <p className="text-sm font-medium text-primary">HospoShift WA</p>
        <h1 className="mt-2 text-4xl font-bold">Western Australia casual hospitality staffing marketplace</h1>
        <p className="mx-auto mt-4 max-w-3xl text-slate-600">
          HospoShift WA helps Western Australian hospitality venues find casual staff for short-notice shifts.
        </p>
        <p className="mx-auto mt-2 max-w-3xl text-sm text-slate-500">
          Staff involved in the sale, supply or service of liquor in Western Australia generally need RSA training. Venues should verify suitability before confirming shifts. This platform does not provide legal advice.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <AuthAwareButtons />
          <Link href="/app" className="rounded border px-4 py-2">Open dashboard</Link>
        </div>
      </section>
    </div>
  )
}
