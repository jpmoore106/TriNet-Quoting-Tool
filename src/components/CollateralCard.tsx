import { Download } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import type { Collateral } from "../data/collateral";

export default function CollateralCard({ collateral: c }: { collateral: Collateral }) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-wider text-orange-dark">TriNet collateral</p>
        <h3 className="text-xl font-bold text-navy">{c.title}</h3>
        <p className="mt-1 text-sm text-tngray-dark">{c.intro}</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {c.highlights.map((h) => (
            <div key={h.heading}>
              <h4 className="flex items-center gap-2 text-sm font-bold text-navy"><span className="h-2.5 w-2.5 bg-orange" aria-hidden />{h.heading}</h4>
              <ul className="mt-1 space-y-1 text-sm text-tngray-dark list-disc pl-5">
                {h.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2" data-testid="collateral-downloads">
          {c.downloads.map((d) => (
            <a key={d.href} href={d.href} download
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-navy px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy/5">
              <Download className="h-4 w-4" aria-hidden /> {d.label} (PDF)
            </a>
          ))}
        </div>
        {c.disclosure && <p className="mt-4 text-xs text-tngray-dark">{c.disclosure}</p>}
      </CardContent>
    </Card>
  );
}
