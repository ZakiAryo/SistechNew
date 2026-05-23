export default function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 page-stagger-1">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="page-stagger-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="page-stagger-3 mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
