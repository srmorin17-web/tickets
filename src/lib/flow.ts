import type { Estado } from './types';

/**
 * Flujo de estados permitido (RF-17):
 * Recibido -> En revisión -> Confirmado -> [Requiere información adicional] -> Resuelto -> Cerrado
 *                                                                                        \-> Cancelado (desde cualquier estado activo)
 *
 * "info" no es un destino manual libre: se entra vía requestInfo() y se sale vía respondInfo(),
 * que restaura el estado anterior guardado en `estado_previo`.
 */
export const TRANSITIONS: Record<Estado, Estado[]> = {
  recibido: ['revision', 'cancelado'],
  revision: ['confirmado', 'cancelado'],
  confirmado: ['resuelto', 'cancelado'],
  info: [], // se resuelve automáticamente vía respondInfo()
  resuelto: ['cerrado'],
  cerrado: [],
  cancelado: [],
};

// Estados desde los que se puede solicitar información adicional o escalar
export const INFO_REQUESTABLE_STATES: Estado[] = ['revision', 'confirmado'];
export const ESCALATABLE_STATES: Estado[] = ['revision', 'confirmado'];

// Estados que exigen comentario obligatorio de cierre (RF-18)
export const COMMENT_REQUIRED_STATES: Estado[] = ['resuelto', 'cancelado'];

export function canTransition(from: Estado, to: Estado): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const ESTADO_ACTION_LABEL: Record<string, string> = {
  revision: 'Iniciar revisión',
  confirmado: 'Confirmar',
  resuelto: 'Marcar resuelto',
  cerrado: 'Cerrar ticket',
  cancelado: 'Cancelar',
};
