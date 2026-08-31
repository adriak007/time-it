/**
 * Aponta o jogo para o servidor online e valida o endereço.
 *
 *   npm run set-server https://timeit-server.onrender.com
 *   npm run set-server wss://timeit-server.onrender.com
 *
 * Aceita as duas formas e grava sempre em `wss://`, que é o que funciona no
 * Android. Antes de gravar, checa se o servidor está mesmo no ar — assim um
 * endereço com erro de digitação é pego agora, e não depois de gerar o APK.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');

const input = process.argv[2];

if (!input) {
  console.error(`
Falta o endereço do servidor.

  npm run set-server https://timeit-server.onrender.com

Para voltar ao servidor local (desenvolvimento):

  npm run set-server local
`);
  process.exit(1);
}

/** Normaliza qualquer forma de entrada para o wss:// que o app precisa. */
const normalize = (raw) => {
  const value = raw.trim().replace(/\/+$/, '');
  if (value === 'local') return 'ws://localhost:8787';
  if (value.startsWith('wss://') || value.startsWith('ws://')) return value;
  if (value.startsWith('https://')) return value.replace(/^https:/, 'wss:');
  if (value.startsWith('http://')) return value.replace(/^http:/, 'ws:');
  return `wss://${value}`;
};

const url = normalize(input);
const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

if (url.startsWith('ws://') && !isLocal) {
  console.error(`
ATENÇÃO: "${url}" usa ws:// (sem criptografia).

O Android bloqueia tráfego não criptografado, então o jogo não vai conectar
no celular. Use wss:// no lugar.
`);
  process.exit(1);
}

/* Confere se o servidor responde antes de gravar. */
const healthUrl = url.replace(/^ws/, 'http') + '/health';
process.stdout.write(`Checando ${healthUrl} ... `);

try {
  const res = await fetch(healthUrl, { signal: AbortSignal.timeout(60_000) });
  const body = await res.json();
  if (body?.ok && body?.service === 'timeit-server') {
    console.log(`ok (protocolo v${body.protocol}, ${body.rooms} sala(s))`);
  } else {
    console.log('respondeu, mas não parece o servidor do Time It!');
    console.log('Resposta:', JSON.stringify(body).slice(0, 120));
  }
} catch (error) {
  console.log('sem resposta');
  console.log(`
O servidor não respondeu. Isso pode ser:
  - endereço digitado errado;
  - o serviço ainda está subindo (espere e tente de novo);
  - no plano gratuito do Render, ele hiberna e demora ~40s para acordar.

Motivo: ${error instanceof Error ? error.message : String(error)}
`);
  if (!isLocal) {
    console.log('O endereço NÃO foi gravado. Confira e rode de novo.');
    process.exit(1);
  }
}

/* Grava preservando o resto do arquivo, se já existir. */
const line = `VITE_ONLINE_URL=${url}`;
let content;

if (existsSync(envPath)) {
  const current = readFileSync(envPath, 'utf8');
  content = current.match(/^VITE_ONLINE_URL=.*$/m)
    ? current.replace(/^VITE_ONLINE_URL=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`;
} else {
  content = `# Endereço do servidor de partidas online.\n${line}\n`;
}

writeFileSync(envPath, content.endsWith('\n') ? content : `${content}\n`);

console.log(`
Pronto! O jogo agora aponta para:

  ${url}

Próximo passo — gerar o APK com esse endereço embutido:

  npm run android:apk
`);
