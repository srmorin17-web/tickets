-- Seed de datos para el prototipo CALMA
-- Incluye usuarios demo, categorías, SLA, áreas y un ticket de ejemplo.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Usuarios demo
INSERT INTO users (nombre, email, cargo, rol, estado, avatar_initials)
VALUES
  ('Ana Torres', 'ana.torres@empresa.cl', 'Jefa de Operaciones', 'solicitante', 'activo', 'AT'),
  ('Diego Rojas', 'diego.rojas@empresa.cl', 'Técnico Nivel 1', 'tecnico', 'activo', 'DR'),
  ('Francisco López', 'francisco.lopez@empresa.cl', 'Supervisor de Mesa', 'supervisor', 'activo', 'FL'),
  ('Gabriela Soto', 'gabriela.soto@empresa.cl', 'Administradora del Sistema', 'admin', 'activo', 'GS')
ON CONFLICT (email) DO UPDATE
SET nombre = EXCLUDED.nombre,
    cargo = EXCLUDED.cargo,
    rol = EXCLUDED.rol,
    estado = 'activo',
    avatar_initials = EXCLUDED.avatar_initials;

-- Categorías predeterminadas
INSERT INTO categories (nombre, descripcion, activo)
SELECT 'Incidencia', 'Problemas técnicos o fallas en servicios existentes.', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nombre = 'Incidencia');

INSERT INTO categories (nombre, descripcion, activo)
SELECT 'Solicitud de acceso', 'Peticiones de acceso a sistemas, permisos o recursos.', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nombre = 'Solicitud de acceso');

INSERT INTO categories (nombre, descripcion, activo)
SELECT 'Soporte funcional', 'Consultas y soporte en procesos internos y uso de herramientas.', true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nombre = 'Soporte funcional');

-- Configuración de SLA
INSERT INTO sla_config (prioridad, horas_respuesta, horas_resolucion, color)
SELECT 'critica', 1, 4, '#ef4444'
WHERE NOT EXISTS (SELECT 1 FROM sla_config WHERE prioridad = 'critica');

INSERT INTO sla_config (prioridad, horas_respuesta, horas_resolucion, color)
SELECT 'alta', 2, 8, '#f97316'
WHERE NOT EXISTS (SELECT 1 FROM sla_config WHERE prioridad = 'alta');

INSERT INTO sla_config (prioridad, horas_respuesta, horas_resolucion, color)
SELECT 'media', 4, 24, '#f59e0b'
WHERE NOT EXISTS (SELECT 1 FROM sla_config WHERE prioridad = 'media');

INSERT INTO sla_config (prioridad, horas_respuesta, horas_resolucion, color)
SELECT 'baja', 8, 72, '#22c55e'
WHERE NOT EXISTS (SELECT 1 FROM sla_config WHERE prioridad = 'baja');

-- Áreas de trabajo
INSERT INTO areas (nombre, responsable_id, activo)
SELECT 'Equipo de Desarrollo', u.id, true
FROM users u
WHERE u.email = 'gabriela.soto@empresa.cl'
  AND NOT EXISTS (SELECT 1 FROM areas WHERE nombre = 'Equipo de Desarrollo');

INSERT INTO areas (nombre, responsable_id, activo)
SELECT 'RRHH', u.id, true
FROM users u
WHERE u.email = 'francisco.lopez@empresa.cl'
  AND NOT EXISTS (SELECT 1 FROM areas WHERE nombre = 'RRHH');

INSERT INTO areas (nombre, responsable_id, activo)
SELECT 'Plataformas', u.id, true
FROM users u
WHERE u.email = 'diego.rojas@empresa.cl'
  AND NOT EXISTS (SELECT 1 FROM areas WHERE nombre = 'Plataformas');

-- Ticket de ejemplo
INSERT INTO tickets (codigo, asunto, descripcion, categoria_id, prioridad, estado, solicitante_id, tecnico_id, area_id, sla_deadline, created_at, updated_at)
SELECT
  'TKT-2026-0001',
  'Problema de acceso a VPN',
  'No puedo conectar a la VPN corporativa desde la oficina. Recibe error de autenticación.',
  c.id,
  'media',
  'revision',
  u_solicitante.id,
  u_tecnico.id,
  a.id,
  now() + interval '48 hours',
  now(),
  now()
FROM users u_solicitante
JOIN users u_tecnico ON u_tecnico.email = 'diego.rojas@empresa.cl'
JOIN categories c ON c.nombre = 'Incidencia'
JOIN areas a ON a.nombre = 'Plataformas'
WHERE u_solicitante.email = 'ana.torres@empresa.cl'
  AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.codigo = 'TKT-2026-0001');

-- Evento de creación del ticket
INSERT INTO ticket_events (ticket_id, tipo, usuario_id, comentario, estado_anterior, estado_nuevo, created_at)
SELECT t.id, 'creacion', u.id, 'Ticket generado desde el portal de solicitudes.', NULL, 'revision', now()
FROM tickets t
JOIN users u ON u.email = 'ana.torres@empresa.cl'
WHERE t.codigo = 'TKT-2026-0001'
  AND NOT EXISTS (
    SELECT 1 FROM ticket_events ev
    WHERE ev.ticket_id = t.id AND ev.tipo = 'creacion'
  );

-- Registro de auditoría de ejemplo
INSERT INTO audit_log (event_id, ticket_id, tipo, usuario_id, usuario_nombre, detalles, created_at)
SELECT 'AUD-DEMO-0001', t.codigo, 'creacion', u.id, u.nombre, 'Ticket inicial de demostración creado por Ana Torres.', now()
FROM tickets t
JOIN users u ON u.email = 'ana.torres@empresa.cl'
WHERE t.codigo = 'TKT-2026-0001'
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a WHERE a.event_id = 'AUD-DEMO-0001'
  );

-- Evento de seguridad de acceso inicial (demo)
INSERT INTO security_events (sec_id, usuario_id, usuario_nombre, usuario_rol, ruta, ip, resultado, created_at)
SELECT 'SEC-DEMO-0001', u.id, u.nombre, u.rol, '/login', '127.0.0.1', 'registrado', now()
FROM users u
WHERE u.email = 'ana.torres@empresa.cl'
  AND NOT EXISTS (
    SELECT 1 FROM security_events s WHERE s.sec_id = 'SEC-DEMO-0001'
  );
