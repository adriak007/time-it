/**
 * Teste de integração do servidor: simula 3 jogadores reais numa partida
 * completa, com WebSockets de verdade. Não é mock — é o servidor rodando.
 *
 *   node test-match.mjs
 */
import { WebSocket } from 'ws';

const URL = process.env.URL ?? 'ws://localhost:8787';
const PROTOCOL = 1;
const log = (...a) => console.log(...a);
const fails = [];
const check = (cond, label) => {
  if (cond) log(`  ✓ ${label}`);
  else {
    fails.push(label);
    log(`  ✗ FALHOU: ${label}`);
  }
};

/** Cliente mínimo que espelha o que o app fará. */
class Player {
  constructor(name) {
    this.name = name;
    this.state = null;
    this.playerId = null;
    this.token = null;
    this.errors = [];
    this.waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'joined') {
          this.playerId = msg.playerId;
          this.token = msg.token;
          this.state = msg.state;
        } else if (msg.type === 'state') {
          this.state = msg.state;
        } else if (msg.type === 'error') {
          this.errors.push(msg);
        }
        this.waiters = this.waiters.filter((w) => !w(msg));
      });
    });
  }

  send(msg) {
    this.ws.send(JSON.stringify(msg));
  }

  /** Espera até `predicate(msg)` ser verdadeiro, ou estourar o tempo. */
  until(predicate, ms = 12000, label = 'condição') {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timeout esperando ${label}`)),
        ms,
      );
      const waiter = (msg) => {
        if (!predicate(msg, this.state)) return false;
        clearTimeout(timer);
        resolve(this.state);
        return true;
      };
      this.waiters.push(waiter);
      // Talvez a condição já esteja satisfeita.
      if (predicate({ type: 'noop' }, this.state)) {
        clearTimeout(timer);
        this.waiters = this.waiters.filter((w) => w !== waiter);
        resolve(this.state);
      }
    });
  }

  close() {
    this.ws?.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ================================================================== */

log('\n=== 1. Criar sala e entrar ===');
const ana = new Player('ANA');
const bruno = new Player('BRUNO');
const caio = new Player('CAIO');

await ana.connect();
await bruno.connect();
await caio.connect();

ana.send({
  type: 'create',
  name: 'ANA',
  protocol: PROTOCOL,
  config: {
    players: 1,
    playerNames: ['ANA'],
    minTargetMs: 1000,
    maxTargetMs: 5000,
    stepMs: 100,
    rounds: 3,
  },
});
await ana.until((m) => m.type === 'joined', 5000, 'ANA criar');
const code = ana.state.code;
check(/^[A-Z]{4}$/.test(code), `código de sala tem 4 letras (${code})`);
check(ana.playerId === 1, 'quem cria vira jogador 1');
check(ana.state.players[0].isHost, 'quem cria é o anfitrião');

bruno.send({ type: 'join', code, name: 'BRUNO', protocol: PROTOCOL });
await bruno.until((m) => m.type === 'joined', 5000, 'BRUNO entrar');
caio.send({ type: 'join', code, name: 'CAIO', protocol: PROTOCOL });
await caio.until((m) => m.type === 'joined', 5000, 'CAIO entrar');

await ana.until((_, s) => s?.players.length === 3, 5000, 'ANA ver 3 jogadores');
check(ana.state.players.length === 3, 'anfitrião vê os 3 jogadores');
check(bruno.playerId === 2 && caio.playerId === 3, 'ids atribuídos em ordem');
check(!bruno.state.players[1].isHost, 'quem entra não é anfitrião');

log('\n=== 2. Regras de entrada ===');
const intruso = new Player('X');
await intruso.connect();
intruso.send({ type: 'join', code: 'ZZZZ', name: 'X', protocol: PROTOCOL });
await intruso.until((m) => m.type === 'error', 5000, 'erro de sala inexistente');
check(intruso.errors[0]?.code === 'room_not_found', 'sala inexistente é recusada');

intruso.errors = [];
intruso.send({ type: 'join', code, name: 'ANA', protocol: PROTOCOL });
await intruso.until((m) => m.type === 'error', 5000, 'erro de nome repetido');
check(intruso.errors[0]?.code === 'name_taken', 'nome repetido é recusado');

intruso.errors = [];
intruso.send({ type: 'join', code, name: 'DUDA', protocol: 999 });
await intruso.until((m) => m.type === 'error', 5000, 'erro de protocolo');
check(intruso.errors[0]?.code === 'bad_protocol', 'protocolo incompatível é recusado');

log('\n=== 3. Só o anfitrião comanda ===');
bruno.errors = [];
bruno.send({ type: 'start' });
await bruno.until((m) => m.type === 'error', 5000, 'erro de não-anfitrião');
check(bruno.errors[0]?.code === 'not_host', 'convidado não pode iniciar a partida');

log('\n=== 4. Partida: 3 rodadas ===');
ana.send({ type: 'start' });
await ana.until((_, s) => s?.phase === 'round_intro', 5000, 'intro da rodada');
check(ana.state.phase === 'round_intro', 'partida entra na intro');
check(typeof ana.state.targetMs === 'number', 'alvo é definido');
check(ana.state.startsAt > Date.now(), 'largada é agendada no futuro');
await bruno.until((_, s) => s?.phase === 'round_intro', 5000, 'BRUNO ver a intro');
check(
  bruno.state.targetMs === ana.state.targetMs,
  `todos recebem exatamente o mesmo alvo (${ana.state.targetMs})`,
);

for (let round = 1; round <= 3; round += 1) {
  await ana.until((_, s) => s?.phase === 'playing', 10000, `rodada ${round} liberar`);
  check(ana.state.phase === 'playing', `rodada ${round}: botões liberados`);

  const target = ana.state.targetMs;
  // Cada um "erra" um tanto diferente, para checar a ordenação.
  ana.send({ type: 'attempt', elapsedMs: target + 40 });
  await bruno.until((_, s) => s?.submitted.length === 1, 5000, 'ver 1 envio');
  check(bruno.state.submitted.includes(1), 'os outros veem quem já jogou');
  check(bruno.state.phase === 'playing', 'rodada continua até todos jogarem');

  bruno.send({ type: 'attempt', elapsedMs: target - 300 });
  caio.send({ type: 'attempt', elapsedMs: target + 1200 });

  await ana.until((_, s) => s?.phase === 'round_results', 8000, 'resultados');
  const r = ana.state.results;
  check(r.length === 3, `rodada ${round}: 3 resultados`);
  check(r[0].playerId === 1, 'quem chegou mais perto fica em primeiro');
  check(r[0].absErrorMs < r[1].absErrorMs, 'ordenado por proximidade');
  check(r[0].direction === 'late', 'direção correta (atrasou)');
  check(r[1].direction === 'early', 'direção correta (adiantou)');
  check(r[0].totalPoints > r[2].totalPoints, 'quem errou menos pontua mais');

  // Espera o broadcast chegar no BRUNO antes de comparar: sem isso o teste
  // leria o estado anterior dele e acusaria uma divergência inexistente.
  await bruno.until((_, s) => s?.phase === 'round_results', 8000, 'BRUNO ver resultados');
  const sameResults =
    JSON.stringify(bruno.state.results) === JSON.stringify(ana.state.results);
  check(sameResults, 'todos veem exatamente o mesmo resultado');

  if (round < 3) {
    ana.send({ type: 'next' });
    await ana.until((_, s) => s?.roundIndex === round, 8000, 'próxima rodada');
    check(ana.state.roundIndex === round, `avançou para a rodada ${round + 1}`);
  }
}

log('\n=== 5. Fim de partida ===');
ana.send({ type: 'next' });
await ana.until((_, s) => s?.phase === 'game_over', 8000, 'fim de jogo');
check(ana.state.phase === 'game_over', 'partida termina após a última rodada');
const totals = ana.state.players.map((p) => p.totalScore);
check(totals.every((t) => t > 0), 'todos somaram pontos');
check(
  ana.state.players[0].totalScore > ana.state.players[2].totalScore,
  'placar reflete a precisão',
);

log('\n=== 6. Jogar de novo ===');
ana.send({ type: 'playAgain' });
await ana.until((_, s) => s?.phase === 'lobby', 5000, 'voltar ao lobby');
check(ana.state.phase === 'lobby', 'volta para o lobby');
check(ana.state.players.length === 3, 'mantém os jogadores');
check(ana.state.targetMs === null, 'alvo é escondido no lobby');

log('\n=== 7. Reconexão ===');
const brunoToken = bruno.token;
bruno.close();
await sleep(500);
await ana.until((_, s) => s?.players.some((p) => !p.connected), 5000, 'ver desconexão');
check(
  ana.state.players.find((p) => p.id === 2)?.connected === false,
  'queda é sinalizada aos outros',
);
check(ana.state.players.length === 3, 'a vaga é guardada durante a queda');

const bruno2 = new Player('BRUNO');
await bruno2.connect();
bruno2.send({ type: 'resume', code, token: brunoToken, protocol: PROTOCOL });
await bruno2.until((m) => m.type === 'joined', 5000, 'reconectar');
check(bruno2.playerId === 2, 'volta com o mesmo id de jogador');
await ana.until((_, s) => s?.players.every((p) => p.connected), 5000, 'todos online');
check(ana.state.players.every((p) => p.connected), 'reconexão é vista por todos');

log('\n=== 8. Sair da sala ===');
caio.send({ type: 'leave' });
await ana.until((_, s) => s?.players.length === 2, 5000, 'ver saída');
check(ana.state.players.length === 2, 'sair remove o jogador');

ana.send({ type: 'leave' });
await bruno2.until((_, s) => s?.players.length === 1, 5000, 'anfitrião sai');
check(bruno2.state.players[0].isHost, 'o comando passa para quem ficou');

[ana, bruno2, caio, intruso].forEach((p) => p.close());
await sleep(300);

log('\n========================================');
if (fails.length === 0) {
  log('TODOS OS TESTES PASSARAM');
} else {
  log(`${fails.length} FALHA(S):`);
  fails.forEach((f) => log(`  - ${f}`));
}
log('========================================\n');
process.exit(fails.length === 0 ? 0 : 1);
