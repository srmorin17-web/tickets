import { supabase } from './supabase';
import type {
  Area, AuditLog, Category, Estado, Prioridad, SecurityEvent, SlaConfig,
  Ticket, TicketEvent, TicketWithRelations, User,
} from './types';
import { canTransition, COMMENT_REQUIRED_STATES, ESCALATABLE_STATES, INFO_REQUESTABLE_STATES } from './flow';

function newAuditId(): string {
  return `AUD-${Date.now().toString().slice(-6)}`;
}

// ---------- Users ----------
export async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users').select('*').order('nombre', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertUser(u: Partial<User> & { id?: string }): Promise<User> {
  if (u.id) {
    const { data, error } = await supabase
      .from('users').update(u).eq('id', u.id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('users').insert(u).select('*').single();
  if (error) throw error;
  return data;
}

export async function setUserEstado(id: string, estado: 'activo' | 'inactivo'): Promise<void> {
  const { error } = await supabase.from('users').update({ estado }).eq('id', id);
  if (error) throw error;
}

// ---------- Categories ----------
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories').select('*').order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function upsertCategory(c: Partial<Category> & { id?: string }): Promise<Category> {
  if (c.id) {
    const { data, error } = await supabase
      .from('categories').update(c).eq('id', c.id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('categories').insert(c).select('*').single();
  if (error) throw error;
  return data;
}

// ---------- SLA ----------
export async function fetchSla(): Promise<SlaConfig[]> {
  const { data, error } = await supabase
    .from('sla_config').select('*').order('horas_resolucion');
  if (error) throw error;
  return data ?? [];
}

export async function updateSla(id: string, patch: Partial<SlaConfig>): Promise<void> {
  const { error } = await supabase.from('sla_config').update(patch).eq('id', id);
  if (error) throw error;
}

// ---------- Areas ----------
export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from('areas').select('*').order('nombre');
  if (error) throw error;
  return data ?? [];
}

export async function upsertArea(a: Partial<Area> & { id?: string }): Promise<Area> {
  if (a.id) {
    const { data, error } = await supabase
      .from('areas').update(a).eq('id', a.id).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('areas').insert(a).select('*').single();
  if (error) throw error;
  return data;
}

// ---------- Tickets ----------
export async function fetchTickets(): Promise<TicketWithRelations[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      categoria:categories(*),
      solicitante:users!tickets_solicitante_id_fkey(*),
      tecnico:users!tickets_tecnico_id_fkey(*),
      area:areas(*)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TicketWithRelations[];
}

export async function fetchTicket(id: string): Promise<TicketWithRelations | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      categoria:categories(*),
      solicitante:users!tickets_solicitante_id_fkey(*),
      tecnico:users!tickets_tecnico_id_fkey(*),
      area:areas(*)
    `)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as TicketWithRelations | null;
}

function nextCodigo(existing: string[]): string {
  const year = new Date().getFullYear();
  const prefix = `TKT-${year}-`;
  const nums = existing
    .filter((c) => c.startsWith(prefix))
    .map((c) => parseInt(c.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function createTicket(input: {
  asunto: string;
  descripcion: string;
  categoria_id: string;
  prioridad: Prioridad;
  solicitante_id: string;
  sla_horas: number;
}): Promise<Ticket> {
  const { data: codes } = await supabase.from('tickets').select('codigo');
  const codigo = nextCodigo((codes ?? []).map((r) => r.codigo));
  const sla_deadline = new Date(Date.now() + input.sla_horas * 3600_000).toISOString();

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      codigo,
      asunto: input.asunto,
      descripcion: input.descripcion,
      categoria_id: input.categoria_id,
      prioridad: input.prioridad,
      estado: 'recibido',
      solicitante_id: input.solicitante_id,
      sla_deadline,
    })
    .select('*')
    .single();
  if (error) throw error;

  await supabase.from('ticket_events').insert({
    ticket_id: data.id,
    tipo: 'creacion',
    usuario_id: input.solicitante_id,
    comentario: 'Ticket creado desde el portal de solicitudes',
    estado_nuevo: 'recibido',
  });

  return data;
}

export async function updateTicket(id: string, patch: Partial<Ticket>): Promise<void> {
  const { error } = await supabase.from('tickets').update(patch).eq('id', id);
  if (error) throw error;
}

export async function assignTicket(
  ticketId: string,
  tecnicoId: string,
  areaId: string | null,
  actorId: string,
  actorNombre: string,
): Promise<void> {
  const { data: t } = await supabase.from('tickets').select('estado').eq('id', ticketId).maybeSingle();
  const nuevoEstado = t?.estado === 'recibido' ? 'revision' : t?.estado ?? 'revision';
  await supabase.from('tickets').update({ tecnico_id: tecnicoId, area_id: areaId, estado: nuevoEstado }).eq('id', ticketId);
  const { data: tecnico } = await supabase.from('users').select('nombre').eq('id', tecnicoId).maybeSingle();
  const { data: area } = await supabase.from('areas').select('nombre').eq('id', areaId ?? '').maybeSingle();
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'reasignacion',
    usuario_id: actorId,
    comentario: `Asignado a ${tecnico?.nombre ?? 'técnico'}${area ? ` (${area.nombre})` : ''}`,
    estado_anterior: t?.estado ?? null,
    estado_nuevo: nuevoEstado,
  });
  await supabase.from('audit_log').insert({
    event_id: `AUD-${Date.now().toString().slice(-6)}`,
    ticket_id: (await supabase.from('tickets').select('codigo').eq('id', ticketId).maybeSingle()).data?.codigo ?? null,
    tipo: 'reasignacion',
    usuario_id: actorId,
    usuario_nombre: actorNombre,
    detalles: `Reasignó ticket a ${tecnico?.nombre ?? 'técnico'}`,
  });
}

export async function changeTicketEstado(
  ticketId: string,
  nuevoEstado: Estado,
  actorId: string,
  actorNombre: string,
  comentario?: string,
): Promise<void> {
  const { data: t } = await supabase.from('tickets').select('estado, codigo').eq('id', ticketId).maybeSingle();
  if (!t) return;
  const estadoActual = t.estado as Estado;

  if (!canTransition(estadoActual, nuevoEstado)) {
    throw new Error(
      `No se puede pasar de "${estadoActual}" a "${nuevoEstado}". El ticket debe seguir el flujo definido.`,
    );
  }
  if (COMMENT_REQUIRED_STATES.includes(nuevoEstado) && !comentario?.trim()) {
    throw new Error(`Debe ingresar un comentario para marcar el ticket como "${nuevoEstado}".`);
  }

  const patch: Partial<Ticket> = { estado: nuevoEstado };
  if (nuevoEstado === 'cerrado' || nuevoEstado === 'resuelto') patch.closed_at = new Date().toISOString();
  await supabase.from('tickets').update(patch).eq('id', ticketId);
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'cambio_estado',
    usuario_id: actorId,
    comentario: comentario?.trim() || `Estado cambiado a ${nuevoEstado}`,
    estado_anterior: estadoActual,
    estado_nuevo: nuevoEstado,
  });
  await supabase.from('audit_log').insert({
    event_id: newAuditId(),
    ticket_id: t.codigo,
    tipo: 'cambio_estado',
    usuario_id: actorId,
    usuario_nombre: actorNombre,
    detalles: `Cambió estado de ${estadoActual} a ${nuevoEstado}`,
  });
}

// ---------- Solicitar información adicional (HU-11 / RF-19 / RF-20) ----------
export async function requestInfo(
  ticketId: string,
  mensaje: string,
  actorId: string,
  actorNombre: string,
): Promise<void> {
  if (!mensaje.trim()) {
    throw new Error('Debe especificar qué información se requiere.');
  }
  const { data: t } = await supabase.from('tickets').select('estado, codigo').eq('id', ticketId).maybeSingle();
  if (!t) return;
  const estadoActual = t.estado as Estado;
  if (!INFO_REQUESTABLE_STATES.includes(estadoActual)) {
    throw new Error('Solo se puede solicitar información desde "En revisión" o "Confirmado".');
  }

  await supabase.from('tickets').update({
    estado: 'info',
    estado_previo: estadoActual,
    sla_paused: true, // el conteo de SLA se suspende automáticamente (RF-20)
  }).eq('id', ticketId);

  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'solicitud_info',
    usuario_id: actorId,
    comentario: mensaje.trim(),
    estado_anterior: estadoActual,
    estado_nuevo: 'info',
  });

  await supabase.from('audit_log').insert({
    event_id: newAuditId(),
    ticket_id: t.codigo,
    tipo: 'solicitud_info',
    usuario_id: actorId,
    usuario_nombre: actorNombre,
    detalles: `Solicitó información adicional: "${mensaje.trim()}"`,
  });
}

// ---------- Respuesta del Solicitante a una solicitud de información ----------
export async function respondInfo(
  ticketId: string,
  respuesta: string,
  actorId: string,
  actorNombre: string,
): Promise<void> {
  if (!respuesta.trim()) {
    throw new Error('Debe escribir una respuesta antes de continuar.');
  }
  const { data: t } = await supabase
    .from('tickets').select('estado, estado_previo, codigo').eq('id', ticketId).maybeSingle();
  if (!t || t.estado !== 'info') return;
  const destino = (t.estado_previo as Estado) ?? 'revision';

  await supabase.from('tickets').update({
    estado: destino,
    estado_previo: null,
    sla_paused: false, // se reanuda el conteo de SLA
  }).eq('id', ticketId);

  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'comentario',
    usuario_id: actorId,
    comentario: `Respuesta del solicitante: ${respuesta.trim()}`,
    estado_anterior: 'info',
    estado_nuevo: destino,
  });

  await supabase.from('audit_log').insert({
    event_id: newAuditId(),
    ticket_id: t.codigo,
    tipo: 'respuesta_info',
    usuario_id: actorId,
    usuario_nombre: actorNombre,
    detalles: 'El solicitante respondió a la solicitud de información. El técnico fue notificado.',
  });
}

// ---------- Escalamiento a área designada (HU-12 / RF-21, RF-22, RF-23) ----------
export async function escalateTicket(
  ticketId: string,
  areaId: string,
  motivo: string,
  actorId: string,
  actorNombre: string,
): Promise<void> {
  if (!areaId) throw new Error('Debe seleccionar el área destino.');
  if (!motivo.trim()) throw new Error('Debe ingresar el motivo del escalamiento.');

  const { data: t } = await supabase.from('tickets').select('estado, codigo').eq('id', ticketId).maybeSingle();
  if (!t) return;
  const estadoActual = t.estado as Estado;
  if (!ESCALATABLE_STATES.includes(estadoActual)) {
    throw new Error('Solo se pueden escalar tickets en estado "En revisión" o "Confirmado".');
  }

  const { data: area } = await supabase.from('areas').select('nombre').eq('id', areaId).maybeSingle();
  const areaNombre = area?.nombre ?? 'área designada';

  await supabase.from('tickets').update({ area_id: areaId }).eq('id', ticketId);

  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'escalamiento',
    usuario_id: actorId,
    comentario: `Escalado a ${areaNombre}. Motivo: ${motivo.trim()}`,
    estado_anterior: estadoActual,
    estado_nuevo: estadoActual,
  });

  await supabase.from('audit_log').insert({
    event_id: newAuditId(),
    ticket_id: t.codigo,
    tipo: 'escalamiento',
    usuario_id: actorId,
    usuario_nombre: actorNombre,
    detalles: `Escaló el ticket a ${areaNombre} — Motivo: ${motivo.trim()}. Área y solicitante notificados.`,
  });
}

export async function addComentario(
  ticketId: string,
  texto: string,
  actorId: string,
): Promise<void> {
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'comentario',
    usuario_id: actorId,
    comentario: texto,
  });
}

export async function toggleSlaPause(ticketId: string, paused: boolean): Promise<void> {
  const { error } = await supabase.from('tickets').update({ sla_paused: paused }).eq('id', ticketId);
  if (error) throw error;
}

// ---------- Events ----------
export async function fetchEvents(ticketId: string): Promise<TicketEvent[]> {
  const { data, error } = await supabase
    .from('ticket_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ---------- Audit ----------
export async function fetchAudit(limit = 100): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------- Security ----------
export async function fetchSecurity(limit = 100): Promise<SecurityEvent[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function logSecurityEvent(input: {
  usuario_nombre: string;
  usuario_rol: string | null;
  ruta: string;
  resultado: 'registrado' | 'bloqueada';
}): Promise<void> {
  await supabase.from('security_events').insert({
    sec_id: `SEC-${Date.now().toString().slice(-6)}`,
    usuario_nombre: input.usuario_nombre,
    usuario_rol: input.usuario_rol,
    ruta: input.ruta,
    ip: '200.83.45.10',
    resultado: input.resultado,
  });
}
