import { useEffect, useState } from 'react';
import type { Area, Estado, TicketEvent, TicketWithRelations, User } from '../lib/types';
import { Drawer, Modal } from './Overlay';
import { Avatar, Button, EstadoBadge, PrioridadBadge, SlaBar } from './ui';
import { Timeline } from './Timeline';
import { formatDate, timeAgo } from '../lib/ui';
import {
  addComentario, changeTicketEstado, escalateTicket, fetchAreas,
  fetchEvents, requestInfo, respondInfo, toggleSlaPause,
} from '../lib/data';
import { COMMENT_REQUIRED_STATES, ESCALATABLE_STATES, ESTADO_ACTION_LABEL, INFO_REQUESTABLE_STATES, TRANSITIONS } from '../lib/flow';
import {
  Send, Clock, User as UserIcon, Tag, Building2, Pause, Play,
  CheckCircle2, XCircle, MessageSquare, Flag, AlertCircle,
} from 'lucide-react';

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
  const [areas, setAreas] = useState<Area[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal state para acciones que requieren datos adicionales
  const [pendingEstado, setPendingEstado] = useState<Estado | null>(null); // resuelto/cancelado -> pide comentario
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [showEscalarModal, setShowEscalarModal] = useState(false);
  const [escalarArea, setEscalarArea] = useState('');
  const [escalarMotivo, setEscalarMotivo] = useState('');
  const [respuestaInfo, setRespuestaInfo] = useState('');
  const [closeComment, setCloseComment] = useState('');

  useEffect(() => {
    if (ticket) fetchEvents(ticket.id).then(setEvents).catch(() => setEvents([]));
    fetchAreas().then(setAreas).catch(() => setAreas([]));
    setComment(''); setError(''); setPendingEstado(null);
    setShowInfoModal(false); setInfoMsg('');
    setShowEscalarModal(false); setEscalarArea(''); setEscalarMotivo('');
    setRespuestaInfo(''); setCloseComment('');
  }, [ticket?.id]);

  if (!ticket) return null;

  const tecnico = ticket.tecnico;
  const solicitante = ticket.solicitante;
  const categoria = ticket.categoria;
  const area = ticket.area;
  const estado = ticket.estado as Estado;
  const canAct = actorRol === 'tecnico' || actorRol === 'supervisor';
  const canEscalate = canAct && ESCALATABLE_STATES.includes(estado);
  const canRequestInfo = canAct && INFO_REQUESTABLE_STATES.includes(estado);
  const canRespond = actorRol === 'solicitante' && estado === 'info';
  const nextStates = TRANSITIONS[estado] ?? [];

  async function refreshEvents() {
    if (!ticket) return;
    const evs = await fetchEvents(ticket.id);
    setEvents(evs);
  }

  async function handleComment() {
    if (!comment.trim() || !ticket) return;
    setLoading(true); setError('');
    try {
      await addComentario(ticket.id, comment.trim(), actorId);
      setComment('');
      await refreshEvents();
      onChanged();
    } finally { setLoading(false); }
  }

  async function handleEstado(nuevo: Estado, comentario?: string) {
    if (!ticket) return;
    setLoading(true); setError('');
    try {
      await changeTicketEstado(ticket.id, nuevo, actorId, actorNombre, comentario);
      await refreshEvents();
      onChanged();
      setPendingEstado(null);
      setCloseComment('');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo actualizar el estado.');
    } finally { setLoading(false); }
  }

  function clickEstado(nuevo: Estado) {
    if (COMMENT_REQUIRED_STATES.includes(nuevo)) {
      setPendingEstado(nuevo); // pide comentario obligatorio antes de confirmar
      setCloseComment('');
      setError('');
    } else {
      handleEstado(nuevo);
    }
  }

  async function confirmPendingEstado() {
    if (!pendingEstado) return;
    if (!closeComment.trim()) {
      setError('Debe ingresar un comentario para continuar.');
      return;
    }
    await handleEstado(pendingEstado, closeComment.trim());
  }

  async function handleRequestInfo() {
    if (!ticket) return;
    setLoading(true); setError('');
    try {
      await requestInfo(ticket.id, infoMsg, actorId, actorNombre);
      await refreshEvents();
      onChanged();
      setShowInfoModal(false); setInfoMsg('');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo enviar la solicitud.');
    } finally { setLoading(false); }
  }

  async function handleRespondInfo() {
    if (!ticket) return;
    setLoading(true); setError('');
    try {
      await respondInfo(ticket.id, respuestaInfo, actorId, actorNombre);
      await refreshEvents();
      onChanged();
      setRespuestaInfo('');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo enviar la respuesta.');
    } finally { setLoading(false); }
  }

  async function handleEscalar() {
    if (!ticket) return;
    setLoading(true); setError('');
    try {
      await escalateTicket(ticket.id, escalarArea, escalarMotivo, actorId, actorNombre);
      await refreshEvents();
      onChanged();
      setShowEscalarModal(false); setEscalarArea(''); setEscalarMotivo('');
    } catch (err: any) {
      setError(err.message ?? 'No se pudo escalar el ticket.');
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

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Actions — solo se muestran las transiciones válidas para el estado actual (RF-17) */}
        {canAct && (
          <div className="flex flex-wrap gap-2">
            {nextStates.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === 'cancelado' ? 'ghost' : 'primary'}
                onClick={() => clickEstado(next)}
                disabled={loading}
              >
                {next === 'cancelado' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                {ESTADO_ACTION_LABEL[next] ?? next}
              </Button>
            ))}
            {canRequestInfo && (
              <Button size="sm" variant="outline" onClick={() => setShowInfoModal(true)} disabled={loading}>
                <MessageSquare size={14} /> Solicitar información
              </Button>
            )}
            {canEscalate && (
              <Button size="sm" variant="outline" onClick={() => setShowEscalarModal(true)} disabled={loading}>
                <Flag size={14} /> Escalar
              </Button>
            )}
          </div>
        )}

        {/* Comentario obligatorio antes de Resolver/Cancelar (RF-18) */}
        {pendingEstado && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-800">
              Para marcar el ticket como "{ESTADO_ACTION_LABEL[pendingEstado]?.toLowerCase() ?? pendingEstado}" debes dejar un comentario de cierre.
            </p>
            <textarea
              value={closeComment}
              onChange={(e) => setCloseComment(e.target.value)}
              rows={3}
              placeholder="Describe la resolución o el motivo..."
              className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setPendingEstado(null); setError(''); }}>Cancelar</Button>
              <Button size="sm" onClick={confirmPendingEstado} disabled={loading || !closeComment.trim()}>
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {/* Responder solicitud de información — solo el Solicitante, cuando el ticket está en "info" */}
        {canRespond && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-3">
            <p className="text-sm font-medium text-sky-900">
              El técnico solicitó información adicional. Responde para continuar con tu ticket.
            </p>
            <textarea
              value={respuestaInfo}
              onChange={(e) => setRespuestaInfo(e.target.value)}
              rows={3}
              placeholder="Escribe la información solicitada..."
              className="w-full resize-none rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleRespondInfo} disabled={loading || !respuestaInfo.trim()}>
                <Send size={13} /> Enviar respuesta
              </Button>
            </div>
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
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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

      {/* Modal: Solicitar información adicional */}
      <Modal
        open={showInfoModal}
        onClose={() => { setShowInfoModal(false); setInfoMsg(''); setError(''); }}
        title="Solicitar información adicional"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowInfoModal(false); setInfoMsg(''); }}>Cancelar</Button>
            <Button onClick={handleRequestInfo} disabled={loading || !infoMsg.trim()}>
              <Send size={15} /> Enviar solicitud
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            El ticket pasará a estado "Requiere información adicional" y el conteo de SLA se pausará automáticamente hasta que el solicitante responda.
          </p>
          <textarea
            value={infoMsg}
            onChange={(e) => setInfoMsg(e.target.value)}
            rows={4}
            placeholder="¿Qué información necesitas del solicitante?"
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </Modal>

      {/* Modal: Escalar a área designada */}
      <Modal
        open={showEscalarModal}
        onClose={() => { setShowEscalarModal(false); setEscalarArea(''); setEscalarMotivo(''); setError(''); }}
        title="Escalar ticket"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowEscalarModal(false); setEscalarArea(''); setEscalarMotivo(''); }}>Cancelar</Button>
            <Button onClick={handleEscalar} disabled={loading || !escalarArea || !escalarMotivo.trim()}>
              <Flag size={15} /> Escalar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Área destino</label>
            <select
              value={escalarArea}
              onChange={(e) => setEscalarArea(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">Selecciona un área...</option>
              {areas.filter((a) => a.activo).map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Motivo del escalamiento</label>
            <textarea
              value={escalarMotivo}
              onChange={(e) => setEscalarMotivo(e.target.value)}
              rows={3}
              placeholder="Explica por qué este ticket debe atenderlo otra área..."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </Modal>
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
