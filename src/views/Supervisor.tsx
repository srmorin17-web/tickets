import { useMemo, useState } from 'react';
import type { Area, TicketWithRelations, User } from '../lib/types';
import { Avatar, Button, Card, EmptyState, EstadoBadge, PrioridadBadge, SlaBar, StatCard } from '../components/ui';
import { Modal } from '../components/Overlay';
import { assignTicket } from '../lib/data';
import { timeAgo } from '../lib/ui';
import { Inbox, AlertCircle, Clock, Search, Users, CheckCircle2, FileBarChart, TrendingUp } from 'lucide-react';

export function SupervisorDashboard({
  tickets, users, areas, user, onOpenTicket, onRefresh,
}: {
  tickets: TicketWithRelations[];
  users: User[];
  areas: Area[];
  user: User;
  onOpenTicket: (t: TicketWithRelations) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState('');
  const [reassignTicket, setReassignTicket] = useState<TicketWithRelations | null>(null);

  const unassigned = useMemo(
    () => tickets.filter((t) => !t.tecnico_id && !['cerrado', 'cancelado', 'resuelto'].includes(t.estado)),
    [tickets],
  );
  const activos = tickets.filter((t) => !['cerrado', 'cancelado', 'resuelto'].includes(t.estado));
  const vencidos = activos.filter((t) => {
    if (!t.sla_deadline) return false;
    return new Date(t.sla_deadline).getTime() < Date.now();
  });
  const resueltos = tickets.filter((t) => ['resuelto', 'cerrado'].includes(t.estado));

  const filtered = useMemo(() => {
    let r = activos;
    if (search) r = r.filter((t) =>
      t.asunto.toLowerCase().includes(search.toLowerCase()) ||
      t.codigo.toLowerCase().includes(search.toLowerCase()),
    );
    return r.sort((a, b) => {
      const order = { critica: 0, alta: 1, media: 2, baja: 3 };
      return order[a.prioridad] - order[b.prioridad];
    });
  }, [activos, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard de supervisión</h1>
        <p className="mt-1 text-sm text-slate-500">Visión general de todos los tickets activos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Activos" value={activos.length} icon={<Inbox size={18} />} accent="blue" />
        <StatCard label="Sin asignar" value={unassigned.length} icon={<AlertCircle size={18} />} accent="amber" />
        <StatCard label="SLA vencido" value={vencidos.length} icon={<Clock size={18} />} accent="rose" />
        <StatCard label="Resueltos" value={resueltos.length} icon={<CheckCircle2 size={18} />} accent="emerald" />
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ticket..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title="Sin tickets activos" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                <button onClick={() => onOpenTicket(t)} className="flex flex-1 items-center gap-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-400">{t.codigo}</span>
                      <EstadoBadge estado={t.estado} />
                      <PrioridadBadge prioridad={t.prioridad} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">{t.asunto}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t.tecnico ? t.tecnico.nombre : 'Sin asignar'} · {t.solicitante?.nombre ?? '—'} · {timeAgo(t.created_at)}
                    </p>
                  </div>
                  <div className="hidden w-40 sm:block">
                    <SlaBar deadline={t.sla_deadline} createdAt={t.created_at} paused={t.sla_paused} />
                  </div>
                </button>
                {!t.tecnico_id && (
                  <Button size="sm" variant="primary" onClick={() => setReassignTicket(t)}>
                    <Users size={14} /> Asignar
                  </Button>
                )}
                {t.tecnico_id && (
                  <Button size="sm" variant="outline" onClick={() => setReassignTicket(t)}>
                    <Users size={14} /> Reasignar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ReassignModal
        ticket={reassignTicket}
        users={users}
        areas={areas}
        actorId={user.id}
        actorNombre={user.nombre}
        onClose={() => setReassignTicket(null)}
        onAssigned={() => { setReassignTicket(null); onRefresh(); }}
      />
    </div>
  );
}

function ReassignModal({
  ticket, users, areas, actorId, actorNombre, onClose, onAssigned,
}: {
  ticket: TicketWithRelations | null;
  users: User[];
  areas: Area[];
  actorId: string;
  actorNombre: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const tecnicos = users.filter((u) => u.rol === 'tecnico' && u.estado === 'activo');
  const [tecnicoId, setTecnicoId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset when ticket changes
  useMemo(() => {
    setTecnicoId(ticket?.tecnico_id ?? '');
    setAreaId(ticket?.area_id ?? '');
  }, [ticket?.id]);

  if (!ticket) return null;

  async function assign() {
    if (!ticket || !tecnicoId) return;
    setLoading(true);
    try {
      await assignTicket(ticket.id, tecnicoId, areaId || null, actorId, actorNombre);
      onAssigned();
    } finally { setLoading(false); }
  }

  return (
    <Modal
      open={!!ticket}
      onClose={onClose}
      title={`Asignar ${ticket.codigo}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={assign} disabled={loading || !tecnicoId}>
            <Users size={15} /> {loading ? 'Asignando...' : 'Asignar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-900">{ticket.asunto}</p>
          <p className="mt-0.5 text-xs text-slate-500">{ticket.codigo} · {ticket.solicitante?.nombre}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Técnico</label>
          <div className="space-y-1.5">
            {tecnicos.map((t) => (
              <button
                key={t.id}
                onClick={() => setTecnicoId(t.id)}
                className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  tecnicoId === t.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Avatar initials={t.avatar_initials} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{t.nombre}</p>
                  <p className="text-xs text-slate-400">{t.cargo}</p>
                </div>
                {tecnicoId === t.id && <CheckCircle2 size={18} className="text-slate-900" />}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Área (opcional)</label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          >
            <option value="">Sin área</option>
            {areas.filter((a) => a.activo).map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

export function SupervisorReasignar({
  tickets, users, areas, user, onOpenTicket, onRefresh,
}: {
  tickets: TicketWithRelations[];
  users: User[];
  areas: Area[];
  user: User;
  onOpenTicket: (t: TicketWithRelations) => void;
  onRefresh: () => void;
}) {
  const [reassignTicket, setReassignTicket] = useState<TicketWithRelations | null>(null);
  const unassigned = tickets.filter((t) => !t.tecnico_id && !['cerrado', 'cancelado', 'resuelto'].includes(t.estado));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reasignar tickets</h1>
        <p className="mt-1 text-sm text-slate-500">Tickets pendientes de asignación a un técnico.</p>
      </div>
      <Card className="overflow-hidden">
        {unassigned.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={22} />} title="Todo asignado" desc="No hay tickets sin técnico." />
        ) : (
          <div className="divide-y divide-slate-100">
            {unassigned.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                <button onClick={() => onOpenTicket(t)} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-400">{t.codigo}</span>
                    <PrioridadBadge prioridad={t.prioridad} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">{t.asunto}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{t.solicitante?.nombre} · {timeAgo(t.created_at)}</p>
                </button>
                <Button size="sm" onClick={() => setReassignTicket(t)}>
                  <Users size={14} /> Asignar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <ReassignModal
        ticket={reassignTicket}
        users={users}
        areas={areas}
        actorId={user.id}
        actorNombre={user.nombre}
        onClose={() => setReassignTicket(null)}
        onAssigned={() => { setReassignTicket(null); onRefresh(); }}
      />
    </div>
  );
}

export function SupervisorReportes({
  tickets, users,
}: {
  tickets: TicketWithRelations[];
  users: User[];
}) {
  const byTecnico = useMemo(() => {
    const map = new Map<string, { user: User; activos: number; resueltos: number; total: number }>();
    users.filter((u) => u.rol === 'tecnico').forEach((u) => {
      map.set(u.id, { user: u, activos: 0, resueltos: 0, total: 0 });
    });
    tickets.forEach((t) => {
      if (!t.tecnico_id) return;
      const e = map.get(t.tecnico_id);
      if (!e) return;
      e.total++;
      if (['resuelto', 'cerrado'].includes(t.estado)) e.resueltos++;
      else if (!['cancelado'].includes(t.estado)) e.activos++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tickets, users]);

  const byCategoria = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      const name = t.categoria?.nombre ?? 'Sin categoría';
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  const byEstado = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => map.set(t.estado, (map.get(t.estado) ?? 0) + 1));
    return map;
  }, [tickets]);

  const maxCat = Math.max(1, ...byCategoria.map(([, n]) => n));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reportes</h1>
        <p className="mt-1 text-sm text-slate-500">Métricas de rendimiento del equipo.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Por técnico</h2>
          </div>
          <div className="space-y-3">
            {byTecnico.map((e) => (
              <div key={e.user.id} className="flex items-center gap-3">
                <Avatar initials={e.user.avatar_initials} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{e.user.nombre}</p>
                    <p className="text-xs text-slate-400">{e.total} tickets</p>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <div className="flex-1 rounded-full bg-blue-100 text-center text-xs font-medium text-blue-700 py-0.5">
                      {e.activos} activos
                    </div>
                    <div className="flex-1 rounded-full bg-emerald-100 text-center text-xs font-medium text-emerald-700 py-0.5">
                      {e.resueltos} resueltos
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileBarChart size={18} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Por categoría</h2>
          </div>
          <div className="space-y-3">
            {byCategoria.map(([name, n]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{name}</span>
                  <span className="font-medium text-slate-900">{n}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-700" style={{ width: `${(n / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Distribución por estado</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {(['recibido', 'revision', 'confirmado', 'info', 'resuelto', 'cerrado', 'cancelado'] as const).map((est) => (
            <div key={est} className="rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-2xl font-semibold text-slate-900">{byEstado.get(est) ?? 0}</p>
              <p className="mt-0.5 text-xs capitalize text-slate-500">{est}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
