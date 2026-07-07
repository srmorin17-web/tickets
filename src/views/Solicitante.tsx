import { useMemo, useState } from 'react';
import type { Category, Prioridad, SlaConfig, TicketWithRelations, User } from '../lib/types';
import { Button, Card, EmptyState, EstadoBadge, PrioridadBadge, SlaBar, StatCard } from '../components/ui';
import { createTicket } from '../lib/data';
import { timeAgo } from '../lib/ui';
import { Inbox, CheckCircle2, Clock, Search, Send, AlertCircle } from 'lucide-react';

export function SolicitanteDashboard({
  tickets, user, onOpenTicket,
}: {
  tickets: TicketWithRelations[];
  user: User;
  onOpenTicket: (t: TicketWithRelations) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'abiertos' | 'resueltos'>('todos');

  const myTickets = useMemo(
    () => tickets.filter((t) => t.solicitante_id === user.id),
    [tickets, user.id],
  );

  const filtered = useMemo(() => {
    let r = myTickets;
    if (filter === 'abiertos') r = r.filter((t) => !['cerrado', 'cancelado', 'resuelto'].includes(t.estado));
    if (filter === 'resueltos') r = r.filter((t) => ['resuelto', 'cerrado'].includes(t.estado));
    if (search) r = r.filter((t) =>
      t.asunto.toLowerCase().includes(search.toLowerCase()) ||
      t.codigo.toLowerCase().includes(search.toLowerCase()),
    );
    return r;
  }, [myTickets, filter, search]);

  const abiertos = myTickets.filter((t) => !['cerrado', 'cancelado', 'resuelto'].includes(t.estado)).length;
  const resueltos = myTickets.filter((t) => ['resuelto', 'cerrado'].includes(t.estado)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mis tickets</h1>
        <p className="mt-1 text-sm text-slate-500">Hola, {user.nombre.split(' ')[0]}. Aquí están tus solicitudes.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={myTickets.length} icon={<Inbox size={18} />} accent="slate" />
        <StatCard label="Abiertos" value={abiertos} icon={<Clock size={18} />} accent="amber" />
        <StatCard label="Resueltos" value={resueltos} icon={<CheckCircle2 size={18} />} accent="emerald" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código o asunto..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(['todos', 'abiertos', 'resueltos'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title="No hay tickets" desc="Crea tu primera solicitud." />
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
                    {t.tecnico ? `Asignado a ${t.tecnico.nombre}` : 'Sin asignar'} · {timeAgo(t.created_at)}
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

export function SolicitanteNuevo({
  user, categories, sla, onCreated,
}: {
  user: User;
  categories: Category[];
  sla: SlaConfig[];
  onCreated: () => void;
}) {
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [prioridad, setPrioridad] = useState<Prioridad>('media');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeCats = categories.filter((c) => c.activo);
  const slaMap = new Map(sla.map((s) => [s.prioridad, s]));
  const selectedSla = slaMap.get(prioridad);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!asunto.trim() || !descripcion.trim() || !categoriaId) {
      setError('Completa todos los campos.'); return;
    }
    setLoading(true);
    try {
      await createTicket({
        asunto: asunto.trim(),
        descripcion: descripcion.trim(),
        categoria_id: categoriaId,
        prioridad,
        solicitante_id: user.id,
        sla_horas: selectedSla?.horas_resolucion ?? 24,
      });
      setSuccess('Ticket creado correctamente.');
      setAsunto(''); setDescripcion(''); setCategoriaId(''); setPrioridad('media');
      onCreated();
    } catch (err: any) {
      setError(err.message ?? 'Error al crear ticket.');
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nuevo ticket</h1>
        <p className="mt-1 text-sm text-slate-500">Describe tu solicitud con el mayor detalle posible.</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Asunto</label>
            <input
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Resumen breve del problema o solicitud"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={5}
              placeholder="Describe el problema, pasos para reproducirlo, y cualquier contexto relevante."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Categoría</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="">Selecciona...</option>
                {activeCats.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as Prioridad)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="critica">Crítica</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          {selectedSla && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Clock size={15} />
              SLA estimado: respuesta en {selectedSla.horas_respuesta}h, resolución en {selectedSla.horas_resolucion}h.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              <Send size={15} /> {loading ? 'Enviando...' : 'Crear ticket'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
