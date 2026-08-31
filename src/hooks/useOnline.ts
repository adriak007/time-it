import { useSyncExternalStore } from 'react';
import { online } from '../services/online';
import type { ConnectionStatus, RoomState } from '../types/online';
import type { PlayerId } from '../types/game';

export interface OnlineView {
  status: ConnectionStatus;
  state: RoomState | null;
  playerId: PlayerId | null;
  error: string | null;
}

/**
 * Liga o cliente online ao React.
 *
 * O cliente vive fora da árvore de componentes (o socket precisa sobreviver a
 * trocas de tela), então `useSyncExternalStore` é o jeito correto de ler esse
 * estado sem espelhá-lo em `useState`.
 */
export const useOnline = (): OnlineView =>
  useSyncExternalStore(
    online.subscribe,
    // Um objeto novo a cada leitura causaria re-render infinito; por isso o
    // snapshot é memoizado abaixo e só muda quando algo de fato mudou.
    () => getSnapshot(),
    () => EMPTY,
  );

const EMPTY: OnlineView = { status: 'idle', state: null, playerId: null, error: null };

let cache: OnlineView = EMPTY;

const getSnapshot = (): OnlineView => {
  if (
    cache.status !== online.status ||
    cache.state !== online.state ||
    cache.playerId !== online.playerId ||
    cache.error !== online.error
  ) {
    cache = {
      status: online.status,
      state: online.state,
      playerId: online.playerId,
      error: online.error,
    };
  }
  return cache;
};
