import { ONLINE, ONLINE_SESSION_KEY, ONLINE_URL } from '../config/online';
import type {
  ClientMessage,
  ConnectionStatus,
  RoomState,
  ServerMessage,
} from '../types/online';
import type { GameConfigInput, PlayerId } from '../types/game';
import { PROTOCOL_VERSION } from '../types/online';

/**
 * Cliente da sala online.
 *
 * Responsabilidades:
 *  - manter o WebSocket vivo (heartbeat + reconexão com espera crescente);
 *  - retomar a vaga na sala automaticamente depois de uma queda;
 *  - expor o estado da sala para a interface, sem regra de jogo aqui dentro.
 *
 * O servidor é a fonte de verdade: este cliente nunca calcula pontuação nem
 * decide quem venceu, apenas reflete o que chega.
 */

export interface OnlineSession {
  code: string;
  token: string;
  playerId: PlayerId;
}

type Listener = () => void;

const loadSession = (): OnlineSession | null => {
  try {
    const raw = window.localStorage.getItem(ONLINE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as OnlineSession) : null;
  } catch {
    return null;
  }
};

const saveSession = (session: OnlineSession | null): void => {
  try {
    if (session) window.localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(ONLINE_SESSION_KEY);
  } catch {
    /* armazenamento indisponível — a reconexão automática apenas não persiste */
  }
};

class OnlineClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private heartbeat: number | null = null;
  private retryTimer: number | null = null;
  private retries = 0;
  /** Evita reconectar quando a saída foi intencional. */
  private intentionalClose = false;
  /** Mensagem a enviar assim que a conexão abrir. */
  private pending: ClientMessage | null = null;

  status: ConnectionStatus = 'idle';
  state: RoomState | null = null;
  playerId: PlayerId | null = null;
  error: string | null = null;
  session: OnlineSession | null = loadSession();

  /* ---------------------------------------------------------------- */
  /* Assinatura (React)                                                */
  /* ---------------------------------------------------------------- */

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private set(patch: Partial<OnlineClient>): void {
    Object.assign(this, patch);
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  /* Conexão                                                           */
  /* ---------------------------------------------------------------- */

  private open(onReady: () => void): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      onReady();
      return;
    }

    this.intentionalClose = false;
    this.set({ status: this.retries > 0 ? 'reconnecting' : 'connecting', error: null });

    let socket: WebSocket;
    try {
      socket = new WebSocket(ONLINE_URL);
    } catch {
      this.set({ status: 'disconnected', error: 'Não foi possível conectar ao servidor.' });
      return;
    }
    this.socket = socket;

    // Se o servidor não responder, não deixa o jogador esperando para sempre.
    const timeout = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) socket.close();
    }, ONLINE.connectTimeoutMs);

    socket.onopen = () => {
      window.clearTimeout(timeout);
      this.retries = 0;
      this.set({ status: 'connected' });
      this.startHeartbeat();
      onReady();
    };

    socket.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(event.data)) as ServerMessage;
      } catch {
        return;
      }
      this.handle(msg);
    };

    socket.onclose = () => {
      window.clearTimeout(timeout);
      this.stopHeartbeat();
      if (this.intentionalClose) {
        this.set({ status: 'idle' });
        return;
      }
      this.scheduleRetry();
    };

    socket.onerror = () => {
      /* onclose sempre vem em seguida e cuida da reconexão */
    };
  }

  private handle(msg: ServerMessage): void {
    switch (msg.type) {
      case 'joined': {
        const session: OnlineSession = {
          code: msg.state.code,
          token: msg.token,
          playerId: msg.playerId,
        };
        saveSession(session);
        this.set({
          session,
          playerId: msg.playerId,
          state: msg.state,
          status: 'connected',
          error: null,
        });
        return;
      }
      case 'state':
        this.set({ state: msg.state });
        return;
      case 'error': {
        // Se a sala sumiu (servidor reiniciou, partida encerrada), a sessão
        // guardada não vale mais e precisa ser descartada.
        if (msg.code === 'room_not_found' || msg.code === 'invalid') {
          saveSession(null);
          this.session = null;
        }
        this.set({ error: msg.message });
        return;
      }
      case 'pong':
        return;
    }
  }

  private scheduleRetry(): void {
    // Só faz sentido reconectar se havia uma sala para voltar.
    if (!this.session) {
      this.set({ status: 'disconnected' });
      return;
    }
    if (this.retries >= ONLINE.maxRetries) {
      this.set({
        status: 'disconnected',
        error: 'Conexão perdida. Verifique sua internet.',
      });
      return;
    }

    // Espera crescente: evita martelar um servidor que está reiniciando.
    const delay = Math.min(
      ONLINE.retryBaseMs * 2 ** this.retries,
      ONLINE.retryMaxMs,
    );
    this.retries += 1;
    this.set({ status: 'reconnecting' });

    this.retryTimer = window.setTimeout(() => {
      const session = this.session;
      if (!session) return;
      this.open(() =>
        this.send({
          type: 'resume',
          code: session.code,
          token: session.token,
          protocol: PROTOCOL_VERSION,
        }),
      );
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, ONLINE.heartbeatMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat != null) {
      window.clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private send(msg: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    } else {
      this.pending = msg;
      this.open(() => {
        if (this.pending) {
          this.socket?.send(JSON.stringify(this.pending));
          this.pending = null;
        }
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Ações                                                             */
  /* ---------------------------------------------------------------- */

  createRoom(name: string, config: GameConfigInput): void {
    this.set({ error: null, state: null });
    this.open(() =>
      this.send({ type: 'create', name, protocol: PROTOCOL_VERSION, config }),
    );
  }

  joinRoom(code: string, name: string): void {
    this.set({ error: null, state: null });
    this.open(() =>
      this.send({
        type: 'join',
        code: code.toUpperCase().trim(),
        name,
        protocol: PROTOCOL_VERSION,
      }),
    );
  }

  /** Retoma a última sala, se houver sessão guardada. */
  resumeRoom(): boolean {
    const session = this.session;
    if (!session) return false;
    this.set({ error: null });
    this.open(() =>
      this.send({
        type: 'resume',
        code: session.code,
        token: session.token,
        protocol: PROTOCOL_VERSION,
      }),
    );
    return true;
  }

  updateConfig(config: GameConfigInput): void {
    this.send({ type: 'config', config });
  }

  start(): void {
    this.send({ type: 'start' });
  }

  /** Envia o tempo medido no próprio aparelho. */
  submitAttempt(elapsedMs: number): void {
    this.send({ type: 'attempt', elapsedMs });
  }

  nextRound(): void {
    this.send({ type: 'next' });
  }

  playAgain(): void {
    this.send({ type: 'playAgain' });
  }

  leave(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'leave' } satisfies ClientMessage));
    }
    this.intentionalClose = true;
    if (this.retryTimer != null) window.clearTimeout(this.retryTimer);
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    saveSession(null);
    this.set({ state: null, playerId: null, session: null, status: 'idle', error: null });
  }

  clearError(): void {
    this.set({ error: null });
  }
}

export const online = new OnlineClient();
