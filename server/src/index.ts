import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';

import { PROTOCOL_VERSION } from '../shared/types/online.js';
import type {
  ClientMessage,
  RoomCode,
  ServerErrorCode,
  ServerMessage,
} from '../shared/types/online.js';
import type { GameConfigInput, PlayerId } from '../shared/types/game.js';
import { QUICK_PLAY_CONFIG, TARGET_LIMITS } from '../shared/config/gameConfig.js';
import { COUNTDOWN_MS, Room, makeRoomCode } from './room.js';

const PORT = Number(process.env.PORT ?? 8787);

/* ------------------------------------------------------------------ */
/* Estado do processo                                                  */
/* ------------------------------------------------------------------ */

const rooms = new Map<RoomCode, Room>();

interface Client {
  socket: WebSocket;
  roomCode: RoomCode | null;
  playerId: PlayerId | null;
  /** Marcações recentes, para limitar excesso de mensagens. */
  hits: number[];
  alive: boolean;
}

const clients = new Map<WebSocket, Client>();

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const send = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

const fail = (socket: WebSocket, code: ServerErrorCode, message: string): void =>
  send(socket, { type: 'error', code, message });

/** Envia o estado da sala a todos os participantes conectados. */
const broadcast = (room: Room): void => {
  const state = room.toState();
  for (const client of clients.values()) {
    if (client.roomCode === room.code) send(client.socket, { type: 'state', state });
  }
};

/**
 * Saneia a configuração vinda do cliente. Nunca confiar no app: valores fora
 * da faixa poderiam travar a geração de alvos ou criar partidas infinitas.
 */
const sanitizeConfig = (raw: unknown): GameConfigInput => {
  const base = { ...QUICK_PLAY_CONFIG };
  if (typeof raw !== 'object' || raw === null) return base;
  const c = raw as Partial<GameConfigInput>;

  const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
    return Math.min(Math.max(n, min), max);
  };

  const minTargetMs = clamp(
    c.minTargetMs,
    TARGET_LIMITS.absoluteMinMs,
    TARGET_LIMITS.absoluteMaxMs - TARGET_LIMITS.minSpanMs,
    base.minTargetMs,
  );
  const maxTargetMs = clamp(
    c.maxTargetMs,
    minTargetMs + TARGET_LIMITS.minSpanMs,
    TARGET_LIMITS.absoluteMaxMs,
    Math.max(base.maxTargetMs, minTargetMs + TARGET_LIMITS.minSpanMs),
  );
  const stepMs = clamp(c.stepMs, 10, 5000, base.stepMs);

  const rounds: GameConfigInput['rounds'] =
    c.rounds === 'endless'
      ? 'endless'
      : clamp(c.rounds, 1, 50, typeof base.rounds === 'number' ? base.rounds : 5);

  return { ...base, minTargetMs, maxTargetMs, stepMs, rounds };
};

/** Limita a 30 mensagens por 10s por conexão. */
const rateLimited = (client: Client): boolean => {
  const now = Date.now();
  client.hits = client.hits.filter((t) => now - t < 10_000);
  client.hits.push(now);
  return client.hits.length > 30;
};

const clientsIn = (code: RoomCode): Client[] =>
  [...clients.values()].filter((c) => c.roomCode === code);

/* ------------------------------------------------------------------ */
/* Timers de rodada                                                    */
/* ------------------------------------------------------------------ */

const roundTimers = new Map<RoomCode, NodeJS.Timeout>();

const clearRoundTimer = (code: RoomCode): void => {
  const t = roundTimers.get(code);
  if (t) {
    clearTimeout(t);
    roundTimers.delete(code);
  }
};

/** Libera os botões quando a contagem regressiva termina. */
const scheduleRoundOpen = (room: Room): void => {
  clearRoundTimer(room.code);
  const delay = Math.max(0, (room.startsAt ?? Date.now()) - Date.now());
  roundTimers.set(
    room.code,
    setTimeout(() => {
      roundTimers.delete(room.code);
      if (!rooms.has(room.code)) return;
      room.openRound();
      broadcast(room);
    }, delay),
  );
};

/** Fecha a rodada assim que todos enviarem. */
const maybeFinishRound = (room: Room): void => {
  if (room.phase !== 'playing' || !room.allSubmitted) return;
  room.finishRound();
  broadcast(room);
};

/* ------------------------------------------------------------------ */
/* Tratamento de mensagens                                             */
/* ------------------------------------------------------------------ */

