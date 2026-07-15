import { useMemo, useState } from 'react';
import type { TicketWithRelations, User } from '../lib/types';
import { Card, EmptyState, EstadoBadge, PrioridadBadge, SlaBar, StatCard } from '../components/ui';
import { timeAgo } from '../lib/ui';
import { Inbox, CheckCircle2, AlertCircle, Search, History } from 'lucide-react';

export function TecnicoBandeja({
  tickets, user, onOpenTicket,
}: {
  tickets: TicketWithRelations[];
  user: User;
  onOpenTicket: (t: TicketWithRelations) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'asignados' | 'abiertos' | 'todos'>('asignados');

  const myTickets = useMemo(
    () => tickets.filter((t) => t.tecnico_id === user.id),
    [tickets, user.id],
  );
  const unassigned = useMemo(
    () => tickets.filter((t) => !t.tecnico_id && !['cerrado', 'cancelado', 'resuelto'].includes(t.estado)),
    [tickets],
  );

  const filtered = useMemo(() => {
    let r = tickets;
    if (filter === 'asignados') r = myTickets;
    else if (filter === 'abiertos') r = unassigned;
    if (search) r = r.filter((t) =>
      t.asunto.toLowerCase().includes(search.toLowerCase()) ||
      t.codigo.toLowerCase().includes(search.toLowerCase()),
    );
    return r.filter((t) => !['cerrado', 'cancelado'].includes(t.estado));
  }, [tickets, myTickets, unassigned, filter, search]);

  const activos = myTickets.filter((t) => !['cerrado', 'cancelado', 'resuelto'].includes(t.estado)).length;
  const resueltos = myTickets.filter((t) => ['resuelto', 'cerrado'].includes(t.estado)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Bandeja de tickets</h1>
        <p className="mt-1 text-sm text-slate-500">Tickets asignados a ti y pendientes de asignación.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Mis activos" value={activos} icon={<Inbox size={18} />} accent="sky" />
        <StatCard label="Sin asignar" value={unassigned.length} icon={<AlertCircle size={18} />} accent="amber" />
        <StatCard label="Resueltos" value={resueltos} icon={<CheckCircle2 size={18} />} accent="emerald" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ticket..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(['asignados', 'abiertos', 'todos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f === 'asignados' ? 'Mis asignados' : f === 'abiertos' ? 'Sin asignar' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title="Sin tickets" desc="No hay tickets en esta vista." />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTicket(t)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-400">{t.codigo}</span>
                    <EstadoBadge estado={t.estado} />
                    <PrioridadBadge prioridad={t.prioridad} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{t.asunto}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t.solicitante?.nombre ?? '—'} · {timeAgo(t.created_at)}
                  </p>
                </div>
                <div className="hidden w-40 sm:block">
                  <SlaBar deadline={t.sla_deadline} createdAt={t.created_at} paused={t.sla_paused} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function TecnicoHistorial({
  tickets, user, onOpenTicket,
}: {
  tickets: TicketWithRelations[];
  user: User;
  onOpenTicket: (t: TicketWithRelations) => void;
}) {
  const closed = useMemo(
    () => tickets
      .filter((t) => t.tecnico_id === user.id && ['resuelto', 'cerrado', 'cancelado'].includes(t.estado))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [tickets, user.id],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Historial</h1>
        <p className="mt-1 text-sm text-slate-500">Tickets cerrados y resueltos.</p>
      </div>
      <Card className="overflow-hidden">
        {closed.length === 0 ? (
          <EmptyState icon={<History size={22} />} title="Sin historial" desc="No tienes tickets cerrados aún." />
        ) : (
          <div className="divide-y divide-slate-100">
            {closed.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpenTicket(t)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-400">{t.codigo}</span>
                    <EstadoBadge estado={t.estado} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{t.asunto}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t.solicitante?.nombre ?? '—'} · cerrado {timeAgo(t.closed_at ?? t.updated_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
