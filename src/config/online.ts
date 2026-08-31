/**
 * Endereço do servidor de partidas online.
 *
 * COMO CONFIGURAR (leva ~10 minutos, veja server/DEPLOY.md):
 *   1. Hospede a pasta `server/` em qualquer serviço Node (Render, Fly.io,
 *      Railway — todos têm plano gratuito).
 *   2. Troque VITE_ONLINE_URL no arquivo `.env` da raiz pelo endereço que o
 *      serviço te der, usando `wss://` (WebSocket seguro):
 *
 *        VITE_ONLINE_URL=wss://timeit-server.onrender.com
 *
 *   3. Gere o APK de novo: `npm run android:apk`.
 *
 * Sem isso, o jogo online aponta para a máquina local e mostra um aviso
 * amigável em vez de travar.
 */

const RAW_URL = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  ?.VITE_ONLINE_URL;

/** Endereço padrão quando nada foi configurado. */
const LOCAL_FALLBACK = 'ws://localhost:8787';

export const ONLINE_URL = (RAW_URL?.trim() || LOCAL_FALLBACK).trim();

/**
 * `true` quando existe um endereço de servidor definido em `VITE_ONLINE_URL`.
 *
 * A distinção importa: apontar explicitamente para `localhost` é um cenário
 * válido de desenvolvimento (servidor rodando na mesma máquina), enquanto a
 * AUSÊNCIA da variável significa que o APK saiu sem servidor — e aí o jogo
 * mostra o aviso em vez de deixar o jogador esperando uma conexão impossível.
 */
export const ONLINE_CONFIGURED = Boolean(RAW_URL?.trim());

/** Endereço HTTP equivalente, para checar a saúde antes de abrir o socket. */
export const ONLINE_HEALTH_URL = ONLINE_URL.replace(/^ws/, 'http') + '/health';

export const ONLINE = {
  /** Tentativas de reconexão antes de desistir. */
  maxRetries: 5,
  /** Espera inicial entre tentativas (cresce a cada falha). */
  retryBaseMs: 800,
  retryMaxMs: 6000,
  /** Intervalo do ping para manter a conexão viva. */
  heartbeatMs: 25_000,
  /** Tempo máximo esperando o servidor responder ao abrir. */
  connectTimeoutMs: 10_000,
} as const;

/** Chave onde guardamos a sessão para reconectar após fechar o app. */
export const ONLINE_SESSION_KEY = 'timeit.online.session';
