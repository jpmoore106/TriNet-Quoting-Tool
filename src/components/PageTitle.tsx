// Brand heading style: a short orange line above a navy title (brand playbook section headers).
export default function PageTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-3xl font-bold leading-tight text-navy">
        {eyebrow && <span className="block text-orange">{eyebrow}</span>}
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-base text-tngray-dark">{subtitle}</p>}
    </div>
  );
}
