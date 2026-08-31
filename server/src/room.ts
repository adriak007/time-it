import { QUICK_PLAY_CONFIG } from '../shared/config/gameConfig.js';
import {
  calculateDifference,
  calculateScore,
  calculateStreakBonus,
  continuesStreak,
  determineDirection,
  determineRating,
  isPrecisionHit,
} from '../shared/services/scoring.js';
import { generateTarget } from '../shared/services/target.js';
import type { GameConfigInput, PlayerId } from '../shared/types/game.js';
import type {
  OnlinePlayer,
  RoomCode,
  RoomState,
  ScoredAttempt,
} from '../shared/types/online.js';

/** Tempo entre o "start" e a liberação dos botões (intro + 3-2-1-JÁ). */
export const COUNTDOWN_MS = 4200;

/** Uma sala inativa por mais que isto é descartada. */
export const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

/** Janela para reconectar antes de perder a vaga. */
export const RECONNECT_GRACE_MS = 60_000;

export const MAX_PLAYERS = 4;

export interface Member {
  playerId: PlayerId;
  name: string;
  /** Segredo de reconexão; nunca é enviado a outros jogadores. */
  token: string;
  connected: boolean;
  disconnectedAt: number | null;
  totalScore: number;
  totalAbsErrorMs: number;
  precisionHits: number;
  currentStreak: number;
  bestStreak: number;
}

export class Room {
  readonly code: RoomCode;
  config: GameConfigInput;
  phase: RoomState['phase'] = 'lobby';
  roundIndex = 0;
  targetMs: number | null = null;
  startsAt: number | null = null;
  results: ScoredAttempt[] | null = null;
  lastActivity = Date.now();

  readonly members = new Map<PlayerId, Member>();
  /** Tentativas da rodada atual: playerId -> ms medidos no aparelho. */
  private attempts = new Map<PlayerId, number>();
  private previousTarget: number | null = null;
  private hostId: PlayerId = 1;

  constructor(code: RoomCode, config: GameConfigInput = QUICK_PLAY_CONFIG) {
    this.code = code;
    this.config = { ...config };
  }

  /* ---------------------------------------------------------------- */
  /* Entrada e saída                                                   */
  /* ---------------------------------------------------------------- */

  /** Menor id livre, para o jogador manter cor/posição estáveis. */
  private nextPlayerId(): PlayerId | null {
    for (let i = 1; i <= MAX_PLAYERS; i += 1) {
      if (!this.members.has(i as PlayerId)) return i as PlayerId;
    }
    return null;
  }

  get isFull(): boolean {
    return this.members.size >= MAX_PLAYERS;
  }

  get isEmpty(): boolean {
    return this.members.size === 0;
  }

  hasName(name: string): boolean {
    const wanted = name.trim().toLowerCase();
    return [...this.members.values()].some((m) => m.name.toLowerCase() === wanted);
  }

  add(name: string, token: string): Member | null {
    const playerId = this.nextPlayerId();
    if (playerId == null) return null;

    const member: Member = {
      playerId,
      name: name.trim().slice(0, 12) || `JOGADOR ${playerId}`,
      token,
      connected: true,
      disconnectedAt: null,
      totalScore: 0,
      totalAbsErrorMs: 0,
      precisionHits: 0,
      currentStreak: 0,
      bestStreak: 0,
    };

    this.members.set(playerId, member);
    if (this.members.size === 1) this.hostId = playerId;
    this.touch();
    return member;
  }

  findByToken(token: string): Member | undefined {
    return [...this.members.values()].find((m) => m.token === token);
  }

  /** Marca como desconectado sem remover: dá tempo de voltar. */
  markDisconnected(playerId: PlayerId): void {
    const member = this.members.get(playerId);
    if (!member) return;
    member.connected = false;
    member.disconnectedAt = Date.now();
    this.touch();
  }

  reconnect(member: Member): void {
    member.connected = true;
    member.disconnectedAt = null;
    this.touch();
  }

  remove(playerId: PlayerId): void {
    this.members.delete(playerId);
    this.attempts.delete(playerId);
    // O anfitrião saiu: passa o comando para quem entrou primeiro.
    if (playerId === this.hostId && this.members.size > 0) {
      this.hostId = [...this.members.keys()].sort((a, b) => a - b)[0];
    }
    this.touch();
  }

  /** Remove quem passou da janela de reconexão. */
  pruneDisconnected(now = Date.now()): PlayerId[] {
    const dropped: PlayerId[] = [];
    for (const member of this.members.values()) {
      if (
        !member.connected &&
        member.disconnectedAt != null &&
        now - member.disconnectedAt > RECONNECT_GRACE_MS
      ) {
        dropped.push(member.playerId);
      }
    }
    dropped.forEach((id) => this.remove(id));
    return dropped;
  }

  isHost(playerId: PlayerId): boolean {
    return playerId === this.hostId;
  }

  touch(): void {
    this.lastActivity = Date.now();
  }

  get isStale(): boolean {
    return Date.now() - this.lastActivity > ROOM_TTL_MS;
  }

  /* ---------------------------------------------------------------- */
  /* Fluxo da partida                                                  */
  /* ---------------------------------------------------------------- */

  setConfig(config: GameConfigInput): void {
    if (this.phase !== 'lobby') return;
    this.config = { ...config, players: Math.max(1, this.members.size) as GameConfigInput['players'] };
    this.touch();
  }

