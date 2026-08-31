# Colocar o servidor online no ar

O modo online do Time It! precisa de um servidor para as pessoas se acharem.
Ele é pequeno (Node + WebSocket), não usa banco de dados e roda de graça.

O código já está no GitHub: <https://github.com/adriak007/time-it>

**Tempo estimado: 5 minutos.**

---

## Passo 1 — Criar o servidor no Render

O repositório já tem um arquivo [`render.yaml`](../render.yaml) com toda a
configuração pronta, então o Render monta tudo sozinho.

1. Entre em <https://dashboard.render.com/blueprints> (crie a conta com o
   GitHub, é grátis e não pede cartão).
2. Clique em **New Blueprint Instance**.
3. Escolha o repositório **`adriak007/time-it`**.
   - Se ele não aparecer, clique em **Configure account** e autorize o Render
     a enxergar seus repositórios.
4. O Render vai mostrar que encontrou o serviço `timeit-server`.
   Clique em **Apply**.

Espere o build (2-3 minutos). Quando o status virar **Live**, o endereço
aparece no topo da página, algo como:

```
https://timeit-server.onrender.com
```

> Se preferir configurar na mão em vez de usar o Blueprint, os valores são:
> Root Directory `server` · Build `npm install && npm run build` ·
> Start `npm start` · Health Check Path `/health` · Plano Free.

## Passo 2 — Conferir se está no ar

Abra o endereço no navegador. Tem que aparecer:

```json
{ "ok": true, "service": "timeit-server", "protocol": 1, "rooms": 0 }
```

Apareceu? O servidor está funcionando.

## Passo 3 — Apontar o jogo para ele

Na **raiz do projeto** (não dentro de `server/`), abra o arquivo `.env` e
troque o endereço. Repare que muda `https` para **`wss`**:

```properties
VITE_ONLINE_URL=wss://timeit-server.onrender.com
```

> ### `wss://`, nunca `ws://`
>
> O `wss` é a versão criptografada. Dois motivos para nunca usar `ws://`:
>
> - o Render serve tudo por HTTPS, e uma página HTTPS não abre conexão
>   insegura;
> - o Android **bloqueia tráfego não criptografado** desde a versão 9. O APK
>   foi mantido assim de propósito, por segurança.
>
> Ou seja: com `ws://` o jogo simplesmente não conecta no celular.

## Passo 4 — Gerar o APK

```bash
npm run android:apk
```

Instale nos celulares e pronto: o botão **ONLINE** funciona de qualquer lugar.

---

## Sobre o plano gratuito

O serviço **hiberna após 15 minutos sem ninguém usando**. Quem abrir a
primeira sala depois de um tempo parado espera uns **30-50 segundos** enquanto
ele acorda (o app mostra "Conectando..."). Depois disso, fica rápido para
todo mundo.

Se isso incomodar:

- **UptimeRobot** (grátis): faz um ping em `https://seu-servidor.onrender.com/health`
  a cada 10 minutos e o servidor nunca dorme. É a solução mais simples.
- **Render pago** (~US$ 7/mês): sempre ligado.
- **Fly.io**: o plano gratuito não hiberna do mesmo jeito.

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

## Rodar na sua máquina (desenvolvimento)

```bash
cd server
npm install
npm run dev      # sobe em http://localhost:8787
```

Com o `.env` da raiz apontando para `ws://localhost:8787`, o jogo aberto no
navegador do PC (`npm run dev`) já joga online contra outra aba.

> Isso **não** funciona no celular: para o aparelho, `localhost` é ele mesmo.
> Para testar no celular pela rede local, use o IP da sua máquina
> (`ws://192.168.0.x:8787`) e libere a porta 8787 no firewall. Como é `ws://`,
> ainda assim o Android vai recusar — para testar no celular, hospede.

---

## Testar o servidor

Teste de integração que simula 3 jogadores numa partida completa — entrada,
recusas, rodadas, pontuação, ranking, reconexão e troca de anfitrião:

```bash
cd server
npm run dev            # em um terminal
node test-match.mjs    # em outro
```

Depois de hospedar, dá para testar o servidor de verdade:

```bash
URL=wss://timeit-server.onrender.com node test-match.mjs
```

---

## Como funciona (resumo)

- **O tempo é medido no celular de cada jogador**, com `performance.now()`.
  O servidor recebe só o resultado em milissegundos. Internet lenta atrasa a
  espera, mas **nunca** altera a precisão da jogada — se o servidor medisse,
  quem tivesse melhor conexão levaria vantagem.
- O servidor é a fonte de verdade do resto: sorteia o alvo (o mesmo para
  todos), pontua com a mesma fórmula do modo offline e define a ordem.
- Salas têm código de 4 letras, somem quando esvaziam e expiram após 2 horas
  de inatividade.
- Uma queda guarda a vaga por 60 segundos e o app tenta voltar sozinho; se o
  anfitrião sai, o comando passa para outra pessoa.
- Não há conta, login nem banco de dados. Nada é guardado depois da partida.

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

A pasta `shared/` é **gerada automaticamente** a partir do `src/` do app antes
de cada build. É isso que garante que a pontuação online e a offline nunca
divirjam.
