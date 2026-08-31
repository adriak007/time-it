import { useCallback, useEffect, useState } from 'react';
import { Splash } from './components/Splash';
import { DEFAULT_CUSTOM_CONFIG, QUICK_PLAY_CONFIG } from './config/gameConfig';
import { usePersistedState } from './hooks/usePersistedState';
import { CustomGamePage } from './pages/CustomGamePage';
import { GameOverPage } from './pages/GameOverPage';
import { GamePage } from './pages/GamePage';
import { MenuPage } from './pages/MenuPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { TutorialPage } from './pages/TutorialPage';
import { OnlineHomePage } from './pages/OnlineHomePage';
import { OnlineLobbyPage } from './pages/OnlineLobbyPage';
import { OnlineGamePage } from './pages/OnlineGamePage';
import { OnlineGameOverPage } from './pages/OnlineGameOverPage';
import { useOnline } from './hooks/useOnline';
import { online } from './services/online';
import { audio } from './services/audio';
import type { GameConfigInput, GameSession } from './types';

type Route =
  | 'splash'
  | 'tutorial'
  | 'menu'
  | 'custom'
  | 'stats'
  | 'settings'
  | 'game'
  | 'over'
  | 'online';

/**
 * Root shell: owns navigation and the persisted store, and hands each screen
 * exactly what it needs. Screens are plain components with no global state.
 */
export default function App() {
  const store = usePersistedState();
  const [route, setRoute] = useState<Route>('splash');
  const [config, setConfig] = useState<GameConfigInput>(
    () => store.lastConfig ?? QUICK_PLAY_CONFIG,
  );
  const [finished, setFinished] = useState<GameSession | null>(null);
  /** Bumped on every match start so GamePage remounts with fresh state. */
  const [matchKey, setMatchKey] = useState(0);

  /* --- Online --------------------------------------------------- */
  const onlineView = useOnline();
  const [onlineName, setOnlineName] = useState(
    () => store.lastConfig?.playerNames?.[0] ?? '',
  );

  const leaveOnline = useCallback(() => {
    online.leave();
    setRoute('menu');
  }, []);

  /* Audio must be unlocked by a user gesture; the first tap anywhere does it. */
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const startMatch = useCallback(
    (next: GameConfigInput) => {
      setConfig(next);
      store.setLastConfig(next);
      setFinished(null);
      setMatchKey((key) => key + 1);
      setRoute('game');
    },
    [store],
  );

  const handleSplashDone = useCallback(() => {
    setRoute(store.tutorialCompleted ? 'menu' : 'tutorial');
  }, [store.tutorialCompleted]);

  /** Roll the finished match into the lifetime stats. */
  const handleFinish = useCallback(
    (session: GameSession) => {
      setFinished(session);
      const best = Math.max(...session.players.map((p) => p.totalScore), 0);
      const longest = Math.max(...session.players.map((p) => p.bestStreak), 0);

      store.updateStats((stats) => ({
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        bestScore: Math.max(stats.bestScore, best),
        longestStreak: Math.max(stats.longestStreak, longest),
      }));

      setRoute('over');
    },
    [store],
  );

  switch (route) {
    case 'splash':
      return <Splash onDone={handleSplashDone} />;

    case 'tutorial':
      return (
        <TutorialPage
          onComplete={() => {
            store.completeTutorial();
            setRoute('menu');
          }}
        />
      );

    case 'custom':
      return (
        <CustomGamePage
          initial={store.lastConfig ?? DEFAULT_CUSTOM_CONFIG}
          onStart={startMatch}
          onBack={() => setRoute('menu')}
        />
      );

    case 'stats':
      return (
        <StatsPage stats={store.stats} onReset={store.resetStats} onBack={() => setRoute('menu')} />
      );

    case 'settings':
      return (
        <SettingsPage
          settings={store.settings}
          onToggle={store.toggleSetting}
          onReplayTutorial={() => {
            store.replayTutorial();
            setRoute('tutorial');
          }}
          onBack={() => setRoute('menu')}
        />
      );

    case 'game':
      return (
        <GamePage
          key={matchKey}
          config={config}
          reduceMotion={store.settings.reduceMotion}
          onExit={() => setRoute('menu')}
          onFinish={handleFinish}
          onRecordAttempts={store.updateStats}
        />
      );

    case 'over':
      return finished ? (
        <GameOverPage
          session={finished}
          reduceMotion={store.settings.reduceMotion}
          onPlayAgain={() => startMatch(config)}
          onNewGame={() => setRoute('custom')}
          onMainMenu={() => setRoute('menu')}
        />
      ) : (
        <MenuPage
          onQuickPlay={() => startMatch(QUICK_PLAY_CONFIG)}
          onOnline={() => setRoute('online')}
          onCustomGame={() => setRoute('custom')}
          onStats={() => setRoute('stats')}
          onSettings={() => setRoute('settings')}
        />
      );

    case 'online': {
      const room = onlineView.state;

      // Sem sala ainda: tela de criar/entrar.
      if (!room) {
        return (
          <OnlineHomePage
            defaultName={onlineName}
            onNameChange={setOnlineName}
            onBack={leaveOnline}
          />
        );
      }

      // Com sala: a fase vinda do servidor manda na navegação.
      const myId = onlineView.playerId;
      if (myId == null) {
        return (
          <OnlineHomePage
            defaultName={onlineName}
            onNameChange={setOnlineName}
            onBack={leaveOnline}
          />
        );
      }

      if (room.phase === 'lobby') {
        return <OnlineLobbyPage room={room} myId={myId} onLeave={leaveOnline} />;
      }
      if (room.phase === 'game_over') {
        return (
          <OnlineGameOverPage
            room={room}
            myId={myId}
            reduceMotion={store.settings.reduceMotion}
            onLeave={leaveOnline}
          />
        );
      }
      // A `key` inclui a rodada: cada rodada monta uma tela nova, então o
      // cronômetro local começa zerado sem precisar de efeito de reset.
      return (
        <OnlineGamePage
          key={`${room.code}-${room.roundIndex}`}
          room={room}
          myId={myId}
          onLeave={leaveOnline}
        />
      );
    }

    case 'menu':
    default:
      return (
        <MenuPage
          onQuickPlay={() => startMatch(QUICK_PLAY_CONFIG)}
          onOnline={() => setRoute('online')}
          onCustomGame={() => setRoute('custom')}
          onStats={() => setRoute('stats')}
          onSettings={() => setRoute('settings')}
        />
      );
  }
}
