import { isApiError } from '../api/apiClient';

const CODE_MESSAGES: Record<string, string> = {
  missing_auth: 'Tu sesion expiro. Inicia sesion nuevamente.',
  invalid_auth: 'Tu sesion no es valida. Vuelve a iniciar sesion.',
  invalid_content_type: 'Formato de solicitud invalido.',
  payload_too_large: 'La solicitud es demasiado grande.',
  not_found: 'No se encontro el recurso solicitado.',
  internal_error: 'Ocurrio un error interno. Intenta de nuevo.',
  session_id_conflict: 'La sesion ya existe en otro dispositivo. Recarga e intenta de nuevo.',
  routine_id_conflict: 'El identificador de la rutina ya esta en uso.',
  invalid_session: 'Los datos de la sesion no son validos.',
  invalid_exercise_log: 'Los datos del registro del ejercicio no son validos.',
  invalid_user: 'No tienes permisos para esta accion.',
  not_subscribed: 'Activa las notificaciones para usar el temporizador en segundo plano.'
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'No pudimos procesar la solicitud. Revisa los datos.',
  401: 'Tu sesion expiro. Inicia sesion nuevamente.',
  403: 'No tienes permisos para realizar esta accion.',
  404: 'No se encontro la informacion solicitada.',
  409: 'Conflicto de datos. Actualiza e intenta de nuevo.',
  413: 'La solicitud es demasiado grande.',
  415: 'El formato enviado no es soportado.',
  429: 'Hay demasiadas solicitudes. Espera un momento.',
  500: 'Ocurrio un error interno. Intenta de nuevo.',
  502: 'El servidor no responde correctamente. Intenta de nuevo.',
  503: 'El servicio esta temporalmente no disponible.',
  504: 'La solicitud tardo demasiado. Intenta de nuevo.'
};

export const toUserMessage = (error: unknown, fallback: string): string => {
  if (isApiError(error)) {
    if (error.code && CODE_MESSAGES[error.code]) {
      return CODE_MESSAGES[error.code];
    }

    if (STATUS_MESSAGES[error.status]) {
      return STATUS_MESSAGES[error.status];
    }

    if (error.message && !error.message.toLowerCase().startsWith('request failed')) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};
