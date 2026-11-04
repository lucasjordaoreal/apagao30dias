# Referências e escolhas de simulação

Consultas realizadas em novembro de 2026. Os números do jogo são parâmetros de design, não recomendações individuais de saúde, agricultura ou criação de animais.

## Água

Referência principal: [Ministério da Saúde — Cuidados com a água](https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/e/enchentes/cuidados-com-a-agua). O material orienta filtrar/coar antes da desinfecção e, na alternativa por fervura, contar cinco minutos após o início da ebulição. O contexto sanitário e a procedência continuam importantes.

Aplicação: há itens separados para água potável, água não tratada de origem conhecida e água com suspeita química. O filtro/fogão doméstico consome combustível e 8 segundos ativos para tratar 2 L da segunda classe; 5 minutos simulados correspondem a cerca de 2,08 segundos ativos, e a tarefa inclui preparo, filtração e acondicionamento. A terceira classe é recusada. Não há fervura universal que “purifique qualquer água”.

A [orientação do Ministério da Saúde para seca](https://miniapps.saude.gov.br/guia-clima/seca/o-que-comunicar-a-comunidade) distingue coleta de chuva para usos não potáveis. No jogo, chuva só gera água não tratada, limitada a 60 L por reservatório. A fórmula usa área de 4 m² e intensidade máxima de 8 mm/h simulada: litros = milímetros × metros quadrados. Área, eficiência e intensidade são escolhas de design. Descarte inicial de chuva e contaminantes específicos ainda são pendências.

A rede municipal começa funcionando e tem interrupções próprias. No jogo ela é uma origem controlada quando está com pressão; na vida real isso depende da avaliação sanitária, não apenas da presença de pressão. A abstração evita transformar toda torneira em um risco aleatório sem indicação.

## Alimentação e conservação

O [Guia Alimentar para a População Brasileira, Ministério da Saúde](https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_pop_bras.pdf) fundamenta a importância de variedade e armazenamento protegido. A [Anvisa — informação nutricional](https://www.gov.br/anvisa/pt-br/centraisdeconteudo/publicacoes/alimentos/informacao-nutricional-e-alegacoes-de-saude-o-cenario-global-das-regulamentacoes.pdf) apresenta o valor de referência de 2.000 kcal em rotulagem; ele não é uma necessidade universal.

O jogo escolhe **2.200 kcal por dia basal**, com multiplicadores por esforço e dificuldade. A barra de saciedade armazena um equivalente energético simplificado, não uma simulação de digestão. A hidratação usa **2,5 L/dia basal**, maior sob calor, esforço e doença; trata-se de parâmetro de balanceamento. Refeições variadas melhoram recuperação durante o sono.

As porções são: arroz seco 200 g, feijão seco 150 g, enlatado 300 g, pão 200 g, frutas 300 g, vegetais 250 g e ovo 60 g. Calorias são arredondadas, sem banco nutricional completo: 720, 500, 500, 500, 200, 100 e 75 kcal, respectivamente. Arroz cozido entrega 650 kcal; feijão cozido entrega 480 kcal. Não há criação de calorias ao cozinhar. “Enlatado” e “frutas” representam cestas genéricas, não produtos específicos.

Referência de segurança: [Biblioteca Virtual em Saúde — alimentos seguros, 2026](https://bvsms.saude.gov.br/de-problemas-as-solucoes-alimentos-seguros-em-todos-os-lugares-7-6-dia-mundial-da-seguranca-dos-alimentos-2026/). As condições reais de refrigeração, resfriamento e tempo fora da geladeira são importantes. A versão atual usa validade por dia e um bônus de conservação no armário/geladeira quando há energia. Isso é uma simplificação permissiva, especialmente para comida pronta; **não deve ser usado como orientação de conservação doméstica**. A próxima revisão precisa de temperatura e frações de dia por lote.

## Horta

Referência: [Embrapa — Catálogo de Hortaliças](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/887213/1/Catalogohortalicas.pdf). Para rabanete, o material apresenta início de colheita entre 25 e 30 dias. O jogo usa 28 dias em condições favoráveis. Cultivar, região e clima alteram os ciclos reais.

Para alface, o [Comunicado Técnico 36 da Embrapa](https://www.infoteca.cnptia.embrapa.br/bitstream/doc/779836/1/cot36.pdf) descreve ciclos normalmente entre 60 e 70 dias após semeadura. O jogo escolhe 65 dias, com uma planta e mudas já com 45 dias para permitir colheita dentro da campanha.

Outras escolhas de design conservadoras: rúcula 40 dias, cebolinha e couve 90, tomate 110, feijão 85, mandioca 300. Não são promessas de rendimento agronômico. Feijão e mandioca são tratados no conjunto de culturas, embora a “semente” genérica também abstraia propagação por material vegetativo. Sua colheita não é acessível durante a campanha a partir de idade zero.

Desenvolvimento acumula dias equivalentes, condicionado à umidade, fertilidade, ervas, vitalidade, luz e calor. Não cresce enquanto o jogo está fechado. Os rendimentos são porções abstratas por canteiro, sem produtividade por hectare. O composto em 7 dias é uma simplificação forte; não representa prazo agronômico de compostagem segura.

## Galinhas

Referência de estrutura de cuidados: [Embrapa — Sistema alternativo de criação de galinhas caipiras: instalações](https://sistemasdeproducao.cnptia.embrapa.br/FontesHTML/AgriculturaFamiliar/RegiaoMeioNorteBrasil/GalinhaCaipira/instalacao.htm). Abrigo, alimentação e organização da criação são parte do sistema, não produção independente de cuidados.

O jogo escolhe uma média de **120 g de ração e 300 mL de água por ave/dia**, com produção de até **0,75 ovo/ave/dia saudável**. São aproximações para uma ave adulta genérica; não foram calibradas para raça, temperatura ou fase de postura específicas. Um acumulador fracionário distribui os ovos ao longo dos dias. Fome, falta de água, higiene ruim e baixa saúde impedem a postura e causam perda progressiva de saúde.

## Sociedade e infraestrutura

Não há uma hipótese de que queda de internet desligue a rede elétrica. Água, luz e conectividade são estados diferentes. Falhas graduais são possibilidades ficcionais, com avisos e alternativas. Dinheiro não é gerado nas transações: compras e vendas transferem entre jogador e NPC, jornadas saem de uma verba comunitária inicial. Agricultura local produz bens; reposição de Antônio pela feira transfere estoque e dinheiro entre comerciantes.

Os 20 mil habitantes são contexto ficcional. Sete moradores são individualizados; abastecimento, confiança e segurança representam o restante de forma abstrata. Os preços, a crise e seus efeitos não constituem previsão econômica ou política.
