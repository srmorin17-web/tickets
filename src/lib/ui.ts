import type { Estado, Prioridad } from './types';

export const ESTADO_LABEL: Record<Estado, string> = {
  recibido: 'Recibido',
  revision: 'En revisión',
  confirmado: 'Confirmado',
  info: 'Info solicitada',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

export const ESTADO_COLOR: Record<Estado, string> = {
  recibido: 'bg-slate-100 text-slate-700 ring-slate-200',
  revision: 'bg-sky-50 text-sky-700 ring-sky-200',
  confirmado: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  info: 'bg-amber-50 text-amber-700 ring-amber-200',
  resuelto: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cerrado: 'bg-slate-100 text-slate-500 ring-slate-200',
  cancelado: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  critica: 'bg-rose-50 text-rose-700 ring-rose-200',
  alta: 'bg-orange-50 text-orange-700 ring-orange-200',
  media: 'bg-amber-50 text-amber-700 ring-amber-200',
  baja: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};

export const PRIORIDAD_DOT: Record<Prioridad, string> = {
  critica: 'bg-rose-500',
  alta: 'bg-orange-500',
  media: 'bg-amber-500',
  baja: 'bg-cyan-500',
};

export const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  tecnico: 'Técnico',
  supervisor: 'Supervisor',
  solicitante: 'Solicitante',
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hace instantes';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  const mo = Math.floor(d / 30);
  return `hace ${mo} mes${mo > 1 ? 'es' : ''}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function slaProgress(deadline: string | null, createdAt: string, paused: boolean): {
  pct: number; remaining: string; status: 'ok' | 'warning' | 'critical' | 'expired';
} {
  if (!deadline) return { pct: 0, remaining: '—', status: 'ok' };
  const now = Date.now();
  const start = new Date(createdAt).getTime();
  const end = new Date(deadline).getTime();
  const total = end - start;
  const elapsed = paused ? 0 : now - start;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const remainingMs = end - now;
  if (remainingMs < 0) return { pct: 100, remaining: 'Vencido', status: 'expired' };
  const h = Math.floor(remainingMs / 3600_000);
  const m = Math.floor((remainingMs % 3600_000) / 60000);
  const remaining = h > 0 ? `${h}h ${m}m` : `${m}m`;
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  if (pct > 90) status = 'critical';
  else if (pct > 70) status = 'warning';
  return { pct, remaining, status };
}
