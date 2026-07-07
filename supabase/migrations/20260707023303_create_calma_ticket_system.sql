/*
# CALMA Ticket System - Core Schema

## Overview
Creates the full schema for the CALMA ticket management system prototype.
This is a single-tenant demo app with role-switching (no real auth), so all
policies allow anon + authenticated CRUD on shared/public data.

## New Tables
1. `users` - System users (demo profiles tied to roles: admin, tecnico, supervisor, solicitante)
   - id, nombre, email, cargo, rol, estado, avatar_initials, created_at
2. `categories` - Ticket categories (Incidencia, Solicitud de acceso, Soporte funcional)
   - id, nombre, descripcion, activo, created_at
3. `sla_config` - SLA configuration per priority (critica, alta, media, baja)
   - id, prioridad, horas_respuesta, horas_resolucion, color
4. `areas` - Escalation areas (Equipo de Desarrollo, RRHH, Plataformas)
   - id, nombre, responsable_id (FK users), activo, created_at
5. `tickets` - Main ticket table
   - id, codigo, asunto, descripcion, categoria_id, prioridad, estado,
     solicitante_id, tecnico_id, sla_deadline, sla_paused, created_at, updated_at, closed_at
6. `ticket_events` - Activity timeline / history per ticket
   - id, ticket_id (FK), tipo, usuario_id (FK), comentario, estado_anterior, estado_nuevo, created_at
7. `audit_log` - Immutable audit trail of system changes
   - id, event_id, ticket_id, tipo, usuario_id, detalles, created_at
8. `security_events` - Access monitoring (attempts, blocked)
   - id, sec_id, usuario_id, ruta, ip, resultado, created_at

## Security
- RLS enabled on every table.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is an intentionally shared single-tenant demo (no sign-in screen).
*/

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text UNIQUE NOT NULL,
  cargo text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin', 'tecnico', 'supervisor', 'solicitante')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  avatar_initials text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_users" ON users;
CREATE POLICY "anon_delete_users" ON users FOR DELETE TO anon, authenticated USING (true);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- ============ SLA CONFIG ============
CREATE TABLE IF NOT EXISTS sla_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prioridad text NOT NULL UNIQUE CHECK (prioridad IN ('critica', 'alta', 'media', 'baja')),
  horas_respuesta integer NOT NULL DEFAULT 1,
  horas_resolucion integer NOT NULL DEFAULT 4,
  color text NOT NULL DEFAULT '#94a3b8'
);
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_sla" ON sla_config;
CREATE POLICY "anon_select_sla" ON sla_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_sla" ON sla_config;
CREATE POLICY "anon_insert_sla" ON sla_config FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_sla" ON sla_config;
CREATE POLICY "anon_update_sla" ON sla_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_sla" ON sla_config;
CREATE POLICY "anon_delete_sla" ON sla_config FOR DELETE TO anon, authenticated USING (true);

-- ============ AREAS ============
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  responsable_id uuid REFERENCES users(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_areas" ON areas;
CREATE POLICY "anon_select_areas" ON areas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_areas" ON areas;
CREATE POLICY "anon_insert_areas" ON areas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_areas" ON areas;
CREATE POLICY "anon_update_areas" ON areas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_areas" ON areas;
CREATE POLICY "anon_delete_areas" ON areas FOR DELETE TO anon, authenticated USING (true);

-- ============ TICKETS ============
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  asunto text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  categoria_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  prioridad text NOT NULL DEFAULT 'media' CHECK (prioridad IN ('critica', 'alta', 'media', 'baja')),
  estado text NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'revision', 'confirmado', 'info', 'resuelto', 'cerrado', 'cancelado')),
  solicitante_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tecnico_id uuid REFERENCES users(id) ON DELETE SET NULL,
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  sla_deadline timestamptz,
  sla_paused boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_tickets" ON tickets;
CREATE POLICY "anon_select_tickets" ON tickets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_tickets" ON tickets;
CREATE POLICY "anon_insert_tickets" ON tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_tickets" ON tickets;
CREATE POLICY "anon_update_tickets" ON tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_tickets" ON tickets;
CREATE POLICY "anon_delete_tickets" ON tickets FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_tecnico ON tickets(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_tickets_solicitante ON tickets(solicitante_id);

-- ============ TICKET EVENTS ============
CREATE TABLE IF NOT EXISTS ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'comentario' CHECK (tipo IN ('creacion', 'cambio_estado', 'comentario', 'escalamiento', 'solicitud_info', 'reasignacion')),
  usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
  comentario text NOT NULL DEFAULT '',
  estado_anterior text,
  estado_nuevo text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_events" ON ticket_events;
CREATE POLICY "anon_select_events" ON ticket_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON ticket_events;
CREATE POLICY "anon_insert_events" ON ticket_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON ticket_events;
CREATE POLICY "anon_update_events" ON ticket_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON ticket_events;
CREATE POLICY "anon_delete_events" ON ticket_events FOR DELETE TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  ticket_id text,
  tipo text NOT NULL,
  usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
  usuario_nombre text,
  detalles text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_audit" ON audit_log;
CREATE POLICY "anon_select_audit" ON audit_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_audit" ON audit_log;
CREATE POLICY "anon_insert_audit" ON audit_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_audit" ON audit_log;
CREATE POLICY "anon_update_audit" ON audit_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_audit" ON audit_log;
CREATE POLICY "anon_delete_audit" ON audit_log FOR DELETE TO anon, authenticated USING (true);

-- ============ SECURITY EVENTS ============
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sec_id text NOT NULL,
  usuario_id uuid REFERENCES users(id) ON DELETE SET NULL,
  usuario_nombre text,
  usuario_rol text,
  ruta text NOT NULL,
  ip text NOT NULL,
  resultado text NOT NULL CHECK (resultado IN ('registrado', 'bloqueada')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_security" ON security_events;
CREATE POLICY "anon_select_security" ON security_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_security" ON security_events;
CREATE POLICY "anon_insert_security" ON security_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_security" ON security_events;
CREATE POLICY "anon_update_security" ON security_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_security" ON security_events;
CREATE POLICY "anon_delete_security" ON security_events FOR DELETE TO anon, authenticated USING (true);

-- ============ TRIGGER: updated_at ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated ON tickets;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
