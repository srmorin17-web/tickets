import type { ReactNode } from 'react';
import type { Estado, Prioridad } from '../lib/types';
import { ESTADO_COLOR, ESTADO_LABEL, PRIORIDAD_COLOR, PRIORIDAD_DOT, PRIORIDAD_LABEL } from '../lib/ui';

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <Badge className={ESTADO_COLOR[estado]}>{ESTADO_LABEL[estado]}</Badge>;
}

export function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  return (
    <Badge className={PRIORIDAD_COLOR[prioridad]}>
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORIDAD_DOT[prioridad]}`} />
      {PRIORIDAD_LABEL[prioridad]}
    </Badge>
  );
}

export function Avatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-7 w-7 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm';
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 font-semibold text-white`}>
      {initials}
    </div>
  );
}

export function Button({
  children, variant = 'primary', size = 'md', className = '', ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</div>;
}

export function StatCard({
  label, value, icon, accent = 'slate', sub,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';
  sub?: string;
}) {
  const accents = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${accents[accent]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-slate-900' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </label>
  );
}

export function EmptyState({ icon, title, desc }: { icon: ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {desc && <p className="mt-1 text-xs text-slate-400">{desc}</p>}
    </div>
  );
}

export function SlaBar({ deadline, createdAt, paused }: { deadline: string | null; createdAt: string; paused: boolean }) {
  const { pct, remaining, status } = slaBarCalc(deadline, createdAt, paused);
  const colors = {
    ok: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
    expired: 'bg-slate-400',
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">SLA</span>
        <span className={`font-medium ${status === 'expired' ? 'text-rose-600' : status === 'critical' ? 'text-rose-600' : 'text-slate-600'}`}>
          {paused ? 'Pausado' : remaining}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${colors[status]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function slaBarCalc(deadline: string | null, createdAt: string, paused: boolean) {
  if (!deadline) return { pct: 0, remaining: '—', status: 'ok' as const };
  const now = Date.now();
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const total = end - start;
  const elapsed = paused ? 0 : now - start;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const remainingMs = end - now;
  if (remainingMs < 0) return { pct: 100, remaining: 'Vencido', status: 'expired' as const };
  const h = Math.floor(remainingMs / 3600_000);
  const m = Math.floor((remainingMs % 3600_000) / 60000);
  const remaining = h > 0 ? `${h}h ${m}m` : `${m}m`;
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (pct > 90) status = 'critical';
  else if (pct > 70) status = 'warning';
  return { pct, remaining, status };
}
