import { PLAYER_ACCENTS } from '../config/gameConfig';
import { playerIds } from '../game/session';
import type { PlayerId, Round } from '../types';
import { TapButton, type TapButtonSize } from './TapButton';

interface ArenaProps {
  round: Round;
  playerCount: number;
  playerNames: string[];
  onTap: (playerId: PlayerId) => void;
  locked: boolean;
  landscape: boolean;
}

/**
 * Lays out one tap zone per player, filling the screen.
 *
 * Layouts:
 *   1 player  — one huge centred button
 *   2 players — stacked in portrait, side by side in landscape; player 1's
 *               zone is rotated so two people facing each other both read
 *               their label upright
 *   3 players — three equal bands (rows in portrait, columns in landscape)
 *   4 players — a 2x2 grid; the top row is rotated for the players opposite
 *
 * The container never scrolls: every zone is a fraction of the viewport.
 */
export const Arena = ({
  round,
  playerCount,
  playerNames,
  onTap,
  locked,
  landscape,
}: ArenaProps) => {
  const ids = playerIds(playerCount);

  const size: TapButtonSize = playerCount === 1 ? 'solo' : playerCount === 2 ? 'duo' : 'quad';

  const gridStyle = (): React.CSSProperties => {
    if (playerCount === 1) return { display: 'grid', gridTemplateRows: '1fr' };
    if (playerCount === 2) {
      return landscape
        ? { display: 'grid', gridTemplateColumns: '1fr 1fr' }
        : { display: 'grid', gridTemplateRows: '1fr 1fr' };
    }
    if (playerCount === 3) {
      return landscape
        ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }
        : { display: 'grid', gridTemplateRows: 'repeat(3, 1fr)' };
    }
    // Four players: a 2x2 table grid in portrait. In landscape the screen is
    // short, so two rows would squash the circles — one row of four uses the
    // long edge and gives everyone an equally large zone.
    return landscape
      ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }
      : { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
  };

  /** Which zones face a player on the opposite side of the device. */
  const isFlipped = (id: PlayerId): boolean => {
    // Portrait 2P: the players sit across from each other.
    if (playerCount === 2) return id === 1 && !landscape;
    // Portrait 4P: the top row faces the far side of the table. In the
    // landscape single row everyone sits along the same edge, so nothing flips.
    if (playerCount === 4) return !landscape && (id === 1 || id === 2);
    return false;
  };

  return (
    <div className="min-h-0 w-full flex-1 gap-1 p-1" style={gridStyle()}>
      {ids.map((id) => (
        <div
          key={id}
          className="flex min-h-0 min-w-0 items-center justify-center"
          style={{ containerType: 'size' }}
        >
          <TapButton
            playerId={id}
            status={round.attempts[id].status}
            onTap={onTap}
            accent={PLAYER_ACCENTS[id]}
            label={playerNames[id - 1] ?? `PLAYER ${id}`}
            showLabel={playerCount > 1}
            size={size}
            disabled={locked}
            flipped={isFlipped(id)}
          />
        </div>
      ))}
    </div>
  );
};
