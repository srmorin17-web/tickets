import { useEffect, useState } from 'react';
import type { TicketEvent, TicketWithRelations, User } from '../lib/types';
import { Drawer } from './Overlay';
import { Avatar, Button, EstadoBadge, PrioridadBadge, SlaBar } from './ui';
import { Timeline } from './Timeline';
import { formatDate, timeAgo } from '../lib/ui';
import { addComentario, changeTicketEstado, fetchEvents, toggleSlaPause } from '../lib/data';
import { Send, Clock, User as UserIcon, Tag, Building2, Pause, Play, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';

export function TicketDrawer({
  ticket, users, open, onClose, actorId, actorNombre, actorRol, onChanged,
}: {
  ticket: TicketWithRelations | null;
  users: User[];
  open: boolean;
  onClose: () => void;
  actorId: string;
  actorNombre: string;
  actorRol: string;
  onChanged: () => void;
}) {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticket) fetchEvents(ticket.id).then(setEvents).catch(() => setEvents([]));
    setComment('');
  }, [ticket?.id]);

  if (!ticket) return null;

  const tecnico = ticket.tecnico;
  const solicitante = ticket.solicitante;
  const categoria = ticket.categoria;
  const area = ticket.area;
  const canAct = actorRol === 'tecnico' || actorRol === 'supervisor';

  async function handleComment() {
    if (!comment.trim() || !ticket) return;
    setLoading(true);
    try {
      await addComentario(ticket.id, comment.trim(), actorId);
      setComment('');
      const evs = await fetchEvents(ticket.id);
      setEvents(evs);
      onChanged();
    } finally { setLoading(false); }
  }

  async function handleEstado(nuevo: string) {
    if (!ticket) return;
    setLoading(true);
    try {
      await changeTicketEstado(ticket.id, nuevo, actorId, actorNombre);
      const evs = await fetchEvents(ticket.id);
      setEvents(evs);
      onChanged();
    } finally { setLoading(false); }
  }

  async function handlePause() {
    if (!ticket) return;
    setLoading(true);
    try {
      await toggleSlaPause(ticket.id, !ticket.sla_paused);
      onChanged();
    } finally { setLoading(false); }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={ticket.codigo}
      subtitle={ticket.asunto}
      width="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={ticket.estado} />
          <PrioridadBadge prioridad={ticket.prioridad} />
          <span className="text-xs text-slate-400">Creado {timeAgo(ticket.created_at)}</span>
        </div>

        {/* SLA */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock size={15} /> Acuerdo de nivel de servicio
            </div>
            {canAct && (
              <Button size="sm" variant="ghost" onClick={handlePause} disabled={loading}>
                {ticket.sla_paused ? <><Play size={13} /> Reanudar</> : <><Pause size={13} /> Pausar</>}
              </Button>
            )}
          </div>
          <div className="mt-3">
            <SlaBar deadline={ticket.sla_deadline} createdAt={ticket.created_at} paused={ticket.sla_paused} />
          </div>
          {ticket.sla_deadline && (
            <p className="mt-2 text-xs text-slate-400">Vence: {formatDate(ticket.sla_deadline)}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Descripción</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{ticket.descripcion}</p>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 text-sm">
          <Meta icon={<UserIcon size={14} />} label="Solicitante" value={solicitante?.nombre ?? '—'} />
          <Meta icon={<UserIcon size={14} />} label="Técnico" value={tecnico?.nombre ?? 'Sin asignar'} />
          <Meta icon={<Tag size={14} />} label="Categoría" value={categoria?.nombre ?? '—'} />
          <Meta icon={<Building2 size={14} />} label="Área" value={area?.nombre ?? '—'} />
        </div>

        {/* Actions */}
        {canAct && (
          <div className="flex flex-wrap gap-2">
            {ticket.estado !== 'resuelto' && ticket.estado !== 'cerrado' && (
              <Button size="sm" variant="primary" onClick={() => handleEstado('resuelto')} disabled={loading}>
                <CheckCircle2 size={14} /> Marcar resuelto
              </Button>
            )}
            {ticket.estado === 'resuelto' && (
              <Button size="sm" variant="primary" onClick={() => handleEstado('cerrado')} disabled={loading}>
                <CheckCircle2 size={14} /> Cerrar ticket
              </Button>
            )}
            {ticket.estado !== 'info' && ticket.estado !== 'cerrado' && (
              <Button size="sm" variant="outline" onClick={() => handleEstado('info')} disabled={loading}>
                <MessageSquare size={14} /> Solicitar info
              </Button>
            )}
            {ticket.estado !== 'cancelado' && ticket.estado !== 'cerrado' && (
              <Button size="sm" variant="ghost" onClick={() => handleEstado('cancelado')} disabled={loading}>
                <XCircle size={14} /> Cancelar
              </Button>
            )}
          </div>
        )}

        {/* Timeline */}
        <div>
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Historial ({events.length})</h3>
          <Timeline events={events} users={users} />
        </div>

        {/* Comment box */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex gap-2">
            <Avatar initials={users.find((u) => u.id === actorId)?.avatar_initials ?? '?'} size="sm" />
            <div className="flex-1">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe un comentario..."
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={handleComment} disabled={loading || !comment.trim()}>
                  <Send size={13} /> Comentar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">{icon}{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
