# Verificação do incremento 0.1

## Resultado automatizado

`npm run check` passou. `npm test` passou com **61 testes**, sem falhas. `npm run build` gera `dist/` com caminhos relativos e Service Worker versionado por conteúdo.

Cobertura de regras:

- Prólogo de exatamente 30 segundos e transição sem compras.
- Saques válidos, bloqueio digital posterior, conservação de dinheiro, estoque/caixa finitos e rejeição de quantidades inválidas.
- Compras sem dinheiro/capacidade, vendas sem caixa e transferência bilateral no escambo.
- Necessidades, consumo finito, distinção de água, tratamento/cocção com insumos e tempo.
- Dia de 600 segundos ativos, pausa, sono sem salto, morte e vitória no limite correto.
- Crescimento de plantas, colheita por estágio, abrigo/cuidados/produção de ovos, captação somente com chuva e capacidade finita.
- Construção atrasada até o fim do trabalho, materiais consumidos, sobreposição e armazenamento sem duplicação.
- Trabalho pago a partir de caixa comunitário, rotinas/caminhos de NPCs, determinismo por semente e desistência de visitante diante da tranca.
- Save/JSON, fallback sem IndexedDB, preservação de validade/estado e recusa de dados/tarefas adulterados.
- Compatibilidade de saves anteriores aos dados de combate, testemunhas e reputação; retaliação armada, ferimentos persistentes, morte de NPC e golpes no mercado opcional.
- Módulos e recursos relativos sob `/repositorio/`.
- Instalação do cache completo e respostas sem rede em um ambiente simulado de Service Worker, incluindo navegação sob subdiretório.

O teste de campanha exercita **9 campanhas completas**: sementes 42, 2026 e 710 nos modos Normal, Difícil e Simulação. O controlador compra recursos existentes, trabalha com verba limitada, cozinha e descansa, sem forçar indicadores ou conceder itens/dinheiro. Todas chegam à vitória com 18.030 segundos ativos totais e sem horta ou aves obrigatórias.

**Limite desse teste:** ações são chamadas diretamente nas regras. Ele não computa todos os percursos nem disponibilidade espacial de cada comerciante. Verifica viabilidade de recursos e consistência temporal, não uma garantia de vitória para qualquer estratégia. A aceleração ocorre apenas no processo de testes; não existe botão ou parâmetro de aceleração na interface distribuída.

## Verificação real no navegador — registro da entrega inicial

Servidor HTTP local respondeu 200. Fluxos executados na prévia interna:

1. Tela inicial → nova campanha → tutorial, sem iniciar o contador antecipadamente.
2. Início → movimentação real até o banco → saque de R$ 1.500.
3. Caminhada ao mercado → compra de 3 enlatados e 3 L de água → dinheiro resultante de R$ 1.449.
4. Pausa → salvar → recarregar → botão Continuar disponível e campanha preservada.
5. Volta para casa, entrada pela porta, interação com cozinha e armário.
6. Transferência de arroz e combustível → cozinha → tarefa de 12 segundos → refeição na mochila.
7. Consumo de refeição e água → indicadores recuperados e quantidades reduzidas.
8. Transição para o dia 1 e passagem contínua de horário, necessidades e clima.
9. Inspeção visual em 1280 × 720 e menu responsivo em 390 × 844.
10. Console consultado após esses fluxos sem avisos ou erros capturados.
11. Build de produção aberto sob `/dist/`, confirmando os caminhos no subdiretório e a instalação real do Service Worker.
12. Servidor local encerrado; página recarregada pelo cache; continuação do save e abertura do mapa funcionaram sem o servidor. A prévia foi deixada no início, sem consumir o tempo da campanha.

A inspeção identificou e levou à correção do personagem oculto pelo piso no interior da casa. A correção foi recarregada e verificada visualmente. O contador do prólogo também passou a aparecer no relógio do HUD, permanecendo legível com os menus de compra abertos.

Não foi concluído um ensaio manual de cinco horas, nem teste em aparelho móvel real, nem publicação remota no GitHub Pages. A matriz completa de interações domésticas e eventos noturnos foi testada principalmente pelas regras, não integralmente por cliques no navegador. Nenhum commit ou deploy foi realizado.

Capturas da verificação: [tela inicial](imagens/tela-inicial.png) e [interior e HUD](imagens/jogo-desktop.png).


## Continuação em 4 de novembro de 2026

O relatório atualizado, com evidências e limites, está em [AUDITORIA-CONTINUACAO-2026-11-04.md](AUDITORIA-CONTINUACAO-2026-11-04.md).

- 50 testes de regras/regressão aprovados, incluindo nove campanhas completas de regras.
- Edge real via Playwright: concorrência entre abas, com e sem Web Locks; 300 ciclos IndexedDB; recuperação; falha de gravação; fallback LocalStorage; movimento; colisão; pausa; foco e atualização de painel.
- Percurso real por teclado e menus: banco, saque, mercado, compras, salvar, recarregar e continuar.
- Oito resoluções com capturas e verificação de limites/foco; cenas de interior, quintal, comércio e temporal noturno.
- Produção em dois subdiretórios da mesma origem: caches distintos e nova partida após recarga offline.
- Ensaio contínuo de 183 segundos, 14 salvamentos e nenhum erro de execução. Não equivale a cinco horas nem a perfil completo de memória.

