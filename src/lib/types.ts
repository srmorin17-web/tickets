export type Rol = 'admin' | 'tecnico' | 'supervisor' | 'solicitante';
export type Estado = 'recibido' | 'revision' | 'confirmado' | 'info' | 'resuelto' | 'cerrado' | 'cancelado';
export type Prioridad = 'critica' | 'alta' | 'media' | 'baja';
export type TipoEvento = 'creacion' | 'cambio_estado' | 'comentario' | 'escalamiento' | 'solicitud_info' | 'reasignacion';

export interface User {
  id: string;
  nombre: string;
  email: string;
  cargo: string;
  rol: Rol;
  estado: 'activo' | 'inactivo';
  avatar_initials: string;
  created_at: string;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  created_at: string;
}

export interface SlaConfig {
  id: string;
  prioridad: Prioridad;
  horas_respuesta: number;
  horas_resolucion: number;
  color: string;
}

export interface Area {
  id: string;
  nombre: string;
  responsable_id: string | null;
  activo: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  codigo: string;
  asunto: string;
  descripcion: string;
  categoria_id: string | null;
  prioridad: Prioridad;
  estado: Estado;
  estado_previo: Estado | null;
  solicitante_id: string | null;
  tecnico_id: string | null;
  area_id: string | null;
  sla_deadline: string | null;
  sla_paused: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  tipo: TipoEvento;
  usuario_id: string | null;
  comentario: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  event_id: string;
  ticket_id: string | null;
  tipo: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  detalles: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  sec_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
  ruta: string;
  ip: string;
  resultado: 'registrado' | 'bloqueada';
  created_at: string;
}

export interface TicketWithRelations extends Ticket {
  categoria?: Category | null;
  solicitante?: User | null;
  tecnico?: User | null;
  area?: Area | null;
}