const handleMessage = (client: Client, raw: ClientMessage): void => {
  const socket = client.socket;

  /* ---- Criar sala ---- */
  if (raw.type === 'create') {
    if (raw.protocol !== PROTOCOL_VERSION) {
      return fail(socket, 'bad_protocol', 'Atualize o aplicativo para jogar online.');
    }
    let code = makeRoomCode();
    while (rooms.has(code)) code = makeRoomCode();

    const room = new Room(code, sanitizeConfig(raw.config));
    rooms.set(code, room);

    const token = randomUUID();
    const member = room.add(String(raw.name ?? ''), token);
    if (!member) return fail(socket, 'invalid', 'Não foi possível criar a sala.');

    client.roomCode = code;
    client.playerId = member.playerId;
    send(socket, {
      type: 'joined',
      playerId: member.playerId,
      token,
      state: room.toState(),
    });
    console.log(`[sala ${code}] criada por ${member.name}`);
    return;
  }

  /* ---- Entrar em sala ---- */
  if (raw.type === 'join') {
    if (raw.protocol !== PROTOCOL_VERSION) {
      return fail(socket, 'bad_protocol', 'Atualize o aplicativo para jogar online.');
    }
    const code = String(raw.code ?? '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return fail(socket, 'room_not_found', 'Sala não encontrada.');
    if (room.isFull) return fail(socket, 'room_full', 'Essa sala já está cheia.');
    if (room.phase !== 'lobby') {
      return fail(socket, 'already_started', 'A partida já começou.');
    }
    const name = String(raw.name ?? '').trim();
    if (room.hasName(name)) return fail(socket, 'name_taken', 'Já tem alguém com esse nome.');

    const token = randomUUID();
    const member = room.add(name, token);
    if (!member) return fail(socket, 'room_full', 'Essa sala já está cheia.');

    client.roomCode = code;
    client.playerId = member.playerId;
    send(socket, { type: 'joined', playerId: member.playerId, token, state: room.toState() });
    broadcast(room);
    console.log(`[sala ${code}] ${member.name} entrou (${room.members.size}/4)`);
    return;
  }

  /* ---- Reconectar ---- */
  if (raw.type === 'resume') {
    const code = String(raw.code ?? '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) return fail(socket, 'room_not_found', 'Sala não encontrada.');

    const member = room.findByToken(String(raw.token ?? ''));
    if (!member) return fail(socket, 'invalid', 'Não foi possível retomar a partida.');

    // Se havia outra conexão com este jogador, ela é descartada.
    for (const other of clientsIn(code)) {
      if (other !== client && other.playerId === member.playerId) {
        other.roomCode = null;
        other.playerId = null;
        other.socket.close();
      }
    }

    room.reconnect(member);
    client.roomCode = code;
    client.playerId = member.playerId;
    send(socket, {
      type: 'joined',
      playerId: member.playerId,
      token: member.token,
      state: room.toState(),
    });
    broadcast(room);
    console.log(`[sala ${code}] ${member.name} reconectou`);
    return;
  }

  /* ---- A partir daqui é preciso estar numa sala ---- */
  const room = client.roomCode ? rooms.get(client.roomCode) : undefined;
  const playerId = client.playerId;
  if (!room || playerId == null) {
    return fail(socket, 'invalid', 'Você não está em uma sala.');
  }

  switch (raw.type) {
    case 'config': {
      if (!room.isHost(playerId)) {
        return fail(socket, 'not_host', 'Só quem criou a sala muda as opções.');
      }
      room.setConfig(sanitizeConfig(raw.config));
      broadcast(room);
      return;
    }

    case 'start': {
      if (!room.isHost(playerId)) {
        return fail(socket, 'not_host', 'Só quem criou a sala pode começar.');
      }
      if (room.phase !== 'lobby') return;
      room.startMatch();
      broadcast(room);
      scheduleRoundOpen(room);
      return;
    }

    case 'attempt': {
      if (room.submitAttempt(playerId, Number(raw.elapsedMs))) {
        broadcast(room);
        maybeFinishRound(room);
      }
      return;
    }

    case 'next': {
      if (!room.isHost(playerId)) {
        return fail(socket, 'not_host', 'Só quem criou a sala avança a rodada.');
      }
      if (room.phase !== 'round_results') return;
      // `advance()` leva a sala para 'round_intro' (próxima rodada) ou
      // 'game_over' (fim). Ler a fase depois via toState() evita que o
      // TypeScript estreite o tipo com base na checagem acima.
      room.advance();
      broadcast(room);
      if (room.toState().phase === 'round_intro') scheduleRoundOpen(room);
      return;
    }

    case 'playAgain': {
      if (!room.isHost(playerId)) {
        return fail(socket, 'not_host', 'Só quem criou a sala reinicia.');
      }
      room.reset();
      broadcast(room);
      return;
    }

    case 'leave': {
      const name = room.members.get(playerId)?.name ?? '?';
      room.remove(playerId);
      client.roomCode = null;
      client.playerId = null;
      console.log(`[sala ${room.code}] ${name} saiu`);
      if (room.isEmpty) {
        clearRoundTimer(room.code);
        rooms.delete(room.code);
      } else {
        broadcast(room);
        // Quem saiu pode ser o último que faltava enviar.
        maybeFinishRound(room);
      }
      return;
    }

    case 'ping':
      send(socket, { type: 'pong' });
      return;
  }
};

/* ------------------------------------------------------------------ */
/* HTTP + WebSocket                                                    */
/* ------------------------------------------------------------------ */

const http = createServer((req, res) => {
  // Endpoint de saúde: usado pela hospedagem e pelo app para checar se o
  // servidor está no ar antes de tentar abrir o WebSocket.
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'timeit-server',
        protocol: PROTOCOL_VERSION,
        rooms: rooms.size,
        uptime: Math.round(process.uptime()),
      }),
    );
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (socket) => {
  const client: Client = { socket, roomCode: null, playerId: null, hits: [], alive: true };
  clients.set(socket, client);

  socket.on('pong', () => {
    client.alive = true;
  });

  socket.on('message', (data) => {
    if (rateLimited(client)) {
      return fail(socket, 'rate_limited', 'Calma aí! Muitas mensagens.');
    }
    let parsed: ClientMessage;
    try {
      const text = typeof data === 'string' ? data : data.toString();
      if (text.length > 4096) return fail(socket, 'invalid', 'Mensagem grande demais.');
      parsed = JSON.parse(text) as ClientMessage;
    } catch {
      return fail(socket, 'invalid', 'Mensagem inválida.');
    }
    try {
      handleMessage(client, parsed);
    } catch (error) {
      // Um erro numa sala não pode derrubar o servidor inteiro.
      console.error('erro ao tratar mensagem:', error);
      fail(socket, 'invalid', 'Erro ao processar a jogada.');
    }
  });

  socket.on('close', () => {
    const room = client.roomCode ? rooms.get(client.roomCode) : undefined;
    if (room && client.playerId != null) {
      // Não remove na hora: dá janela para reconectar sem perder a vaga.
      room.markDisconnected(client.playerId);
      broadcast(room);
      maybeFinishRound(room);
    }
    clients.delete(socket);
  });

  socket.on('error', () => socket.close());
});

