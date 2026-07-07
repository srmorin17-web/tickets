import { supabase } from './supabase';
import type {
  Area, AuditLog, Category, Prioridad, SecurityEvent, SlaConfig,
  Ticket, TicketEvent, TicketWithRelations, User,
} from './types';

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
  nuevoEstado: string,
  actorId: string,
  actorNombre: string,
  comentario?: string,
): Promise<void> {
  const { data: t } = await supabase.from('tickets').select('estado, codigo').eq('id', ticketId).maybeSingle();
  if (!t) return;
  const patch: Partial<Ticket> = { estado: nuevoEstado as Ticket['estado'] };
  if (nuevoEstado === 'cerrado' || nuevoEstado === 'resuelto') patch.closed_at = new Date().toISOString();
  await supabase.from('tickets').update(patch).eq('id', ticketId);
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    tipo: 'cambio_estado',
    usuario_id: actorId,
    comentario: comentario ?? `Estado cambiado a ${nuevoEstado}`,
    estado_anterior: t.estado,
    estado_nuevo: nuevoEstado,
  });
  await supabase.from('audit_log').insert({
    event_id: `AUD-${Date.now().toString().slice(-6)}`,
    ticket_id: t.codigo,
    tipo: 'cambio_estado',
    usuario_id: actorId,
    usuario_nombre: actorNombre,
    detalles: `Cambió estado de ${t.estado} a ${nuevoEstado}`,
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
