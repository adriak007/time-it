# Colocar o servidor online no ar

O modo online do Time It! precisa de um servidor para as pessoas se acharem.
Ele é pequeno (um arquivo Node + WebSocket), não usa banco de dados e roda de
graça nos planos gratuitos.

**Tempo estimado: 10 minutos.**

---

## O caminho mais fácil: Render

### 1. Coloque o projeto no GitHub

Se ainda não estiver:

```bash
git init
git add .
git commit -m "Time It!"
```

Crie um repositório em <https://github.com/new> e siga as instruções que
aparecem para enviar (`git remote add ...` + `git push`).

> O arquivo `.env` **não** vai para o GitHub (está no `.gitignore`), e está
> certo assim: cada ambiente tem o seu.

### 2. Crie o serviço no Render

1. Entre em <https://render.com> e crie uma conta (pode usar o GitHub).
2. Clique em **New +** → **Web Service**.
3. Conecte o repositório do Time It!.
4. Preencha assim:

   | Campo | Valor |
   | --- | --- |
   | **Name** | `timeit-server` (ou o que preferir) |
   | **Root Directory** | `server` |
   | **Runtime** | Node |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

5. Clique em **Create Web Service** e espere o build (2-3 min).

Ao terminar, o Render mostra o endereço, algo como:

```
https://timeit-server.onrender.com
```

### 3. Confira se está no ar

Abra esse endereço no navegador. Deve aparecer:

```json
{ "ok": true, "service": "timeit-server", "protocol": 1, "rooms": 0 }
```

Se apareceu, o servidor está funcionando.

### 4. Aponte o app para ele

Na **raiz do projeto** (não em `server/`), edite o arquivo `.env` e troque o
endereço, usando `wss://` no lugar de `https://`:

```properties
VITE_ONLINE_URL=wss://timeit-server.onrender.com
```

> **`wss://`, não `ws://`.** O `wss` é a versão segura, exigida por qualquer
> servidor com HTTPS. Com `ws://` a conexão é bloqueada silenciosamente.
>
> Isso vale em dobro no Android: desde o Android 9 o sistema **bloqueia
> tráfego não criptografado** por padrão. O APK foi mantido assim de
> propósito (é mais seguro), então `ws://` simplesmente não conecta no
> celular — use sempre `wss://`.

### 5. Gere o APK de novo

```bash
npm run android:apk
```

Pronto. O botão **ONLINE** agora funciona de qualquer lugar, e o APK pode ser
instalado nos celulares dos seus amigos.

---

## Sobre o plano gratuito do Render

O serviço **hiberna após 15 minutos sem uso**. A primeira pessoa a abrir uma
sala depois de um tempo parado espera uns **30-50 segundos** enquanto ele
acorda — o app mostra "Conectando..." nesse período. Depois disso fica rápido.

Se isso incomodar, as saídas são:

- **Fly.io** — o plano gratuito não hiberna do mesmo jeito;
- **Render pago** (~US$ 7/mês) — sempre ligado;
- Um serviço de "ping" gratuito (ex.: UptimeRobot) chamando o endereço
  `/health` a cada 10 minutos para manter acordado.

---

## Alternativa: Fly.io

```bash
# 1. Instale o CLI: https://fly.io/docs/hands-on/install-flyctl/
fly auth signup

# 2. Na pasta server/
cd server
fly launch --no-deploy      # aceite as sugestões; NÃO crie banco de dados
fly deploy
```

O endereço será `https://<nome-do-app>.fly.dev`; no `.env` use
`wss://<nome-do-app>.fly.dev`.

---

## Rodar na sua própria máquina (desenvolvimento)

```bash
cd server
npm install
npm run dev      # sobe em http://localhost:8787
```

Com o `.env` da raiz apontando para `ws://localhost:8787`, o jogo aberto no
navegador do PC (`npm run dev`) já joga online contra outra aba.

> Isso **não** funciona no celular: para o aparelho, `localhost` é ele mesmo.
> Para testar no celular pela rede local, use o IP da sua máquina
> (`ws://192.168.0.x:8787`) e garanta que o firewall libera a porta 8787.

---

## Testar o servidor

Há um teste de integração que simula 3 jogadores numa partida completa —
entrada, rodadas, pontuação, reconexão e troca de anfitrião:

```bash
cd server
npm run dev            # em um terminal
node test-match.mjs    # em outro
```

Para testar contra o servidor já hospedado:

```bash
URL=wss://timeit-server.onrender.com node test-match.mjs
```

---

## Como funciona (resumo)

- **O tempo é medido no celular de cada jogador**, com `performance.now()`.
  O servidor recebe só o resultado em milissegundos. Ou seja: internet lenta
  atrasa a espera, mas **nunca** altera a precisão da jogada.
- O servidor é a fonte de verdade do resto: sorteia o alvo, pontua todo mundo
  com a mesma fórmula do modo offline e decide a ordem.
- Salas têm código de 4 letras, morrem sozinhas quando esvaziam e expiram após
  2 horas de inatividade.
- Uma queda de conexão guarda a vaga por 60 segundos e o app tenta voltar
  sozinho; se o anfitrião sair, o comando passa para outra pessoa.
- Não há conta, login ou banco de dados. Nada é guardado depois da partida.

## Estrutura

```
server/
├── src/
│   ├── index.ts       WebSocket, conexões, validação e limites
│   └── room.ts        Sala: jogadores, rodadas, pontuação
├── shared/            Cópia da lógica do app (gerada — não edite)
├── sync-shared.mjs    Espelha a lógica do app para cá
├── test-match.mjs     Teste de integração com 3 jogadores
└── DEPLOY.md
```

A pasta `shared/` é **gerada automaticamente** a partir de `src/` do app antes
de cada build. Isso garante que a pontuação online e a offline nunca divirjam.