Para reproduzir no Windows, instale as dependências de desenvolvimento com `npm ci`. Os scripts usam o Edge instalado; `EDGE_PATH` permite informar outro executável Chromium compatível. Não usam o perfil pessoal do navegador.

```powershell
npm run check
npm test
npm run build
$env:PORT='4181'
npm run dev
```

Com esse servidor aberto, em outro terminal:

```powershell
npm run test:browser
npm run test:journey
npm run audit:visual
npm run test:soak
npm run test:production
```

`TEST_URL` pode mudar a origem dos testes de navegador, percurso e visual. O teste de produção abre e encerra seu próprio servidor em 4182, com cópias do build em `test-results/hosting`. Todos usam contextos temporários e isolados. Capturas completas e resultados de execução ficam em `test-results/`; evidências selecionadas desta rodada foram preservadas em `docs/imagens/auditoria-2026-11-04/`.

## Responsividade móvel — 4 de novembro de 2026

- Edge/Playwright validou 20 dimensões: retrato, paisagem, tablets e desktops, de 320 × 568 a 2560 × 1440. Sem overflow horizontal, canvas vazio ou erros JavaScript.
- Em emulação com toque, o personagem andou de x=564 para x=671,7 usando joystick e corrida simultânea por outro dedo; soltura dos controles foi confirmada. Mochila abriu por toque e o painel permaneceu dentro da tela.
- Percurso somente por toque no prólogo: joystick/corrida até o caixa, saque de R$ 1.500, movimento até o comércio e compra de mantimento; concluído em cerca de cinco segundos, com mais de 25 segundos restantes e sem erros.
- Screenshots gerados e examinados em 320 × 568, 390 × 844, 768 × 1024, 844 × 390 e 2560 × 1440.
- A emulação não substitui testes em aparelhos físicos; Safari iOS e Android reais ainda precisam ser validados.

## Conflitos e HUD — 4 de novembro de 2026

- `node --test tests/simulation.test.mjs`: 27 testes aprovados, incluindo orientação/alcance, energia e equipamento, reação de moradora pacífica, testemunha, preços após agressão, retaliação de NPC armado, morte persistente, migração de save e golpe na oferta clandestina.
- `npm run test:browser`: teste em 390 × 844 com toque confirmado; quatro medidores acessíveis, 40 unidades pixeladas, estado parcial visível e ataque via botão de toque gravado no save. Um segundo contexto verifica o atalho X no desktop.
- `npm run audit:visual`: 8 viewports entre 360 × 800 e 1920 × 1080 sem overflow, sobreposição ou erro. A auditoria mede a tela inicial; o HUD/ataque foi verificado no teste de navegador móvel.
- Ainda não há teste em aparelho físico nem validação de todas as reações possíveis em campanha longa.

## HUD Pixel Art — 4 de novembro de 2026

- `npm run test:hud` valida e captura o prólogo e a sobrevivência nas 14 resoluções pedidas: cinco desktops, quatro celulares em retrato, três em paisagem e dois tablets.
- O teste verifica quatro atributos com dez ícones SVG `viewBox="0 0 16 16"`, caixas sem deformação, grade responsiva, preenchimento 55 (cinco completos, um parcial, quatro vazios), energia 90, ausência de rolagem horizontal e separação entre HUD, instruções e cronômetro.
- Capturas e relatório: [test-results/visual/hud](../test-results/visual/hud/). Os arquivos são gerados localmente pelo teste e não são adicionados ao Git.
- O HUD cria os grupos uma vez por sessão e atualiza somente valores e ícones alterados. Emulação Edge/Playwright aprovada; aparelhos físicos e Safari iOS ainda precisam de validação.

## Compartilhamento social

- `npm test` também valida os seis destinos externos, codificação da URL única, mensagens de resultado sem conteúdo do save, montagem do PNG de campanha e metadados presentes no HTML de produção. O cache offline inclui a imagem e o módulo de compartilhamento.
- O build valida a assinatura, dimensões 1200 × 630 e presença da arte social. A suíte de navegador `npm run test:sharing` verifica prévia e MIME local, Clipboard API/fallback/falha, chamadas nativas e cancelamento com APIs simuladas, links de plataformas, foco/modal, proporção e limites em 320 × 568, pausa do prólogo, download de resultado e arquivo enviado ao mock de Web Share.
- A URL oficial e explícita está centralizada em `src/site-config.js`; os testes de build tentam sobrescrevê-la por variável de ambiente e confirmam que continua fixa. O build compara o hash do Service Worker com todos os recursos, inclusive o HTML inicial, e verifica que a remoção de cache fica limitada ao escopo deste jogo. O teste de navegador confirma o PNG servido, copiado e baixado byte a byte. A validação da nova versão publicada e as prévias reais de WhatsApp/X continuam pendentes até um deploy autorizado.
- A arte PNG inclui fonte SVG original em `public/social-preview.svg`. O cartão de resultado é desenhado no cliente com dinheiro restante, pessoas ajudadas, colheitas, ovos e dias efetivamente completos, sem upload do save.