  startMatch(): void {
    if (this.phase !== 'lobby') return;
    for (const member of this.members.values()) {
      member.totalScore = 0;
      member.totalAbsErrorMs = 0;
      member.precisionHits = 0;
      member.currentStreak = 0;
      member.bestStreak = 0;
    }
    this.roundIndex = 0;
    this.previousTarget = null;
    this.beginRound();
  }

  private beginRound(): void {
    this.attempts.clear();
    this.results = null;
    this.targetMs = generateTarget(
      this.config.minTargetMs,
      this.config.maxTargetMs,
      this.config.stepMs,
      this.previousTarget,
    );
    this.previousTarget = this.targetMs;
    this.phase = 'round_intro';
    // Todos recebem o mesmo instante de largada, então os botões liberam
    // juntos mesmo com latências diferentes.
    this.startsAt = Date.now() + COUNTDOWN_MS;
    this.touch();
  }

  /** Chamado por um timer quando a contagem termina. */
  openRound(): void {
    if (this.phase !== 'round_intro') return;
    this.phase = 'playing';
    this.touch();
  }

  /**
   * Registra a tentativa de um jogador. O tempo vem medido do aparelho dele;
   * o servidor apenas valida a faixa e pontua.
   */
  submitAttempt(playerId: PlayerId, elapsedMs: number): boolean {
    if (this.phase !== 'playing') return false;
    if (!this.members.has(playerId)) return false;
    if (this.attempts.has(playerId)) return false;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > 600_000) return false;

    this.attempts.set(playerId, elapsedMs);
    this.touch();
    return true;
  }

  /** Todos os conectados já mandaram a tentativa? */
  get allSubmitted(): boolean {
    const active = [...this.members.values()].filter((m) => m.connected);
    if (active.length === 0) return false;
    return active.every((m) => this.attempts.has(m.playerId));
  }

  get submittedIds(): PlayerId[] {
    return [...this.attempts.keys()].sort((a, b) => a - b);
  }

  /** Fecha a rodada: pontua todo mundo e atualiza os totais. */
  finishRound(): void {
    if (this.phase !== 'playing') return;
    const target = this.targetMs ?? 0;
    const scored: ScoredAttempt[] = [];

    for (const member of this.members.values()) {
      const elapsed = this.attempts.get(member.playerId);
      if (elapsed == null) continue;

      const errorMs = calculateDifference(elapsed, target);
      const absErrorMs = Math.abs(errorMs);
      const rating = determineRating(absErrorMs);
      const base = calculateScore(absErrorMs, target);

      const extends_ = continuesStreak(absErrorMs);
      const newStreak = extends_ ? member.currentStreak + 1 : 0;
      const streakBonus = extends_ ? calculateStreakBonus(newStreak) : 0;

      member.currentStreak = newStreak;
      member.bestStreak = Math.max(member.bestStreak, newStreak);
      member.totalScore += base + streakBonus;
      member.totalAbsErrorMs += absErrorMs;
      if (isPrecisionHit(rating)) member.precisionHits += 1;

      scored.push({
        playerId: member.playerId,
        elapsedMs: elapsed,
        errorMs,
        absErrorMs,
        direction: determineDirection(errorMs),
        rating,
        score: base,
        streakBonus,
        totalPoints: base + streakBonus,
      });
    }

    scored.sort((a, b) => a.absErrorMs - b.absErrorMs);
    this.results = scored;
    this.phase = 'round_results';
    this.startsAt = null;
    this.touch();
  }

  get isLastRound(): boolean {
    if (this.config.rounds === 'endless') return false;
    return this.roundIndex >= this.config.rounds - 1;
  }

  /** Avança para a próxima rodada, ou encerra a partida. */
  advance(): void {
    if (this.phase !== 'round_results') return;
    if (this.isLastRound) {
      this.phase = 'game_over';
      this.startsAt = null;
      this.touch();
      return;
    }
    this.roundIndex += 1;
    this.beginRound();
  }

  /** Volta ao lobby mantendo os jogadores. */
  reset(): void {
    this.phase = 'lobby';
    this.roundIndex = 0;
    this.targetMs = null;
    this.startsAt = null;
    this.results = null;
    this.attempts.clear();
    this.touch();
  }

  /* ---------------------------------------------------------------- */
  /* Serialização                                                      */
  /* ---------------------------------------------------------------- */

  /** Estado público da sala. O token de cada jogador nunca sai daqui. */
  toState(): RoomState {
    const players: OnlinePlayer[] = [...this.members.values()]
      .sort((a, b) => a.playerId - b.playerId)
      .map((m) => ({
        id: m.playerId,
        name: m.name,
        isHost: m.playerId === this.hostId,
        connected: m.connected,
        totalScore: m.totalScore,
        totalAbsErrorMs: m.totalAbsErrorMs,
        precisionHits: m.precisionHits,
        currentStreak: m.currentStreak,
        bestStreak: m.bestStreak,
      }));

    return {
      code: this.code,
      phase: this.phase,
      config: this.config,
      players,
      roundIndex: this.roundIndex,
      // O alvo só existe a partir da intro da rodada; no lobby é null para
      // não vazar informação antes da hora.
      targetMs: this.phase === 'lobby' ? null : this.targetMs,
      submitted: this.submittedIds,
      results: this.results,
      // Convertido para duração no momento do envio: cada cliente recebe
      // "faltam N ms", que vale independentemente do relógio dele.
      startsInMs: this.startsAt == null ? null : Math.max(0, this.startsAt - Date.now()),
    };
  }
}

/** Letras sem ambiguidade visual (sem I/O/0/1) para ditar por voz. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const makeRoomCode = (): RoomCode => {
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
};
