export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="border-b border-slate-100 pb-6">
      {eyebrow ? <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{eyebrow}</div> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-slate-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
