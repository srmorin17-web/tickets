import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Area, Category, TicketWithRelations, User } from '../lib/types';
import { Avatar, Button, Card, EmptyState, EstadoBadge, PrioridadBadge, SlaBar, StatCard } from '../components/ui';
import { Modal } from '../components/Overlay';
import { assignTicket } from '../lib/data';
import { timeAgo } from '../lib/ui';
import { exportReporteExcel, exportReportePDF, type ReportSummary } from '../lib/export';
import {
  Inbox, AlertCircle, Clock, Search, Users, CheckCircle2, FileBarChart,
  TrendingUp, Download, FileSpreadsheet, Filter,
} from 'lucide-react';

const ESTADO_LABEL: Record<string, string> = {
  recibido: 'Recibido', revision: 'En revisión', confirmado: 'Confirmado',
  info: 'Info', resuelto: 'Resuelto', cerrado: 'Cerrado', cancelado: 'Cancelado',
};
const CHART_COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#0f766e', '#f59e0b', '#94a3b8'];

const DASH_PERIODOS: { value: string; label: string; days: number | null }[] = [
  { value: '7d', label: '7 días', days: 7 },
  { value: '30d', label: '30 días', days: 30 },
  { value: '90d', label: '90 días', days: 90 },
  { value: 'todo', label: 'Todo', days: null },
];

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
  const [periodo, setPeriodo] = useState('30d');
  const [reassignTicket, setReassignTicket] = useState<TicketWithRelations | null>(null);

  // Tickets dentro del período seleccionado (por fecha de creación) — para KPIs y gráficos
  const periodTickets = useMemo(() => {
    const cfg = DASH_PERIODOS.find((p) => p.value === periodo);
    if (!cfg?.days) return tickets;
    const cutoff = Date.now() - cfg.days * 86_400_000;
    return tickets.filter((t) => new Date(t.created_at).getTime() >= cutoff);
  }, [tickets, periodo]);

  const activos = tickets.filter((t) => !['cerrado', 'cancelado', 'resuelto'].includes(t.estado));
  const unassigned = useMemo(
    () => activos.filter((t) => !t.tecnico_id),
    [activos],
  );
  const vencidos = activos.filter((t) => {
    if (!t.sla_deadline) return false;
    return new Date(t.sla_deadline).getTime() < Date.now();
  });

  const periodResueltos = periodTickets.filter((t) => ['resuelto', 'cerrado'].includes(t.estado) && t.closed_at);
  const slaCumplidoPct = useMemo(() => {
    if (!periodResueltos.length) return 0;
    const dentro = periodResueltos.filter(
      (t) => t.sla_deadline && new Date(t.closed_at!).getTime() <= new Date(t.sla_deadline).getTime(),
    );
    return (dentro.length / periodResueltos.length) * 100;
  }, [periodResueltos]);
  const tiempoPromedioHoras = useMemo(() => {
    if (!periodResueltos.length) return 0;
    const total = periodResueltos.reduce(
      (acc, t) => acc + (new Date(t.closed_at!).getTime() - new Date(t.created_at).getTime()), 0,
    );
    return total / periodResueltos.length / 3_600_000;
  }, [periodResueltos]);

  // Gráfico: distribución por estado (dentro del período)
  const estadoChartData = useMemo(() => {
    const map = new Map<string, number>();
    periodTickets.forEach((t) => map.set(t.estado, (map.get(t.estado) ?? 0) + 1));
    return (['recibido', 'revision', 'confirmado', 'info', 'resuelto', 'cerrado', 'cancelado'] as const)
      .map((e) => ({ estado: ESTADO_LABEL[e], value: map.get(e) ?? 0 }));
  }, [periodTickets]);

  // Gráfico: distribución por categoría (dentro del período)
  const categoriaChartData = useMemo(() => {
    const map = new Map<string, number>();
    periodTickets.forEach((t) => {
      const name = t.categoria?.nombre ?? 'Sin categoría';
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [periodTickets]);

  // Gráfico: tendencia de tickets creados por día
  const tendenciaChartData = useMemo(() => {
    const cfg = DASH_PERIODOS.find((p) => p.value === periodo);
    const days = cfg?.days ?? 30;
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
      buckets.set(key, 0);
    }
    periodTickets.forEach((t) => {
      const key = new Date(t.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([fecha, tickets]) => ({ fecha, tickets }));
  }, [periodTickets, periodo]);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard de supervisión</h1>
          <p className="mt-1 text-sm text-slate-500">Visión general de todos los tickets.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter size={14} /> Período
          </div>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-500"
          >
            {DASH_PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Activos" value={activos.length} icon={<Inbox size={18} />} accent="sky" />
        <StatCard label="Sin asignar" value={unassigned.length} icon={<AlertCircle size={18} />} accent="amber" />
        <StatCard label="SLA vencido" value={vencidos.length} icon={<Clock size={18} />} accent="rose" />
        <StatCard label="Resueltos (período)" value={periodResueltos.length} icon={<CheckCircle2 size={18} />} accent="emerald" />
        <StatCard label="% SLA cumplido" value={`${slaCumplidoPct.toFixed(0)}%`} icon={<TrendingUp size={18} />} accent="cyan" />
        <StatCard label="Tiempo prom. (h)" value={tiempoPromedioHoras.toFixed(1)} icon={<Clock size={18} />} accent="slate" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Tendencia de tickets creados</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tendenciaChartData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94a3b8' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="tickets" stroke="#0284c7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Por categoría</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoriaChartData} dataKey="value" nameKey="name"
                innerRadius={45} outerRadius={75} paddingAngle={2}
              >
                {categoriaChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {categoriaChartData.slice(0, 6).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                {c.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Distribución por estado</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={estadoChartData} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {estadoChartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ticket..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
        tickets={tickets}
        actorId={user.id}
        actorNombre={user.nombre}
        onClose={() => setReassignTicket(null)}
        onAssigned={() => { setReassignTicket(null); onRefresh(); }}
      />
    </div>
  );
}

function ReassignModal({
  ticket, users, areas, tickets, actorId, actorNombre, onClose, onAssigned,
}: {
  ticket: TicketWithRelations | null;
  users: User[];
  areas: Area[];
  tickets: TicketWithRelations[];
  actorId: string;
  actorNombre: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const tecnicos = users.filter((u) => u.rol === 'tecnico' && u.estado === 'activo');
  const [tecnicoId, setTecnicoId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [loading, setLoading] = useState(false);

  // Carga actual (tickets activos) de cada técnico, para decidir con criterio antes de asignar (RF-27)
  const cargaPorTecnico = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      if (!t.tecnico_id) return;
      if (['cerrado', 'cancelado', 'resuelto'].includes(t.estado)) return;
      map.set(t.tecnico_id, (map.get(t.tecnico_id) ?? 0) + 1);
    });
    return map;
  }, [tickets]);

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
          <p className="mb-2 text-xs text-slate-400">La carga mostrada es la cantidad de tickets activos que ya tiene cada técnico.</p>
          <div className="space-y-1.5">
            {tecnicos.map((t) => {
              const carga = cargaPorTecnico.get(t.id) ?? 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setTecnicoId(t.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                    tecnicoId === t.id ? 'border-sky-600 bg-sky-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Avatar initials={t.avatar_initials} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{t.nombre}</p>
                    <p className="text-xs text-slate-400">{t.cargo}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    carga === 0 ? 'bg-emerald-100 text-emerald-700'
                      : carga <= 3 ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                  }`}>
                    {carga} activos
                  </span>
                  {tecnicoId === t.id && <CheckCircle2 size={18} className="text-slate-900" />}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Área (opcional)</label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
        tickets={tickets}
        actorId={user.id}
        actorNombre={user.nombre}
        onClose={() => setReassignTicket(null)}
        onAssigned={() => { setReassignTicket(null); onRefresh(); }}
      />
    </div>
  );
}

const PERIODOS: { value: string; label: string; days: number | null }[] = [
  { value: '7d', label: 'Últimos 7 días', days: 7 },
  { value: '30d', label: 'Últimos 30 días', days: 30 },
  { value: '90d', label: 'Últimos 90 días', days: 90 },
  { value: 'todo', label: 'Todo el histórico', days: null },
];

export function SupervisorReportes({
  tickets, users, categories,
}: {
  tickets: TicketWithRelations[];
  users: User[];
  categories: Category[];
}) {
  const [periodo, setPeriodo] = useState('todo');
  const [tecnicoId, setTecnicoId] = useState('todos');
  const [categoriaId, setCategoriaId] = useState('todas');

  const tecnicos = users.filter((u) => u.rol === 'tecnico');

  const filtered = useMemo(() => {
    const periodoCfg = PERIODOS.find((p) => p.value === periodo);
    const cutoff = periodoCfg?.days ? Date.now() - periodoCfg.days * 86_400_000 : null;
    return tickets.filter((t) => {
      if (cutoff && new Date(t.created_at).getTime() < cutoff) return false;
      if (tecnicoId !== 'todos' && t.tecnico_id !== tecnicoId) return false;
      if (categoriaId !== 'todas' && t.categoria_id !== categoriaId) return false;
      return true;
    });
  }, [tickets, periodo, tecnicoId, categoriaId]);

  const summary: ReportSummary = useMemo(() => {
    const total = filtered.length;
    const activos = filtered.filter((t) => !['resuelto', 'cerrado', 'cancelado'].includes(t.estado)).length;
    const cerrados = filtered.filter((t) => ['resuelto', 'cerrado'].includes(t.estado) && t.closed_at);
    const cancelados = filtered.filter((t) => t.estado === 'cancelado').length;
    const dentroSla = cerrados.filter((t) => {
      if (!t.sla_deadline || !t.closed_at) return false;
      return new Date(t.closed_at).getTime() <= new Date(t.sla_deadline).getTime();
    });
    const slaCumplidoPct = cerrados.length ? (dentroSla.length / cerrados.length) * 100 : 0;
    const horasProm = cerrados.length
      ? cerrados.reduce((acc, t) => acc + (new Date(t.closed_at!).getTime() - new Date(t.created_at).getTime()), 0)
        / cerrados.length / 3_600_000
      : 0;
    return {
      total, activos, resueltos: cerrados.length, cancelados,
      slaCumplidoPct, tiempoPromedioHoras: horasProm,
    };
  }, [filtered]);

  const byTecnico = useMemo(() => {
    const map = new Map<string, { user: User; activos: number; resueltos: number; total: number }>();
    tecnicos.forEach((u) => map.set(u.id, { user: u, activos: 0, resueltos: 0, total: 0 }));
    filtered.forEach((t) => {
      if (!t.tecnico_id) return;
      const e = map.get(t.tecnico_id);
      if (!e) return;
      e.total++;
      if (['resuelto', 'cerrado'].includes(t.estado)) e.resueltos++;
      else if (t.estado !== 'cancelado') e.activos++;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered, tecnicos]);

  const byCategoria = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      const name = t.categoria?.nombre ?? 'Sin categoría';
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byEstado = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((t) => map.set(t.estado, (map.get(t.estado) ?? 0) + 1));
    return map;
  }, [filtered]);

  const maxCat = Math.max(1, ...byCategoria.map(([, n]) => n));

  function currentFilterLabels() {
    const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? 'Todo el histórico';
    const tecnicoLabel = tecnicoId === 'todos' ? 'Todos' : (tecnicos.find((u) => u.id === tecnicoId)?.nombre ?? 'Todos');
    const categoriaLabel = categoriaId === 'todas' ? 'Todas' : (categories.find((c) => c.id === categoriaId)?.nombre ?? 'Todas');
    return { periodoLabel, tecnicoLabel, categoriaLabel };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reportes</h1>
          <p className="mt-1 text-sm text-slate-500">Métricas de rendimiento del equipo.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportReportePDF(filtered, currentFilterLabels(), summary)}>
            <Download size={14} /> Exportar PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportReporteExcel(filtered, currentFilterLabels(), summary)}>
            <FileSpreadsheet size={14} /> Exportar Excel
          </Button>
        </div>
      </div>

      {/* Filtros combinables (RF-25/RF-28) */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Filter size={14} /> Filtros
          </div>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-500"
          >
            {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select
            value={tecnicoId}
            onChange={(e) => setTecnicoId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-500"
          >
            <option value="todos">Todos los técnicos</option>
            {tecnicos.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-500"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} tickets en el resultado</span>
        </div>
      </Card>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={summary.total} icon={<Inbox size={16} />} />
        <StatCard label="Activos" value={summary.activos} icon={<Clock size={16} />} />
        <StatCard label="Resueltos" value={summary.resueltos} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Cancelados" value={summary.cancelados} icon={<AlertCircle size={16} />} />
        <StatCard label="% SLA cumplido" value={`${summary.slaCumplidoPct.toFixed(0)}%`} icon={<TrendingUp size={16} />} />
        <StatCard label="Tiempo prom. (h)" value={summary.tiempoPromedioHoras.toFixed(1)} icon={<Clock size={16} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Por técnico</h2>
          </div>
          <div className="space-y-3">
            {byTecnico.length === 0 && <p className="text-sm text-slate-400">Sin datos para los filtros seleccionados.</p>}
            {byTecnico.map((e) => (
              <div key={e.user.id} className="flex items-center gap-3">
                <Avatar initials={e.user.avatar_initials} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">{e.user.nombre}</p>
                    <p className="text-xs text-slate-400">{e.total} tickets</p>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    <div className="flex-1 rounded-full bg-sky-100 text-center text-xs font-medium text-sky-700 py-0.5">
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
            {byCategoria.length === 0 && <p className="text-sm text-slate-400">Sin datos para los filtros seleccionados.</p>}
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
