/*
# Flujo de tickets — soporte para "Requiere información adicional"

## Cambios
- Se agrega la columna `estado_previo` a `tickets`.
  Se usa para recordar en qué estado estaba el ticket (Recibido, En revisión, Confirmado)
  antes de pasar a "info" (Requiere información adicional), de modo que al recibir la
  respuesta del Solicitante el sistema pueda restaurarlo automáticamente (HU-11).

Sin este campo, el sistema no puede volver el ticket a su estado real de trabajo
después de que el Solicitante responde — quedaría siempre "revision" por defecto.
*/

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS estado_previo text;
