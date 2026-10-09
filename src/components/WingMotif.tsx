// The TriNet wing motif: an orange L-shaped corner. Use at most one per layout (brand playbook p.128–148).
export default function WingMotif({ size = 64, thickness, className = "" }: {
  size?: number; thickness?: number; className?: string;
}) {
  const t = thickness ?? Math.round(size / 4);
  return (
    <span aria-hidden className={`pointer-events-none absolute block ${className}`} style={{ width: size, height: size }}>
      <span className="absolute right-0 top-0 bg-orange" style={{ width: size, height: t }} />
      <span className="absolute right-0 top-0 bg-orange" style={{ width: t, height: size }} />
    </span>
  );
}
