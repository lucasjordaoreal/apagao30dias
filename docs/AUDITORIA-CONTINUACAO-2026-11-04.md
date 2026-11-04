# APAGÃO: 30 DIAS — continuação da auditoria

Data: 4 de novembro de 2026. Referência: [relatório inicial](AUDITORIA.md).

A rodada corrigiu os P1 identificados no relatório e bugs funcionais/visuais P2. A arquitetura continua JavaScript ESM, Canvas 2D, DOM/CSS e Web Audio. Não houve commit, deploy, limpeza de saves ou acesso ao perfil pessoal do navegador. Playwright é dependência de desenvolvimento; não faz parte do jogo distribuído.

## Correções realizadas

| Prioridade | Problema | Correção e evidência |
| --- | --- | --- |
| P1 | Duas abas podiam sobrescrever progresso mais novo; gravação ao fechar ignorava a coordenação | Fila local, revisão e identificador único por gravação; comparação e escrita na mesma transação IndexedDB. Web Locks coordena também o fallback. Removida a gravação direta sem verificação em `pagehide`. Testes reais confirmam um vencedor e rejeição da aba antiga, com e sem Web Locks. |
| P1 | Recuperação frágil e gravação com falha | Leitura independente de principal/fallback/cópias anteriores; seleção da cópia válida mais recente. A transação preserva o registro anterior e guarda o danificado separadamente. Falha de escrita não vira uma gravação alternativa silenciosa. Testes injetam corrupção e QuotaExceededError; progresso anterior permanece íntegro. |
| P1 | Revisão repetida depois de recuperar JSON ilegível | Identificador aleatório acompanha a revisão; uma aba antiga não pode aproveitar a repetição do número para sobrescrever a recuperação. Saves antigos sem esse campo continuam aceitos e o recebem na gravação seguinte. |
| P1 | Dados aninhados inválidos chegavam à execução | Validação de tarefas/receitas/durações, inventários, lotes comerciais, memória social, dieta, animais, clima, serviços, posições, diário e construções sobrepostas. Rejeição de ciclos, profundidade excessiva, chaves especiais e nomes herdados como `toString`. Sono é derivado da tarefa. |
| P1 | Posição carregada dentro de obstáculos | Procura determinística do ponto livre mais próximo no mesmo ambiente; registro no diário, sem modificar o objeto original. Sem ponto seguro, o candidato é recusado e outra cópia pode ser recuperada. Moradores recuperados descartam sua rota antiga. |
| P2 | Foco perdido e valores congelados nos menus | Atualização do DOM preservando controles e scroll; painéis ativos e mapa renovam valores. Teste real confirma volume do reservatório mudando durante chuva sem substituir o botão focado. Tab permanece no diálogo e Espaço ativa botões. |
| P2 | Móveis/cenário atravessáveis e profundidade incoerente | Colisões para móveis, balcões, cerca fixa, bancos, fonte, poço, barracas e postes. Postes, bancos, fonte, poço e barracas entram na ordenação por profundidade. Interpolação de NPCs evita pontos/segmentos bloqueados. Destino interno dos moradores foi ajustado para fora do balcão. |
| P2 | Galinheiro e alvos sólidos difíceis de acessar | Área física do abrigo inclui o cercado; alcance ignora apenas o próprio alvo, preservando outros obstáculos. Impede construir em torno dos pés do jogador. Aves permanecem na área visual do abrigo; estruturas redundantes antigas são preservadas e identificadas como inativas, com desmontagem explícita. |
| P2 | Recorte e sobreposição de interface | Rodapé da tela inicial cabe em 800×600. Avisos não encobrem o direcional móvel nem o botão de interação na resolução desktop menor. Controles de toque ficam ocultos enquanto um menu está aberto. |
| P2 | Câmera e posição da prévia divergiam por arredondamento | Coordenadas da câmera são arredondadas antes de desenhar e de calcular a posição do ponteiro na grade. |
| P2 | Venda/recompra renovava validade e condição | Lotes recebidos de jogadores são rastreados em venda, recompra, escambo, doação, consumo e circulação entre comerciantes. Condição deteriorada impede venda. Memória de doações é limitada. |
| P2 | Comerciante lembrava a quantidade como se fosse o dia | A captura do percurso mostrou “dia 3” após comprar três unidades no dia 1. A extração agora lê o número após “dia”; regressão específica aprovada. |
| P2 | Cache de uma cópia podia apagar o de outra | Prefixo de cache derivado do escopo; consultas limitadas ao próprio cache. Duas cópias sob `/a/` e `/b/` iniciaram partidas offline no mesmo navegador. |
| P2 | Áudio sem controles independentes | Volumes geral, ambiente e efeitos separados e persistidos. Teste verifica canais mudos independentemente e desconexão dos nós finalizados. Não foi feita avaliação auditiva subjetiva. |

A interface pausa a partida em conflito de gravação e oferece exportação e carregamento explícito do progresso recente. Se uma nova partida encontrar armazenamento temporariamente indisponível, ela pode continuar com aviso e exportação; “Salvar agora” permite tentar novamente.

