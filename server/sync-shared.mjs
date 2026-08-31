/**
 * Copia a lógica de jogo pura do app para dentro do servidor.
 *
 * Pontuação, classificações, geração de alvo e desempate PRECISAM ser
 * idênticos nos dois lados. Em vez de manter duas cópias que inevitavelmente
 * divergem, o app continua sendo a fonte de verdade e este script espelha os
 * arquivos aqui antes de cada build. Nunca edite `server/shared/` à mão.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appSrc = join(here, '..', 'src');
const out = join(here, 'shared');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'types'), { recursive: true });
mkdirSync(join(out, 'services'), { recursive: true });
mkdirSync(join(out, 'config'), { recursive: true });
mkdirSync(join(out, 'utils'), { recursive: true });

const files = [
  ['types/game.ts', 'types/game.ts'],
  ['types/online.ts', 'types/online.ts'],
  ['types/storage.ts', 'types/storage.ts'],
  ['services/scoring.ts', 'services/scoring.ts'],
  ['services/target.ts', 'services/target.ts'],
  ['services/random.ts', 'services/random.ts'],
  ['services/ranking.ts', 'services/ranking.ts'],
  ['config/gameConfig.ts', 'config/gameConfig.ts'],
  ['config/strings.ts', 'config/strings.ts'],
  ['utils/time.ts', 'utils/time.ts'],
];

/**
 * O app é empacotado pelo Vite, que resolve imports sem extensão. O Node em
 * modo ESM — que executa o servidor compilado — EXIGE a extensão explícita,
 * senão quebra em produção com ERR_MODULE_NOT_FOUND. Como esta cópia é
 * automática, reescrevemos os caminhos relativos aqui em vez de poluir o
 * código do app com `.js` que o Vite não precisa.
 */
const RELATIVE_IMPORT = /(from\s+["'])(\.[^"']+)(["'])/g;

/** Caminhos que apontam para uma PASTA precisam virar `/index.js`. */
const BARREL_DIRS = new Set(['../types', './types', '../services', '../config', '../utils']);

const addJsExtension = (code) =>
  code.replace(RELATIVE_IMPORT, (match, prefix, path, suffix) => {
    if (path.endsWith('.js') || path.endsWith('.json')) return match;
    const resolved = BARREL_DIRS.has(path) ? path + '/index.js' : path + '.js';
    return prefix + resolved + suffix;
  });

for (const [from, to] of files) {
  const code = readFileSync(join(appSrc, from), 'utf8');
  writeFileSync(join(out, to), addJsExtension(code));
}

// Barrel de tipos sem o storage do navegador.
writeFileSync(
  join(out, 'types', 'index.ts'),
  [
    "export * from './game.js';",
    "export * from './online.js';",
    "export * from './storage.js';",
    '',
  ].join('\n'),
);

console.log(`shared/ sincronizado (${files.length} arquivos)`);
