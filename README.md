# Time It!

**A game about trusting your sense of time.**

You are shown a target time — say `3.20s`. You tap to start, count it out in your
head, and tap again when you think you have hit it. There is no timer on screen,
no progress bar, no ticking. Just your own sense of time against the clock.

> See a target time, tap to start, and tap again when you think you've hit it.

Up to **four people can play on one device at the same time**, each with their own
button and their own independent timer — put a phone or tablet on the table and
everyone taps at once.

---

## Table of contents

- [Features](#features)
- [Stack](#stack)
- [Installation](#installation)
- [Running the web app](#running-the-web-app)
- [Building for the web](#building-for-the-web)
- [PWA](#pwa)
- [Online multiplayer](#online-multiplayer)
- [Android](#android)
- [Generating an APK](#generating-an-apk)
- [Project structure](#project-structure)
- [How the game works](#how-the-game-works)
- [Customising](#customising)
- [Tests](#tests)

---

## Features

- **Solo and local multiplayer** for 1–4 players on a single device, with real
  multitouch — four people can press simultaneously without interfering.
- **Online multiplayer** for 2–4 players: create a room, share the 4-letter
  code, and play from anywhere. Reconnects on its own after a dropped signal.
- **High-precision timing** built on `performance.now()`, measured at the moment
  of physical contact.
- **No timing cues, ever.** While an attempt is running, nothing on screen,
  in audio, or in haptics reveals how much time has passed.
- **Quick Play** for an instant match, **Custom Game** for full control of
  players, target range, step and round count (including Endless).
- Smooth **0–1000 point scoring** that accounts for target length, plus ratings
  from `WAY OFF!` to `IMPOSSIBLE!`, streaks, round rankings and tiebreaks.
- **Local stats** — average error, best attempt, perfect hits, longest streak,
  and your early/late bias.
- **Plays completely offline** (modos solo e local). O online é opcional e
  precisa de um servidor próprio. Sem conta, sem anúncios, sem rastreamento.
- Installable as a **PWA** and shippable as an **Android APK/AAB**.
- Accessibility: keyboard play, reduce-motion, high-contrast, large touch
  targets and ARIA labelling throughout.

---

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (design tokens via `@theme`) |
| Native shell | Capacitor 8 (Android) |
| Offline | `vite-plugin-pwa` (Workbox) |
| Tests | Vitest |
| Audio | Web Audio API (synthesised — no asset files needed) |
| Storage | `localStorage` |
| Online | Node + `ws` (WebSocket), em `server/` |
| Idioma | Português (pt-BR), centralizado em `src/config/strings.ts` |
| Fonte | Nunito (arredondada), via Google Fonts com fallback do sistema |

No backend, no state-management library, no UI kit.

---

## Installation

Requires **Node.js 20+**.

```bash
npm install
```

## Running the web app

```bash
npm run dev
```

Then open the printed URL (default <http://localhost:5173>).

## Building for the web

```bash
npm run build     # type-checks, then builds to dist/
npm run preview   # serve the production build locally
```

The output in `dist/` is fully static and can be hosted anywhere.

---

## PWA

The production build emits a web manifest and a service worker that precaches
the entire game, so it runs offline after the first load.

To install it: open the built site and use your browser's **Install app** /
**Add to Home Screen** option. It launches standalone, with no browser chrome.

> The service worker is only active in a production build (`npm run build` +
> `npm run preview`), not in `npm run dev`.

---

## Online multiplayer

Dois a quatro jogadores, cada um no seu celular, em qualquer lugar. Quem cria a
sala recebe um código de 4 letras (ex.: `BUCK`) e os outros entram com ele.

**O modo online precisa de um servidor.** Ele está pronto em [`server/`](server/)
e o repositório já traz um [`render.yaml`](render.yaml): no Render basta criar
um *Blueprint* apontando para este repo e clicar em Apply. Passo a passo
completo em [`server/DEPLOY.md`](server/DEPLOY.md) — leva ~5 minutos e é
gratuito.

Enquanto não houver servidor configurado, o botão ONLINE mostra um aviso
explicando o que falta, em vez de tentar uma conexão que não vai completar.

### Como o timing funciona online

Esta é a decisão de projeto mais importante do modo online:

> **O tempo é medido no aparelho de cada jogador**, com `performance.now()`.
> A rede transporta apenas o resultado, em milissegundos.

Uma conexão ruim atrasa a exibição do resultado, mas **nunca** altera a
precisão da jogada. Se o tempo fosse medido no servidor, quem tivesse melhor
internet levaria vantagem — o que arruinaria um jogo sobre precisão.

O servidor cuida do resto: sorteia o alvo (o mesmo para todos), pontua com a
mesma fórmula do modo offline e define a ordem.

### Configuração

Depois de hospedar (veja [`server/DEPLOY.md`](server/DEPLOY.md)), aponte o
jogo para o servidor com um comando:

```bash
npm run set-server https://timeit-server.onrender.com
npm run android:apk
```

O script converte o endereço para `wss://`, **verifica se o servidor responde
antes de gravar** e recusa endereços inseguros — o Android bloqueia tráfego
não criptografado desde a versão 9, então `ws://` não conecta no celular.

Para voltar ao servidor local: `npm run set-server local`.

### Rodar o servidor localmente

```bash
npm run server        # sobe o servidor em localhost:8787
npm run server:test   # teste de integração com 3 jogadores
```

### Testes do servidor

```bash
cd server
npm run dev            # em um terminal
node test-match.mjs    # em outro — 3 jogadores, partida completa
```

Cobre entrada e recusa (sala cheia, nome repetido, protocolo antigo), rodadas,
pontuação, ranking, reconexão e transferência de anfitrião.

---

## Android

The Android project lives in [`android/`](android/) and is already configured:

| Setting | Value |
| --- | --- |
| App name | Time It! |
| Package / App ID | `com.timeit.game` |
| Version | `1.0.0` (`versionCode 1`) |
| Min SDK | 24 |
| Target SDK | 36 |

Icons, splash screens, the dark immersive theme and edge-to-edge display are all
set up. Haptics use the native Capacitor plugin, falling back to
`navigator.vibrate` on the web.

Sync the latest web build into the native project:

```bash
npm run android:sync    # npm run build && npx cap sync android
npm run android:open    # open the project in Android Studio
```

### Generating an APK

**Prerequisites:** JDK 17+ and the Android SDK. If the SDK is not auto-detected,
point `android/local.properties` at it:

```properties
sdk.dir=C:\\Users\\you\\AppData\\Local\\Android\\Sdk
```

**Debug APK** (installable immediately, for testing):

```bash
npm run android:apk
```

Or manually:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Install it on a connected device or emulator:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Release APK / AAB** (for distribution). First create a keystore once:

```bash
keytool -genkey -v -keystore timeit-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias timeit
```

Add the credentials to `android/keystore.properties` (do not commit this file):

```properties
storeFile=../timeit-release.jks
storePassword=<your password>
keyAlias=timeit
keyPassword=<your password>
```

Then reference it from a `signingConfigs` block in `android/app/build.gradle`
and build:

```bash
cd android
./gradlew assembleRelease     # APK  -> app/build/outputs/apk/release/
./gradlew bundleRelease       # AAB  -> app/build/outputs/bundle/release/
```

The `.aab` is what Google Play expects.

---

## Project structure

```
src/
├── components/          Reusable UI
│   ├── TapButton.tsx      The main button: pointer handling + visual states
│   ├── Arena.tsx          Per-player-count tap-zone layouts
│   ├── RoundIntro.tsx     Target announcement and 3-2-1-GO countdown
│   ├── SoloResult.tsx     Staged single-player reveal
│   ├── RoundResults.tsx   Multiplayer round ranking + running totals
│   ├── Splash.tsx         Cold-start splash
│   └── ui.tsx             Buttons, cards, wordmark, confetti, primitives
├── pages/               One component per screen
│   ├── MenuPage.tsx  CustomGamePage.tsx  GamePage.tsx
│   ├── GameOverPage.tsx  StatsPage.tsx  SettingsPage.tsx  TutorialPage.tsx
├── game/
│   └── session.ts       Session/round/attempt state machine (pure)
├── services/
│   ├── scoring.ts       Scoring formula, ratings, streaks  (documented)
│   ├── target.ts        Target generation on an integer-ms grid
│   ├── ranking.ts       Round ranking, standings, tiebreaks
│   ├── storage.ts       Guarded localStorage persistence
│   ├── audio.ts         Web Audio cue engine
│   ├── haptics.ts       Capacitor + web vibration
│   ├── random.ts        Swappable RNG (seedable, for a future daily challenge)
│   └── native.ts        Capacitor status bar / splash setup
├── hooks/
│   ├── useAttemptTimer.ts   High-precision, per-player timers
│   ├── usePersistedState.ts Settings, stats, names, last config
│   ├── useVisibilityGuard.ts Voids an attempt if the app is backgrounded
│   └── useOrientation.ts
├── config/gameConfig.ts  Every tunable value in one place
├── types/                Domain types
├── utils/time.ts         Formatting and ms/second conversion
└── styles/index.css      Design tokens, base styles, animations
```

---

## How the game works

### Timing

All timing uses `performance.now()`, a monotonic clock unaffected by system
clock changes. The timestamp is captured inside the `pointerdown` handler
**before** any state update or animation, so rendering never inflates a
measurement.

While an attempt is running, **React does no work at all** — the start time
lives in a ref, not in state. This protects precision and guarantees no elapsed
value can leak into the DOM.

Every value is stored as **integer milliseconds**; seconds exist only at the
presentation boundary. That keeps a `0.15s` step exactly `150ms` and avoids
floating-point drift entirely.

### Multitouch

Each tap zone tracks its own `pointerId`. There is no shared "pressed" state
anywhere in the tree, so four simultaneous presses are fully independent.
`touch-action: none` stops scroll and zoom gestures from stealing a press.

### Scoring

Score is `0–1000`, smooth rather than bucketed, and blends two views of the
same error so that short targets stay fair:

```
eAbs  = |error| / 2000ms                  absolute error
eRel  = (|error| / target) / 0.5          error relative to target length
e     = 0.70 * eAbs + 0.30 * eRel
score = 1000 * (1 - min(e, 1))^1.6
```

Actual values (verified in `src/services/__tests__/scoring.test.ts`):

| error → | 10ms | 50ms | 100ms | 200ms | 500ms | 1000ms |
| --- | --- | --- | --- | --- | --- | --- |
| 0.50s target | 975 | 879 | 764 | 552 | 92 | 0 |
| 1.00s target | 985 | 925 | 852 | 714 | 357 | 8 |
| 5.00s target | 992 | 963 | 926 | 854 | 651 | 362 |
| 20.0s target | 994 | 970 | 940 | 881 | 714 | 465 |

A perfect stop always scores exactly 1000. Being 200ms off is worth 552 points
on a half-second target but 881 on a twenty-second one — the same absolute miss
is a much worse read of time when the target is short.

Attempts within **100ms** extend a streak, worth a small capped bonus
(25 points per level, maximum 150) so momentum feels good without deciding a
match on its own. The bonus is added *on top of* the attempt score rather than
folded into it, so the rated score for a single stop always stays within 0-1000.

### Fair play

If the app is backgrounded while a timer is running, that attempt is voided and
the round can be retried — you cannot switch away, use another clock, and come
back with a perfect answer.

---

## Customising

Almost everything lives in **[`src/config/gameConfig.ts`](src/config/gameConfig.ts)**:
target ranges and step options, rating thresholds, the scoring constants, streak
rules, animation and haptic durations, player accent colours, and the game
version.

### Changing the text / language

Every visible string lives in **[`src/config/strings.ts`](src/config/strings.ts)**
(plus the rating labels in `gameConfig.ts`). Translating the game — or changing
a single label — is one edit in that file; no component holds literal copy.
The unit tests assert behaviour rather than wording, so they survive a
re-translation.

### Changing the colours

Design tokens are defined in the `@theme` block at the top of
[`src/styles/index.css`](src/styles/index.css). The game ships with a **white,
hypercasual look**; change `--color-brand` and the whole game follows.
Per-player accents live in `PLAYER_ACCENTS` in the config.

**The 3D buttons.** Buttons are built as two stacked layers, not with a drop
shadow: a coloured "wall" (`--color-*-deep`) sits behind the face, and pressing
translates the face down onto it. The block keeps a constant height, so nothing
in the layout shifts when a button is pressed. Any new button colour therefore
needs a matching `-deep` token. `--lift-lg/md/sm` control the thickness.

One constraint that is easy to trip over: a `var(--x)` cannot be concatenated
with a hex opacity suffix (`` `${color}1f` `` produces invalid CSS and the rule
is silently dropped). Use `color-mix(in srgb, var(--x) 14%, transparent)`.

If you switch to a dark palette, remember to also update the native shell so it
matches: `android/app/src/main/res/values/colors.xml`, the
`windowLightStatusBar` / `windowLightNavigationBar` flags in `styles.xml`,
`StatusBar.setStyle` in `src/services/native.ts`, and `theme_color` in both
`index.html` and `vite.config.ts`.

### Replacing the sounds

Sound effects are currently **synthesised at runtime** with the Web Audio API,
so the game ships with no audio files. To use real audio, drop files in
`public/sounds/` and map the cues in
[`src/services/audio.ts`](src/services/audio.ts):

```ts
export const SOUND_SOURCES: Partial<Record<SoundCue, string>> = {
  tap: '/sounds/tap.ogg',
  perfect: '/sounds/perfect.ogg',
};
```

Any cue with a file uses it; the rest keep the synthesised version. No other
code changes are needed.

> One rule: never add a repeating or rhythmic sound while a timer is running —
> it would let players count along.

### Changing the version

Update `GAME_VERSION` in `src/config/gameConfig.ts`, `version` in
`package.json`, and `versionName` / `versionCode` in `android/app/build.gradle`.

---

## Tests

```bash
npm test          # run once
npm run test:watch
```

Covers target generation and step validation, time formatting, difference and
direction, the scoring curve and its documented values, rating thresholds,
streaks, ranking with all three tiebreak levels, and the session state machine.

```bash
npm run typecheck   # tsc, strict
npm run lint
```

---

## Licence

Unlicensed / private project.
