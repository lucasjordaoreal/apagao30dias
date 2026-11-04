> Relatorio inicial preservado como referencia historica. As correcoes e verificacoes posteriores estao em [Continuacao da auditoria de 04/11/2026](AUDITORIA-CONTINUACAO-2026-11-04.md). As pendencias abaixo descrevem o estado anterior a essa continuacao.

# Auditoria de estabilidade — 4 de novembro de 2026

## Escopo e estado inicial

Inspecionados os módulos de dados, mundo/colisões, simulação, renderização Canvas, menus/HUD, áudio, persistência, scripts, testes e workflow. Stack real: JavaScript ESM, Canvas 2D, DOM/CSS e Web Audio; nenhum pacote de execução. Não há Phaser, TypeScript, Vite ou spritesheets externos. Entrada: `index.html` → `src/main.js`. O Git estava limpo, no commit `071103d Initial commit`; alterações desta rodada são da auditoria. Nenhum commit, push ou deploy foi realizado.

**Auditoria parcial com correções implementadas.** A revisão de regras e o build foram executados; a matriz visual e os fluxos reais de navegador desta rodada continuam pendentes por falha do ambiente. Não atribuir aos testes unitários evidência visual ou desempenho de cinco horas.

## Bugs corrigidos

| Gravidade | Local | Problema e causa | Correção | Verificação / resultado |
| --- | --- | --- | --- | --- |
| P1 | `systems/simulation.js`: tarefas | Cozinhar/tratar/construir/trabalhar no prólogo cobrava recursos, mas não avançava a tarefa; a transição descartava a tarefa. | Recusar essas atividades antes de cobrar recursos; ficam disponíveis na sobrevivência. | Nova regressão compara todo o estado antes/depois de seis ações recusadas. Passou. |
| P1 | `systems/simulation.js`: aves; `world.js`: construção | Cada galinheiro atualizava o mesmo plantel global, multiplicando consumo e postura; renderer desenhava as mesmas aves em cada abrigo. | Um abrigo ativo por plantel de quatro aves. Novas construções redundantes são recusadas; saves existentes preservam estruturas, mas apenas o primeiro abrigo simula/desenha o plantel. | Regressão compara estados de aves com um/dois abrigos legados. Passou. Desenho ainda exige inspeção visual. |
| P1 | `main.js`: descarte | Descarte por UID chamava retirada genérica por espécie, que priorizava o lote mais antigo. | Descontar exatamente do lote selecionado. | Regressão descarta o lote novo e confirma preservação do antigo. Passou. |
| P1 | `systems/simulation.js`: transferência | Guardar/recolher restaurava a condição a 100. | Condição acompanha o lote; só fundir lotes com mesma condição/validade. | Transferência de alimento deteriorado em ambos os sentidos preserva condição 20. Passou. |
| P1 | `systems/simulation.js`: escambo | Trocas aceitavam ovos vencidos, embora a venda recusasse validade vencida. | Recusar itens deteriorados ou vencidos antes de qualquer transferência. | Seis ovos vencidos não são trocados nem consumidos pela tentativa. Passou. |
| P1 | `main.js`: relógio | Limite de 250 ms por quadro descartava tempo ativo em FPS baixo. | Usar intervalo ativo completo; retomada reinicia referência temporal. A simulação já subdivide por segundos e limites de dia. | Comparação de passos de 0,5 s e 1/60 s, além dos testes de dia/pausa/vitória. Passou nas regras; FPS real pendente. |
| P1 | `main.js`: persistência | Sair durante autosave ignorava uma nova solicitação; `saved` era copiado do estado global após o await, podendo corresponder a outra partida ou a estado mais novo que o gravado. | Aguardar gravação pendente; capturar estado da solicitação; publicar o snapshot correto; impedir saída pelo menu se a gravação falhar. Importação aguarda gravação pendente. | Revisão de fluxo e sintaxe; teste de persistência passou. Falhas reais/latência do IndexedDB no navegador não foram injetadas nesta rodada. |
| P1 | `save/storage.js`: revisões | Revisão reiniciava em nova campanha, permitindo fallback antigo de revisão maior vencer uma gravação nova. | Revisão monotônica por processo, iniciada pelo relógio de gravação e elevada acima das revisões carregadas. Não afeta tempo do jogo. | Teste existente verifica correspondência da revisão persistida em vez de assumir valor 1. Concorrência entre abas permanece pendente. |
| P1 | `systems/simulation.js`: validação | Condição ausente e `task.total` textual podiam atravessar comparações; `sleeping` independente da tarefa permitia recuperação indevida. | Validar números finitos e derivar sono da tarefa restaurada. | Duas regressões de save passaram. |
| P2 | `world.js`: construção | NaN/fracionários escapavam das comparações; espaçamento do galinheiro dependia da ordem de construção. | Exigir coordenadas inteiras e usar margem simétrica quando qualquer peça é um galinheiro. | Teste de grade passou. |
| P2 | `world.js`, `main.js`: interação | Distância sozinha permitia conversar através de paredes; menu de NPC permanecia ativo depois de ele sair. | Conferir ambiente/obstáculos e alcance; encerrar interação contextual quando o alvo se afasta. | Regressão de NPC do outro lado da parede e distante passou. Fechamento do painel exige teste real. |
| P2 | `scenes/renderer.js`: animação | Animações usavam relógio da página, continuando na pausa e mudando de fase ao carregar. | Usar tempo ativo da partida; limpar interpolação quando o relógio volta; evitar fator negativo na nova campanha. | Sintaxe/build passaram. Inspeção visual pendente. |
| P2 | `main.js`: final | Fechar a tela de final podia deixar o jogador num mundo encerrado sem a tela de resultado. | Fechar em vitória/derrota retorna à tela de resultado. | Revisão do ramo; teste de clique pendente. |
| P2 | `systems/audio.js` | Segundo canto agendado podia iniciar após pausar; conexões de nós não eram explicitamente encerradas. | Verificar estado de ambiente no callback; desconectar oscilador/ganho no término. | Sintaxe/build passaram. Audição e perfil de memória pendentes. |

