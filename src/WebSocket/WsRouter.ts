type RoomMessage = Record<string, unknown>;
type RoomHandler = (message: RoomMessage) => void;

const rooms: Record<string, RoomHandler[]> = {};

function resolveRoom(message: RoomMessage): string | null {
  if (typeof message.room === 'string') return message.room;
  if (typeof message.action === 'string') return 'auth';
  return null;
}

function route(message: RoomMessage) {
  const room = resolveRoom(message);
  if (!room) {
    console.warn('[WsRouter] Mensagem sem sala identificável, descartada:', message);
    return;
  }

  const handlers = rooms[room] || [];
  if (handlers.length === 0) {
    console.warn(`[WsRouter] Nenhum handler registrado pra sala "${room}"`);
    return;
  }

  handlers.forEach((handler) => {
    try {
      handler(message);
    } catch (err) {
      console.error(`[WsRouter] Erro no handler da sala "${room}":`, err);
    }
  });
}

// Cada módulo de sala (auth, telemetry, atuação futura...) registra UM handler
// aqui, que internamente sabe como despachar dentro da própria sala.
function onRoom(room: string, handler: RoomHandler) {
  if (!rooms[room]) rooms[room] = [];
  rooms[room].push(handler);
}

export const WsRouter = { route, onRoom };