## O que foi realmente testado

- `npm run check`: sintaxe aprovada.
- `npm test`: **50 testes aprovados, zero falhas**, incluindo nove campanhas de regras de 30 dias. Essas campanhas não incluem todos os deslocamentos físicos.
- `npm run test:browser`: **300 ciclos reais de salvar/carregar** em IndexedDB; disputas entre abas; recuperação de cópia anterior; erro de escrita; fallback LocalStorage e rejeição de escritor antigo após recuperação. Também movimento, soltura de tecla, colisão da geladeira, pausa/retomada do Canvas, foco, atualização de reservatório, exportação e nova tentativa de salvar.
- `npm run test:journey`: nova partida, percurso por teclado até caixa e mercado, saque de R$ 1.500, compra de três enlatados e três litros de água, salvar, recarregar e continuar. Saldo final **R$ 1.449**, saldo bancário zero e itens preservados. Sem teletransporte ou concessão de recursos nesse percurso.
- `npm run audit:visual`: capturas de tela inicial, jogo, inventário e mapa nas oito resoluções; cenas adicionais de interior, quintal, mercado e temporal noturno. Capturas foram abertas e examinadas, não apenas geradas. Sem erros de execução registrados.
- Build e produção: recursos relativos, Service Worker, dois escopos independentes na mesma origem e recarga/início de partida sem rede. Não houve publicação remota.
- Ensaio contínuo durante a rodada: **183,416 segundos, 14 salvamentos, 32.460 quadros, zero erros de execução**. Intervalo de quadro p95 de 5,7 ms nesse Edge headless, 15 tarefas longas. Heap observado de 3,39 MB para 5,02 MB; essa amostra curta, sem análise de coleta de lixo, não comprova ausência de vazamento. Refinamentos posteriores receberam regressões específicas e suíte final; o ensaio de três minutos não foi repetido para cada ajuste.

Resoluções: 1920×1080, 1600×900, 1366×768, 1280×720, 1024×768, 800×600, 390×844 e 360×800. Não foram observados estiramento grosseiro dos personagens, pisos encobrindo o protagonista ou sobreposição persistente de HUD nas cenas finais examinadas. Isso não certifica todos os quadros/ângulos possíveis.

## Evidências

- [Tela inicial em 800×600](imagens/auditoria-2026-11-04/800-title.png), [jogo em 800×600](imagens/auditoria-2026-11-04/800-game.png).
- [Controles em 360×800](imagens/auditoria-2026-11-04/360-game.png), [inventário móvel](imagens/auditoria-2026-11-04/360-inventory.png), [mapa móvel](imagens/auditoria-2026-11-04/390-map.png).
- [Interior e personagem](imagens/auditoria-2026-11-04/interior.png), [quintal e aves](imagens/auditoria-2026-11-04/garden.png), [temporal noturno](imagens/auditoria-2026-11-04/night.png).
- [Compras no percurso real](imagens/auditoria-2026-11-04/percurso-mercado.png).
- Resultados: [navegador](imagens/auditoria-2026-11-04/browser-functional.json), [resoluções](imagens/auditoria-2026-11-04/resolucoes.json), [produção](imagens/auditoria-2026-11-04/production.json), [ensaio contínuo](imagens/auditoria-2026-11-04/soak.json), [percurso](imagens/auditoria-2026-11-04/journey.json).

## Ambiente e limites restantes

A ferramenta integrada de navegador voltou a falhar com `CreateProcessSecurityEnvironment / HRESULT 0x80070020`, antes de abrir o jogo. Playwright conseguiu iniciar o Edge instalado através do executor autorizado, usando contextos temporários e origem local de teste. Isso confirma uma alternativa funcional; não determina qual processo/sistema mantém o conflito no inicializador original. Houve também uma interrupção temporária da revisão automática por limite de uso; o trabalho foi retomado após a solicitação do usuário.

Continuam pendentes:

1. Campanha de cinco horas pela interface, perfil longo de CPU/memória e cobertura de todas as combinações de tarefas, eventos, rotas e decisões.
2. Aparelhos de toque físicos e outros motores de navegador. A emulação móvel do Edge valida layout, não ergonomia ou desempenho de hardware móvel.
3. Conservação térmica contínua e idade de todo o estoque original/produção dos comerciantes. A correção preserva os lotes transferidos; o estoque próprio restante ainda é agregado.
4. Navegação e colisão individual entre aves, animações específicas de tarefas e maior variedade de arte/áudio. Aves têm movimento visual confinado, sem física individual completa.
5. Avaliação auditiva subjetiva, trilha musical completa e publicação/verificação em URL remota, fora desta execução.

A validação protege a execução e a coerência dos dados, mas não é um sistema antitrapaça. A recuperação automática dispõe de uma cópia anterior, não de um histórico ilimitado. Ao encerrar o navegador à força, a gravação assíncrona final pode não terminar; o último checkpoint confirmado continua sendo a referência. Exportações seguem disponíveis. Nenhum save existente do usuário foi apagado.
