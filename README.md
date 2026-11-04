# APAGÃO: 30 DIAS

**Incremento jogável 0.1, em desenvolvimento.** Jogo de sobrevivência top-down, em português brasileiro, ambientado na cidade fictícia de Santa Aurora, no interior paulista.

30 segundos para sacar dinheiro e comprar reservas. Depois, 30 dias de 600 segundos ativos para administrar comida, água, descanso, dinheiro físico e relações locais.

## Jogar no computador ou celular

Requer Node.js 20 ou superior apenas para servir os arquivos durante o desenvolvimento. Nenhuma instalação de pacotes é necessária.

No Windows, abra **JOGAR.cmd** e mantenha a janela aberta enquanto joga. Ou, nesta pasta:

```sh
npm run dev
```

Abra **http://127.0.0.1:4173/**. Escolha Nova história e leia o tutorial; o contador ainda não está correndo. Só o botão de iniciar começa os 30 segundos.

Não abra `index.html` com `file://`: os navegadores restringem módulos JavaScript e persistência nesse modo.

## Controles

| Tecla / entrada | Ação |
| --- | --- |
| WASD / setas | Andar |
| Shift | Correr, com maior gasto |
| E | Interagir com o objeto ou morador próximo |
| X | Atacar um morador à frente e ao alcance; consequências permanentes |
| I | Inventário e consumo |
| M | Mapa da cidade |
| J | Diário e estado da comunidade |
| B | Construções; depois escolher e clicar no quintal |
| F | Lanterna |
| Esc | Pausa; cancela posicionamento |
| Toque | Joystick para andar; segure ⇧ para correr; ação contextual, ataque próximo, mochila e barra inferior |

Inventário, trocas e mapa mantêm o relógio. Pausa, ajuda e configurações congelam a simulação. Sair da aba também pausa. Dormir recupera energia durante o tempo normal do jogo; não pula horas.

Conflitos são opcionais e inteiramente ficcionais. Armas são abstratas, sem detalhes técnicos; agressões causam ferimentos, retaliação, medo entre testemunhas, perda de confiança e preços piores. Um mercado clandestino surge mais tarde e pode ser um golpe; não é necessário para vencer. Saves anteriores recebem defaults para os novos dados sociais e de combate.

## Primeiro dia

- O banco está à direita de casa; o mercado vem depois. E abre o caixa ou o comerciante. É possível completar o percurso andando, ainda dentro do prólogo.
- Há mantimentos no armário de casa. Entre pelo vão central, vá à geladeira à esquerda e leve comida, combustível e água na mochila.
- O fogão fica no alto à esquerda; cama e torneira, à direita. Cozinhar exige insumos na mochila. Coma e beba pelo inventário.
- O quintal está ao norte. Contorne a lateral da casa para alcançá-lo. Há um canteiro vazio e uma alface já desenvolvida.
- Trabalho pago: mural do depósito ao norte da praça. Recursos reaproveitáveis: terreno a sudoeste. Lenha: bosque nordeste. Poço: praça, água ainda não potável.
- A porta pode ser trancada por dentro ou por fora. Destranque para atravessar. Organize vigilância no posto para reduzir vulnerabilidade.
- Agricultura, aves e cooperação são opções; não são obrigações para vencer.

## Salvamento

IndexedDB, com fallback para LocalStorage. Salvamento automático a cada 20 segundos ativos, na virada de dia e em transições importantes. Esc permite salvar, exportar e importar JSON validado.

Os dados ficam **neste navegador e nesta origem**. Outro navegador, porta ou endereço pode mostrar outra partida. Limpar dados do site pode apagá-la; exporte cópias. Uma campanha local por origem. Uso simultâneo em várias abas ainda não tem bloqueio de edição.

## Produção e offline

```sh
npm run check
npm test
npm run build
npm start
```

`dist/` é o resultado estático, sem servidor Node em produção, CDN, banco remoto, fontes externas ou APIs de execução. O Service Worker é registrado apenas no build de produção. Depois de todos os arquivos serem instalados no cache, ele atende o jogo sem rede. Em desenvolvimento, o cache fica desligado para não servir código antigo.

Os caminhos são relativos: o mesmo build pode ser servido na raiz ou no subdiretório de um repositório. Uma atualização de Service Worker aguarda as abas antigas encerrarem antes de substituir sua versão. Não há download de arquivos externos durante a partida.

## Compartilhamento social

O build gera metadados Open Graph e X Card no HTML estático, além da arte original `public/social-preview.png` (1200 × 630). O jogo oferece WhatsApp, X, Facebook, Telegram, LinkedIn, Reddit, Clipboard API com fallback e compartilhamento nativo quando disponível. Instagram não tem publicação automática pelo navegador; a arte pode ser baixada para compartilhamento manual.

O endereço oficial e imutável para compartilhamento, URL canônica e metadados é `https://apagao.netlify.app/`, definido em `src/site-config.js`. Builds locais e espelhos servidos em outros domínios continuam compartilhando apenas o endereço oficial; variáveis de ambiente não podem substituí-lo. A imagem social publicada é `https://apagao.netlify.app/public/social-preview.png`.

Resultados de campanha são montados localmente a partir de estatísticas reais. A imagem pode ser salva ou enviada pela Web Share API com arquivo quando suportado; nenhum save é enviado a serviços externos. Instagram não oferece publicação automática pelo navegador. Pré-visualizações reais do WhatsApp e X dependem da leitura dos metadados públicos pelas próprias plataformas.

## Workflow auxiliar de GitHub Pages

O workflow disponível pode publicar uma cópia auxiliar em GitHub Pages por execução manual. Ela não altera o domínio oficial, a URL canônica nem os links de compartilhamento. A publicação do site oficial na Netlify não é acionada por este workflow.

## Estrutura

- `src/data.js`: itens, moradores, construções, culturas e narrativa.
- `src/world.js`: locais, terreno, colisões, busca de caminhos e limites de construção.
- `src/systems/simulation.js`: estado determinístico, transações e simulação por segundo ativo.
- `src/scenes/renderer.js`: pixel art original, câmera, iluminação e clima.
- `src/main.js` e `src/style.css`: controles, menus, HUD e apresentação.
- `src/save/storage.js`: persistência, validação, importação e exportação.
- `src/systems/audio.js`: efeitos e ambientação sintéticos.
- `scripts/`: servidor, verificação e build com bibliotecas nativas; auditoria de navegador com Playwright apenas em desenvolvimento.
- `tests/`: regras, simulação de campanhas, persistência e cache offline.

As regras não dependem do Canvas ou do DOM. A renderização lê o estado, sem alterar a simulação. A semente e o estado do gerador pseudoaleatório são persistidos; não há progressão offline ou crescimento enquanto o jogo está fechado.

Veja [o estado da entrega](docs/ESTADO.md), [as referências e simplificações](docs/REFERENCIAS.md) e [a verificação realizada](docs/TESTES.md). Esta versão não representa a conclusão de todos os requisitos do prompt mestre.

Auditoria atualizada: [correções e evidências de 4 de novembro de 2026](docs/AUDITORIA-CONTINUACAO-2026-11-04.md). Os comandos de reprodução estão em [TESTES.md](docs/TESTES.md).
