export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
        TB
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Team Beauty</div>
        <div className="font-display text-lg text-slate-900">Brownsville</div>
      </div>
    </div>
  )
}
