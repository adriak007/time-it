/**
 * Protocolo do multiplayer online.
 *
 * Este arquivo é a ÚNICA fonte de verdade das mensagens trocadas entre app e
 * servidor. O servidor (em `server/`) importa estes mesmos tipos, então uma
 * mudança de formato quebra o build dos dois lados em vez de virar um bug
 * silencioso em produção.
 *
 * Princípio de projeto: o servidor NUNCA mede tempo de ninguém. Cada aparelho
 * mede o próprio intervalo com `performance.now()` (relógio monotônico local,
 * imune a lag de rede) e envia apenas o resultado em milissegundos. Assim uma
 * conexão ruim atrapalha a espera, mas jamais a precisão da jogada.
 */

import type { GameConfigInput, PlayerId } from './game';

/** Versão do protocolo. Cliente e servidor precisam bater. */
export const PROTOCOL_VERSION = 1;

/** Código da sala: 4 letras, fácil de ditar em voz alta. */
export type RoomCode = string;

export interface OnlinePlayer {
  /** Id estável dentro da sala (1-4), usado para cor e posição. */
  id: PlayerId;
  name: string;
  /** O anfitrião controla as configurações e inicia a partida. */
  isHost: boolean;
  connected: boolean;
  /** Pontuação acumulada na partida. */
  totalScore: number;
  totalAbsErrorMs: number;
  precisionHits: number;
  currentStreak: number;
  bestStreak: number;
}

/** Resultado de uma tentativa, já medido no aparelho do jogador. */
export interface OnlineAttempt {
  playerId: PlayerId;
  /** Duração medida localmente, em ms (precisão de float preservada). */
  elapsedMs: number;
}

/** Tentativa já pontuada pelo servidor, pronta para exibir. */
export interface ScoredAttempt {
  playerId: PlayerId;
  elapsedMs: number;
  errorMs: number;
  absErrorMs: number;
  direction: 'early' | 'late' | 'exact';
  rating: string;
  score: number;
  streakBonus: number;
  totalPoints: number;
}

/** Fase da sala, espelhando a máquina de estados do jogo local. */
export type RoomPhase = 'lobby' | 'round_intro' | 'playing' | 'round_results' | 'game_over';

/** Estado completo da sala. O servidor manda isto sempre que algo muda. */
export interface RoomState {
  code: RoomCode;
  phase: RoomPhase;
  config: GameConfigInput;
  players: OnlinePlayer[];
  roundIndex: number;
  /** Alvo da rodada atual. Só é revelado quando a rodada começa. */
  targetMs: number | null;
  /** Quem já enviou a tentativa desta rodada. */
  submitted: PlayerId[];
  /** Resultados da rodada, preenchidos quando todos terminam. */
  results: ScoredAttempt[] | null;
  /** Instante (epoch ms do servidor) em que a contagem regressiva termina. */
  startsAt: number | null;
}

/* ------------------------------------------------------------------ */
/* Mensagens: CLIENTE -> SERVIDOR                                      */
/* ------------------------------------------------------------------ */

export type ClientMessage =
  | { type: 'create'; name: string; config: GameConfigInput; protocol: number }
  | { type: 'join'; code: RoomCode; name: string; protocol: number }
  /** Reconexão após queda: retoma o lugar na sala com o mesmo token. */
  | { type: 'resume'; code: RoomCode; token: string; protocol: number }
  | { type: 'config'; config: GameConfigInput }
  | { type: 'start' }
  /** Envia o tempo medido no próprio aparelho. */
  | { type: 'attempt'; elapsedMs: number }
  | { type: 'next' }
  | { type: 'playAgain' }
  | { type: 'leave' }
  | { type: 'ping' };

/* ------------------------------------------------------------------ */
/* Mensagens: SERVIDOR -> CLIENTE                                      */
/* ------------------------------------------------------------------ */

export type ServerErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'name_taken'
  | 'not_host'
  | 'bad_protocol'
  | 'already_started'
  | 'invalid'
  | 'rate_limited';

export type ServerMessage =
  /** Confirmação de entrada: identidade do jogador + token de reconexão. */
  | { type: 'joined'; playerId: PlayerId; token: string; state: RoomState }
  /** Estado novo da sala (fonte de verdade; o cliente só reflete). */
  | { type: 'state'; state: RoomState }
  | { type: 'error'; code: ServerErrorCode; message: string }
  | { type: 'pong' };

/** Motivos de desconexão mostrados ao jogador. */
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';
