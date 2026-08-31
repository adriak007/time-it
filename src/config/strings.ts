/**
 * Todos os textos visíveis do jogo, em um único lugar.
 *
 * Centralizar aqui evita frases soltas pelos componentes e deixa uma futura
 * tradução (ou a volta ao inglês) a uma edição de distância deste arquivo.
 *
 * Regra de escrita: frases curtas e diretas. Durante a partida, quanto menos
 * texto na tela, melhor.
 */
export const T = {
  /* ---------------------------------------------------------------- */
  /* Menu principal                                                    */
  /* ---------------------------------------------------------------- */
  menu: {
    tagline: 'Veja um tempo-alvo, toque para começar e toque de novo quando achar que chegou lá.',
    play: 'JOGAR',
    custom: 'PARTIDA',
    stats: 'NÚMEROS',
    settings: 'AJUSTES',
  },

  /* ---------------------------------------------------------------- */
  /* Comuns                                                            */
  /* ---------------------------------------------------------------- */
  common: {
    back: 'VOLTAR',
    quit: 'SAIR',
    target: 'ALVO',
    seconds: 'SEGUNDOS',
    round: 'RODADA',
    total: 'TOTAL',
    points: 'PONTOS',
    yes: 'SIM',
    cancel: 'CANCELAR',
  },

  /* ---------------------------------------------------------------- */
  /* Partida                                                           */
  /* ---------------------------------------------------------------- */
  game: {
    ready: 'PREPARAR?',
    go: 'JÁ!',
    tapToStart: 'TOQUE PARA\nCOMEÇAR',
    tapToStop: 'TOQUE PARA\nPARAR',
    locked: 'PRONTO',
    void: 'ANULADO',
    yourTime: 'SEU TEMPO',
    early: 'ADIANTOU',
    late: 'ATRASOU',
    exact: 'EXATO',
    nextRound: 'PRÓXIMA RODADA',
    seeResults: 'VER RESULTADO',
    streakBonus: 'DE BÔNUS POR SEQUÊNCIA',
    streak: 'SEGUIDAS',
    interrupted: 'RODADA INTERROMPIDA',
    interruptedBody:
      'O app perdeu o foco enquanto o cronômetro rodava, então essa tentativa foi anulada.',
    retry: 'TENTAR DE NOVO',
  },

  /* ---------------------------------------------------------------- */
  /* Fim de partida                                                    */
  /* ---------------------------------------------------------------- */
  gameOver: {
    soloTitle: 'PARTIDA CONCLUÍDA',
    multiTitle: 'RESULTADO DA PARTIDA',
    draw: 'EMPATE!',
    /** Sufixo do nome do vencedor: "ANA VENCEU!" */
    winsSuffix: 'VENCEU!',
    pointsOver: 'PONTOS EM',
    roundSingular: 'RODADA',
    roundPlural: 'RODADAS',
    bestStreak: 'MELHOR SEQUÊNCIA',
    avgError: 'ERRO MÉDIO',
    playAgain: 'JOGAR DE NOVO',
    newGame: 'NOVA PARTIDA',
    mainMenu: 'MENU PRINCIPAL',
  },

  /* ---------------------------------------------------------------- */
  /* Partida personalizada                                             */
  /* ---------------------------------------------------------------- */
  custom: {
    title: 'PERSONALIZAR',
    players: 'JOGADORES',
    editNames: 'EDITAR NOMES',
    hideNames: 'OCULTAR NOMES',
    minTarget: 'ALVO MÍNIMO',
    maxTarget: 'ALVO MÁXIMO',
    step: 'INTERVALO',
    possibleTargets: 'ALVOS POSSÍVEIS',
    rounds: 'RODADAS',
    start: 'COMEÇAR PARTIDA',
    nameLabel: (n: number) => `Nome do jogador ${n}`,
    minAria: 'Tempo-alvo mínimo',
    maxAria: 'Tempo-alvo máximo',
  },

  /* ---------------------------------------------------------------- */
  /* Estatísticas                                                      */
  /* ---------------------------------------------------------------- */
  stats: {
    title: 'ESTATÍSTICAS',
    gamesPlayed: 'PARTIDAS',
    roundsPlayed: 'RODADAS',
    averageError: 'ERRO MÉDIO',
    bestAttempt: 'MELHOR TENTATIVA',
    perfectHits: 'ACERTOS PERFEITOS',
    bestScore: 'MAIOR PONTUAÇÃO',
    longestStreak: 'MAIOR SEQUÊNCIA',
    attempts: 'TENTATIVAS',
    tendency: 'TENDÊNCIA',
    tendencyEmpty: 'Jogue uma rodada para ver sua tendência.',
    early: 'ADIANTOU',
    late: 'ATRASOU',
    reset: 'ZERAR ESTATÍSTICAS',
    resetConfirm: 'Zerar todas as estatísticas?',
    resetWarning: 'Isso não pode ser desfeito.',
    resetYes: 'SIM, ZERAR',
  },

  /* ---------------------------------------------------------------- */
  /* Ajustes                                                           */
  /* ---------------------------------------------------------------- */
  settings: {
    title: 'AJUSTES',
    sound: 'SOM',
    music: 'MÚSICA',
    haptics: 'VIBRAÇÃO',
    hapticsHint: 'Vibra ao tocar e ao acertar em cheio',
    reduceMotion: 'REDUZIR ANIMAÇÕES',
    reduceMotionHint: 'Menos movimento, resultado imediato',
    highContrast: 'ALTO CONTRASTE',
    highContrastHint: 'Mais contraste para facilitar a leitura',
    replayTutorial: 'VER TUTORIAL DE NOVO',
    about: 'SOBRE',
    aboutTech:
      'Feito com React, TypeScript, Vite e Tailwind CSS. Os efeitos sonoros são gerados pela Web Audio API. Funciona totalmente offline — sem conta, sem rastreamento e sem anúncios.',
  },

  /* ---------------------------------------------------------------- */
  /* Tutorial                                                          */
  /* ---------------------------------------------------------------- */
  tutorial: {
    slides: [
      {
        kicker: 'VEJA O TEMPO',
        headline: '3.20s',
        body: 'Cada rodada te dá um tempo-alvo.',
        accent: true,
      },
      {
        kicker: 'TOQUE PARA COMEÇAR',
        headline: 'TOQUE',
        body: 'Seu cronômetro começa no instante em que você encosta no botão.',
        accent: false,
      },
      {
        kicker: 'CONTE DE CABEÇA',
        headline: 'SEM PISTAS',
        body: 'Sem cronômetro. Sem barra. Sem tique-taque. Só você.',
        accent: false,
      },
      {
        kicker: 'TOQUE PARA PARAR',
        headline: 'CHEGOU PERTO?',
        body: 'Chegue o mais perto que conseguir do alvo.',
        accent: true,
      },
    ],
    next: 'PRÓXIMO',
    start: 'BORA JOGAR',
    skip: 'PULAR',
  },

  /* ---------------------------------------------------------------- */
  /* Online                                                            */
  /* ---------------------------------------------------------------- */
  online: {
    title: 'JOGAR ONLINE',
    menuButton: 'JOGAR COM AMIGOS',
    yourName: 'SEU NOME',
    namePlaceholder: 'Seu apelido',
    create: 'CRIAR SALA',
    join: 'ENTRAR NA SALA',
    codeLabel: 'CÓDIGO DA SALA',
    codePlaceholder: 'ABCD',
    enter: 'ENTRAR',
    lobby: 'SALA',
    share: 'CONVIDAR',
    shareCopied: 'Código copiado!',
    shareText: (code: string) =>
      `Bora jogar Time It!? Entre na sala ${code} e vamos ver quem tem a melhor noção de tempo.`,
    waiting: 'Esperando os jogadores...',
    waitingOthers: 'Aguardando os outros...',
    youLabel: 'VOCÊ',
    hostLabel: 'ANFITRIÃO',
    offline: 'CAIU',
    reconnecting: 'Reconectando...',
    connecting: 'Conectando...',
    startMatch: 'COMEÇAR',
    onlyHostStarts: 'Só o anfitrião pode começar',
    needPlayers: 'Chame pelo menos mais uma pessoa',
    leaveRoom: 'SAIR DA SALA',
    roomFull: 'Sala cheia (4 jogadores)',
    /* Aviso quando o servidor ainda não foi configurado. */
    notConfigured: 'SERVIDOR NÃO CONFIGURADO',
    notConfiguredBody:
      'O modo online precisa de um servidor. Veja server/DEPLOY.md para colocar o seu no ar em poucos minutos — é gratuito.',
    connectionLost: 'Conexão perdida',
    backToMenu: 'VOLTAR AO MENU',
    playersCount: (n: number) => `${n}/4 JOGADORES`,
  },

  /* ---------------------------------------------------------------- */
  /* Acessibilidade (leitores de tela)                                 */
  /* ---------------------------------------------------------------- */
  a11y: {
    quitMatch: 'Sair da partida',
  },
} as const;

/** Nome padrão de jogador: "JOGADOR 1". */
export const PLAYER_LABEL = 'JOGADOR';
