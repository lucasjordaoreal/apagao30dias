# Estado da entrega — incremento 0.1

Este projeto começou em uma pasta vazia. A entrega é uma base integrada e jogável, ainda sem o acabamento e a profundidade exigidos para declarar o jogo independente finalizado.

## Implementado

| Área | Comportamento disponível |
| --- | --- |
| Exploração | Mundo em grade, câmera, personagem animado, colisões, árvores e edifícios com portas. Interiores revelados ao entrar. |
| Locais | Casa com cozinha/quarto/banheiro/quintal; banco, mercado, farmácia, vizinhos, praça, feira, oficina, terrenos, sítio, bosque, depósito, posto e unidade de saúde. |
| Prólogo | Tutorial antes da contagem, 30 segundos ativos, saque limitado ao saldo de R$ 1.500, compras em espécie, transição e bloqueio posterior do caixa. |
| Campanha | 30 dias de 600 segundos ativos; pausa; sono sem salto; arcos narrativos, diário, morte com causa, vitória e classificação de final. |
| Necessidades | Saúde, saciedade, hidratação, energia, estresse e exposição; doença gastrointestinal, fadiga e efeitos de esforço/clima. |
| Inventário | Lotes, quantidades, ícones, peso/volume, validade, consumo, descarte, armário/geladeira e cédulas guardadas. |
| Cozinha e água | Preparação com insumos e tempo; rede/poço; água não tratada e quimicamente suspeita; filtração/fervura contextual. |
| Economia | Compra, venda, caixa e estoque finitos, preços por escassez/personalidade/relação, escambo, ajuda, jornada paga e golpe investigável. |
| Moradores | Sete NPCs persistentes com casas, necessidades, estoque, dinheiro, rotinas, caminhos em grade, relação e memória de interações. |
| Agricultura | Oito espécies selecionáveis, sementes/mudas, desenvolvimento em dias, umidade, fertilidade, calor, ervas, vitalidade, rega, composto e colheita. |
| Aves | Abrigo, aquisição finita de aves adultas, alimentação/água/higiene, saúde e produção acumulada de ovos. |
| Construção | Prévia na grade; materiais, tempo, área e distância; canteiro, galinheiro, reservatório, caixa, cerca, composteira e reforço/luminária. Desmontagem com recuperação parcial. |
| Serviços e crise | Água e eletricidade independentes; clima sem eventos contraditórios; chuva enche reservatórios; eventos e visitante noturno percorrendo a rua até a porta. |
| Segurança | Tranca, reforços, iluminação, conversa e vigilância. O visitante verifica proteção antes de uma oportunidade de furto. |
| Comunidade | Confiança, abastecimento, segurança, verba e atividade econômica; feira condicionada à confiança e circulação de recursos entre produtores e comerciante. |
| Apresentação | Arte pixel original em código, janelas noturnas, luz de lanterna, chuva, partículas, galinhas e plantas visíveis. Sons sintéticos. |
| Preferências | Volume geral, ambiente e efeitos separados, redução de efeitos e escala de interface. Layout responsivo e direcional por toque. |
| Persistência/build | IndexedDB/fallback, save versionado, revisão de gravação, JSON validado, build relativo, cache offline e workflow de Pages com deploy manual. |

## Limites e próximos incrementos

- A arte é original e funcional, mas ainda precisa de variedade, acabamento dos interiores e animações específicas para tarefas. Móveis, cercas, galinheiro e objetos principais da praça agora têm colisões próprias.
- A população de 20 mil é representada por indicadores agregados; não há uma contabilidade completa de todos os domicílios. NPCs usam rotinas e caminhos determinísticos, não um planejador econômico completo.
- Eventos ainda são pouco variados. O golpe disponível é uma oferta de água sem procedência; o perigo noturno implementado é o visitante oportunista. Predadores, roubo de aves, fuga e negociações noturnas elaboradas não estão implementados.
- Portas têm um vão e tranca, mas não há animação separada de abrir/fechar, fechamento de janelas ou sistema de percepção por ruído com campo visual.
- A água tem classes distintas e tratamento com custos, mas faltam descarte da primeira chuva, desinfecção química controlada, degradação contínua dos recipientes e simulação detalhada da rede municipal.
- O recipiente portátil limpo é abstraído pelo volume da mochila; não é necessário comprar uma garrafa vazia. O reservatório doméstico é coberto. Não há coletores abertos com vetores/dengue simulados.
- Galinhas têm produção média, cuidados e doença por negligência; não há raças, reprodução, envelhecimento de postura, predadores ou cadeias de infecção.
- Cercas são peças de grade. Construções podem ser desmontadas e refeitas com perda de materiais; não há arrastar/realocar uma construção pronta. As caixas compartilham o armazenamento doméstico.
- As oito culturas estão disponíveis, mas compartilham uma fórmula e arte vegetal básicas. Mandioca, tomate, feijão, cebolinha e couve não amadurecem em 30 dias a partir de sementes. As mudas são de alface.
- A conservação por geladeira ainda é uma aproximação diária, sem curvas térmicas. Lotes revendidos, doados e trocados preservam validade e condição. O estoque inicial e a produção própria dos comerciantes ainda usam a abstração de estoque agregado; falta modelar a idade de toda essa reserva.
- Tratamento médico é um kit abstrato, sem medicamentos ou dosagens reais. Ferimentos têm estado e cuidados, mas falta ampliar os acontecimentos que os provocam. O modo Simulação ajusta consumo, não resolve essas simplificações.
- Som tem passos, cliques, alertas e ambientação simples. Falta trilha musical e maior diversidade de pássaros, chuva, portas, cães e tensão noturna.
- As escolhas afetam reputação, recursos, feira e título do final. A cena final é uma tela narrativa/estatística; falta a sequência cinematográfica do amanhecer.
- Falta remapeamento de teclas, joystick analógico e validação em aparelhos de toque reais. A prioridade deste incremento é desktop. A interface foi inspecionada em oito resoluções, de 360 × 800 a 1920 × 1080.
- Não foi feita uma campanha manual de cinco horas. Foi realizado um ensaio contínuo de 183 segundos no Edge automatizado, insuficiente para excluir problemas de longa duração. A estratégia automatizada de recursos não inclui o custo de todos os trajetos, nem todas as combinações de más decisões.
- Save/importação não são mecanismo antitrapaça criptográfico. Há uma campanha por origem. Gravações concorrentes usam revisão, identificador único, transação e, quando disponível, Web Locks; a aba desatualizada pausa e oferece exportação ou carregamento explícito. Uma cópia anterior válida pode ser recuperada, preservando o registro danificado.
- GitHub Pages foi preparado, mas não publicado nem verificado em URL remota. O cache foi exercitado por teste automatizado e no navegador real: instalação, desligamento do servidor local, recarregamento, continuação e mapa funcionaram. Não foi alterada a conexão física do computador.

Os próximos passos prioritários são ampliar eventos e rotinas, aprofundar conservação e água, testar as rotas e o balanceamento com deslocamento real e conduzir partidas manuais longas antes de polir áudio, arte e finais.

Atualização detalhada: [continuação da auditoria de 04/11/2026](AUDITORIA-CONTINUACAO-2026-11-04.md).
