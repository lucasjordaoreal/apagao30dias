# Verificação do incremento 0.1

## Resultado automatizado

`npm run check` passou. `npm test` passou com **26 testes**, sem falhas. `npm run build` gera `dist/` com caminhos relativos e Service Worker versionado por conteúdo.

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
- Módulos e recursos relativos sob `/repositorio/`.
- Instalação do cache completo e respostas sem rede em um ambiente simulado de Service Worker, incluindo navegação sob subdiretório.

O teste de campanha exercita **9 campanhas completas**: sementes 42, 2026 e 710 nos modos Normal, Difícil e Simulação. O controlador compra recursos existentes, trabalha com verba limitada, cozinha e descansa, sem forçar indicadores ou conceder itens/dinheiro. Todas chegam à vitória com 18.030 segundos ativos totais e sem horta ou aves obrigatórias.

**Limite desse teste:** ações são chamadas diretamente nas regras. Ele não computa todos os percursos nem disponibilidade espacial de cada comerciante. Verifica viabilidade de recursos e consistência temporal, não uma garantia de vitória para qualquer estratégia. A aceleração ocorre apenas no processo de testes; não existe botão ou parâmetro de aceleração na interface distribuída.

## Verificação real no navegador

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