## Comandos e resultados reais

- `npm install --ignore-scripts --package-lock=false --no-audit --no-fund`: sucesso; sem novas dependências.
- `npm run check`: sucesso em todos os módulos.
- `npm test`: **36 aprovados, zero falhas**. Inclui dez regressões novas e as nove campanhas simuladas já existentes.
- `npm run build`: sucesso, 12 recursos estáticos, cache `38902383325b` na última execução.
- Não existe script de lint; não foi inventado um resultado de lint.
- Testes de caminhos relativos, imports em subdiretório e Service Worker simulado passaram.

As campanhas automatizadas exercitam regras sem todos os trajetos reais; não equivalem a jogar cinco horas. Os testes novos registram cenários específicos das causas encontradas. Não foi mantido um checkout separado para executar as regressões contra o commit anterior; portanto não há alegação de uma execução automatizada vermelha anterior ao patch.

## Navegador e sprites

Foi iniciado um servidor separado em `127.0.0.1:4180`, evitando a origem do save anterior. A ferramenta de navegador não iniciou: `CreateProcessSecurityEnvironment failed (HRESULT = 0x80070020)`. O servidor foi encerrado ao fim da tentativa.

Não houve novas capturas nem inspeção visual concluída nesta auditoria. As resoluções **1920×1080, 1600×900, 1366×768, 1280×720, 1024×768, 800×600, 390×844 e 360×800** precisam ser verificadas nesta revisão. Capturas antigas em `docs/imagens` pertencem à versão anterior.

A arte permanece a original desenhada em código. Não foram substituídos sprites por placeholders. O código conserva `imageSmoothingEnabled=false` e `image-rendering:pixelated`. Escalas não inteiras em certos tamanhos continuam merecendo avaliação; não foi aplicada uma mudança global sem inspeção.

## Problemas e limites restantes

- **P1:** gravações simultâneas em abas diferentes ainda não têm coordenação; validação não é exaustiva para todas as inconsistências entre campos; posição restaurada pode coincidir com obstáculo. Não apagar nem corrigir automaticamente um save sem definir uma estratégia de recuperação.
- **P2:** caches do Service Worker ainda compartilham prefixo entre projetos na mesma origem; revisar isolamento por escopo antes de hospedar várias cópias. Cache simulado passou para um único escopo.
- **P2:** HUD/toolbar são recriados periodicamente, podendo prejudicar foco por teclado e desempenho; falta atualização incremental com testes de foco.
- **P2:** menus de canteiro/galinheiro/reservatório não atualizam todos os números continuamente; renovar valores sem reiniciar scroll/foco.
- **P2:** móveis internos ainda não têm colisões próprias. Cercas/abrigos e circulação das galinhas precisam de inspeção espacial; aves têm movimento visual, sem navegação física individual. Abrigos redundantes de saves antigos continuam no mapa e seus painéis precisam de uma política de migração completa.
- **P2:** memória social de doações não é limitada como a memória de comércio; conservação de alimentos permanece diária e estoque vendido/recomprado pode renovar validade. Venda ainda precisa tratar condição deteriorada independentemente da validade.
- **P2:** áudio ainda tem controle geral; controles separados de ambiente/efeitos e eventual música não foram implementados. Não existe trilha musical completa para auditar.
- Não foi realizado perfil de CPU/memória/FPS em campanha de cinco horas, matriz completa de cliques, nem deploy remoto no GitHub Pages.

Nenhum armazenamento do navegador do usuário foi limpo. Os testes de persistência usam armazenamento simulado dentro do processo Node.