/* ------------------------------------------------------------------ */
/* Manutenção periódica                                                */
/* ------------------------------------------------------------------ */

setInterval(() => {
  // Derruba conexões mortas (celular que perdeu sinal sem fechar o socket).
  for (const [socket, client] of clients) {
    if (!client.alive) {
      // Queda silenciosa (celular sem sinal): o socket parece aberto mas está
      // morto. `terminate()` NÃO dispara o evento 'close', então é preciso
      // marcar a desconexão e avisar os outros jogadores aqui — sem isso a
      // sala continuaria mostrando a pessoa como online indefinidamente.
      const room = client.roomCode ? rooms.get(client.roomCode) : undefined;
      if (room && client.playerId != null) {
        room.markDisconnected(client.playerId);
        clients.delete(socket);
        socket.terminate();
        broadcast(room);
        maybeFinishRound(room);
        continue;
      }
      socket.terminate();
      clients.delete(socket);
      continue;
    }
    client.alive = false;
    if (socket.readyState === socket.OPEN) socket.ping();
  }

  // Remove quem estourou a janela de reconexão e limpa salas vazias/antigas.
  for (const [code, room] of rooms) {
    const dropped = room.pruneDisconnected();
    if (dropped.length > 0) {
      broadcast(room);
      maybeFinishRound(room);
    }
    if (room.isEmpty || room.isStale) {
      clearRoundTimer(code);
      rooms.delete(code);
      console.log(`[sala ${code}] encerrada`);
    }
  }
}, 15_000);

// Escutar explicitamente em 0.0.0.0 (todas as interfaces IPv4).
// Sem o host, o Node pode acabar ouvindo só em IPv6 (::) em alguns
// ambientes de hospedagem; o roteador do Render então não encontra a
// instância e devolve 404 com `x-render-routing: no-server`.
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Time It! — servidor online na porta ${PORT}`);
  console.log(`Protocolo v${PROTOCOL_VERSION} · contagem ${COUNTDOWN_MS}ms`);
});

/* Encerramento limpo: o Render envia SIGTERM ao reiniciar ou hibernar.
   Sem tratar, o processo pode ser morto no meio de um deploy e o serviço
   fica alguns segundos sem instância viva. */
const shutdown = () => {
  console.log('encerrando...');
  wss.clients.forEach((socket) => socket.close(1001, 'servidor reiniciando'));
  http.close(() => process.exit(0));
  // Se algo travar, não deixa o processo pendurado.
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
