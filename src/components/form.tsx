import type React from "react";
import { Card, CardContent } from "./ui/card";

export const labelClass = "block text-sm font-medium mb-1 text-[#0B0134]";
export const inputClass = "w-full border border-slate-700 bg-slate-900 rounded-lg px-3 py-2 text-slate-100";

export function Section({ title, description, children, className = "" }: {
  title: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={`shadow-sm border-slate-800 ${className}`}>
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-[#0B0134]">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        <div className="mt-4 space-y-4">{children}</div>
      </CardContent>
    </Card>
  );
}

export function TextField({ id, label, value, onChange, placeholder, list, type = "text", className = "" }: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; list?: string; type?: string; className?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} type={type} list={list} placeholder={placeholder}
        className={`${type === "date" ? "dark-date " : ""}${inputClass} ${className}`}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function NumberField({ id, label, value, onChange, min = 0, max, step = 1, suffix }: {
  id: string; label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <input id={id} type="number" min={min} max={max} step={step} placeholder="0"
          className={`${inputClass} ${suffix ? "pr-10" : ""}`}
          value={value || ""} onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0, min, max))} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

export function MoneyField({ id, label, value, onChange }: {
  id: string; label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
        <input id={id} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0.00"
          className={`${inputClass} pl-7`}
          value={value || ""} onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))} />
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max?: number) {
  return Math.max(min, max != null ? Math.min(max, n) : n);
}
