export const DAY = 600;
export const DAYS = 30;
export const TILE = 24;
export const WORLD = { w: 72, h: 54 };
export const MODES = { normal: { name: 'Normal', need: 1, stock: 1, risk: 1 }, dificil: { name: 'Difícil', need: 1.15, stock: .75, risk: 1.35 }, simulacao: { name: 'Simulação', need: 1.08, stock: 1, risk: 1 } };
// A unidade de comida é uma porção, não um pacote de um quilograma.
export const ITEMS = {
  water: { name:'Água potável · 1 L', category:'Água', weight:1, volume:1, price:5, drink:40, color:'#81bcc0', desc:'Lacre ou origem segura. Uma unidade contém 1 litro.' },
  raw: { name:'Água não tratada · 1 L', category:'Água', weight:1, volume:1, price:0, drink:32, color:'#7b9473', desc:'Risco microbiológico. Filtrar e desinfetar antes do consumo.' },
  chemical: { name:'Água suspeita · 1 L', category:'Água', weight:1, volume:1, price:0, drink:20, color:'#988653', desc:'Origem química desconhecida. Fervura NÃO torna esta água segura.' },
  rice: { name:'Arroz seco · 200 g', category:'Alimentos', weight:.2, volume:.25, price:3, kcal:720, cook:true, shelf:365, color:'#e8d8aa', desc:'Precisa de cozinha, água e combustível. Rende uma refeição.' },
  beans: { name:'Feijão seco · 150 g', category:'Alimentos', weight:.15, volume:.2, price:3, kcal:500, cook:true, shelf:180, color:'#a97154', desc:'Proteína vegetal. Cozinhar com água e combustível.' },
  meal: { name:'Refeição cozida', category:'Alimentos', weight:.4, volume:.4, price:9, kcal:650, shelf:1, color:'#d3a466', desc:'Comida pronta, perecível. Guarde na geladeira se houver energia.' },
  beanMeal: { name:'Feijão cozido · porção', category:'Alimentos', weight:.4, volume:.4, price:8, kcal:480, shelf:1, color:'#ab7e58', desc:'Fonte de energia e proteína vegetal. Refeição perecível.' },
  canned: { name:'Enlatado · 300 g', category:'Alimentos', weight:.35, volume:.35, price:12, kcal:500, shelf:365, color:'#a9b5a1', desc:'Pronto para comer, longa duração.' },
  bread: { name:'Pão · porção', category:'Alimentos', weight:.2, volume:.4, price:4, kcal:500, shelf:3, color:'#d4a25e', desc:'Energia rápida. Estraga em poucos dias.' },
  fruit: { name:'Frutas · porção', category:'Alimentos', weight:.3, volume:.35, price:4, kcal:200, shelf:5, color:'#eaa069', desc:'Complemento alimentar e um pouco de hidratação.' },
  veg: { name:'Hortaliças · maço', category:'Alimentos', weight:.25, volume:.5, price:4, kcal:100, shelf:4, color:'#8fae64', desc:'Complemento nutricional; não sustenta uma dieta sozinho.' },
  egg: { name:'Ovo', category:'Alimentos', weight:.06, volume:.08, price:2, kcal:75, cook:true, shelf:12, color:'#efe2bc', desc:'Cozinhe para reduzir o risco alimentar.' },
  cookedEgg: { name:'Ovo cozido', category:'Alimentos', weight:.06, volume:.08, price:3, kcal:75, shelf:2, color:'#fff2d8', desc:'Pequena fonte de proteína e energia.' },
  wood: { name:'Madeira', category:'Materiais', weight:.5, volume:1, price:5, color:'#a87d54', desc:'Construção e reparos.' },
  metal: { name:'Ferragens', category:'Materiais', weight:.4, volume:.2, price:8, color:'#9da9aa', desc:'Pregos, dobradiças e chapas.' },
  fuel: { name:'Combustível de cozinha', category:'Equipamentos', weight:.25, volume:.3, price:6, color:'#c19a75', desc:'Uma carga para cozinhar ou filtrar e ferver 2 litros.' },
  feed: { name:'Ração · 1 kg', category:'Materiais', weight:1, volume:1.4, price:7, color:'#d6bb75', desc:'Uma galinha consome cerca de 120 g por dia.' },
  meds: { name:'Kit de cuidados', category:'Saúde', weight:.2, volume:.3, price:18, color:'#c78579', desc:'Cuida de ferimentos e auxilia a recuperação; não substitui água e comida.' },
  battery: { name:'Pilhas · par', category:'Equipamentos', weight:.1, volume:.1, price:8, color:'#c4b26d', desc:'Recarrega a autonomia da lanterna em 6 horas simuladas.' },
  seed: { name:'Sementes · envelope', category:'Sementes', weight:.02, volume:.03, price:5, color:'#99ae72', desc:'Escolha a espécie no canteiro. Crescimento em dias completos.' },
  seedling: { name:'Muda desenvolvida', category:'Sementes', weight:.15, volume:.3, price:9, color:'#719d69', desc:'Alface já com 45 dias. Permite colher durante a campanha.' }
};
export const CROPS = {
  radish:{name:'Rabanete',days:28,yield:4}, arugula:{name:'Rúcula',days:40,yield:4}, lettuce:{name:'Alface',days:65,yield:5},
  chives:{name:'Cebolinha',days:90,yield:4}, kale:{name:'Couve',days:90,yield:6}, tomato:{name:'Tomate',days:110,yield:8},
  bean:{name:'Feijão',days:85,yield:6,item:'beans'}, cassava:{name:'Mandioca',days:300,yield:10,item:'rice'}
};
export const BUILDINGS = [
  {id:'home',name:'Sua casa',x:20,y:18,w:7,h:6,color:'#ba755b',wall:'#e7d4ac',sign:'LAR'},
  {id:'bank',name:'Banco Aurora',x:30,y:18,w:6,h:6,color:'#587c79',wall:'#cad5bb',sign:'BANCO'},
  {id:'market',name:'Mercado do Antônio',x:39,y:18,w:8,h:6,color:'#ac6853',wall:'#e4cea3',sign:'MERCADO'},
  {id:'celia',name:'Casa de Dona Célia',x:10,y:18,w:6,h:6,color:'#a77b56',wall:'#e5cfac',sign:'CÉLIA'},
  {id:'pharmacy',name:'Farmácia Esperança',x:49,y:18,w:6,h:6,color:'#789a91',wall:'#e4dfbd',sign:'FARMÁCIA'},
  {id:'clinic',name:'Unidade de saúde',x:49,y:8,w:7,h:6,color:'#809a8b',wall:'#e8dec6',sign:'SAÚDE'},
  {id:'police',name:'Posto policial',x:39,y:8,w:7,h:6,color:'#6d7f89',wall:'#dad5bd',sign:'POSTO'},
  {id:'depot',name:'Depósito comunitário',x:30,y:8,w:6,h:6,color:'#94796a',wall:'#c9b998',sign:'DEPÓSITO'},
  {id:'rafael',name:'Oficina do Rafael',x:10,y:8,w:7,h:6,color:'#747b76',wall:'#d3c4a5',sign:'OFICINA'},
  {id:'beatriz',name:'Casa de Beatriz',x:10,y:34,w:6,h:6,color:'#ab7a72',wall:'#e4d6b2',sign:'BEATRIZ'},
  {id:'shop',name:'Venda de bairro',x:39,y:34,w:6,h:6,color:'#aa8f5d',wall:'#e2d0aa',sign:'VENDA'},
  {id:'joao',name:'Sítio do João',x:57,y:35,w:7,h:6,color:'#b17a59',wall:'#e2cf9f',sign:'SÍTIO'},
  {id:'carlos',name:'Casa de Carlos',x:49,y:34,w:6,h:6,color:'#857c86',wall:'#d4cab4',sign:'CARLOS'}
];
export const POINTS = [
  {id:'atm',name:'Caixa eletrônico',x:34.5,y:24.5,kind:'atm'},
  {id:'market',name:'Mercado do Antônio',x:43,y:24.5,kind:'shop',trader:'antonio'},
  {id:'pharmacy',name:'Farmácia Esperança',x:52,y:24.5,kind:'shop',trader:'marina'},
  {id:'bed',name:'Cama · descansar',x:25,y:19.6,kind:'bed',inside:'home'},
  {id:'kitchen',name:'Fogão e filtro',x:21.5,y:19.6,kind:'kitchen',inside:'home'},
  {id:'storage',name:'Armário e geladeira',x:21.5,y:21,kind:'storage',inside:'home'},
  {id:'bath',name:'Torneira · água da rede',x:25,y:21.5,kind:'tap',inside:'home'},
  {id:'door',name:'Porta de casa',x:23.5,y:24.3,kind:'door'},
  {id:'well',name:'Poço da praça · não tratada',x:35,y:29,kind:'well'},
  {id:'fair',name:'Feira comunitária',x:31,y:35,kind:'fair'},
  {id:'work',name:'Mural do depósito',x:33,y:14.5,kind:'work'},
  {id:'help',name:'Atendimento de Marina',x:52,y:14.5,kind:'clinic'},
  {id:'patrol',name:'Vigilância do bairro',x:42,y:14.5,kind:'patrol'},
  {id:'joao',name:'Criador e produtor João',x:60.5,y:41.5,kind:'farm'},
  {id:'salvage',name:'Terreno · materiais reaproveitáveis',x:19,y:37,kind:'salvage'},
  {id:'forest',name:'Bosque · lenha caída',x:61,y:12,kind:'forest'}
];
export const NPCS = [
  {id:'celia',name:'Dona Célia',job:'Aposentada e horticultora',home:'celia',work:[28,31],color:'#9b779d',skin:'#d4a173',personality:'solidária',cash:180,stock:{veg:18,seed:12,seedling:12,rice:12},need:'water'},
  {id:'antonio',name:'Seu Antônio',job:'Comerciante',home:'market',work:[42,25],color:'#d3a064',skin:'#c29168',personality:'justo',cash:550,stock:{water:100,rice:100,beans:70,canned:50,bread:40,fruit:50,wood:40,metal:30,fuel:40,feed:25,battery:20,seed:20},need:'egg'},
  {id:'rafael',name:'Rafael',job:'Mecânico',home:'rafael',work:[15,15],color:'#6b98ac',skin:'#af7c53',personality:'prático',cash:250,stock:{wood:40,metal:30,fuel:25,battery:20},need:'canned'},
  {id:'marina',name:'Marina',job:'Enfermeira',home:'clinic',work:[52,15],color:'#cbd5c1',skin:'#b6815e',personality:'solidária',cash:200,stock:{water:55,meds:20},need:'veg'},
  {id:'joao',name:'João',job:'Agricultor',home:'joao',work:[60,42],color:'#8eaa71',skin:'#bd8e62',personality:'justo',cash:300,stock:{egg:35,veg:35,feed:35,seed:20,seedling:15,rice:50,beans:50},need:'metal'},
  {id:'carlos',name:'Carlos',job:'Revendedor',home:'carlos',work:[45,29],color:'#b97c6a',skin:'#dfac7c',personality:'oportunista',cash:420,stock:{water:12,canned:15,battery:10},need:'rice'},
  {id:'beatriz',name:'Beatriz',job:'Organizadora da feira',home:'beatriz',work:[31,35],color:'#d6ad65',skin:'#946947',personality:'solidária',cash:180,stock:{fruit:25,bread:25,veg:25,seed:10},need:'beans'}
];
export const RECIPES = {
  bed:{name:'Canteiro',wood:3,metal:0,time:5},coop:{name:'Galinheiro',wood:10,metal:3,time:15},barrel:{name:'Reservatório coberto · 60 L',wood:5,metal:4,time:12},
  crate:{name:'Caixa de armazenamento',wood:4,metal:1,time:6},fence:{name:'Cerca',wood:2,metal:1,time:4},compost:{name:'Composteira',wood:4,metal:0,time:6},reinforcement:{name:'Reforço e luminária',wood:5,metal:3,time:10}
};
export const ARCS = ['A incerteza','A escassez','A adaptação','A tensão','A reconstrução','A última resistência'];
export const NARRATIVE = [
  'A internet caiu. A rede elétrica e as torneiras ainda funcionam. Saque e transferências digitais ficaram indisponíveis.',
  'Os vizinhos ainda esperam uma solução rápida. Célia separou algumas mudas para negociar.',
  'A prefeitura mantém o abastecimento. Estoques e transporte começam a preocupar os comerciantes.',
  'O posto de saúde recomenda reservar água em recipientes fechados. O poço da praça não é potável.',
  'Antônio procura produtores locais. O dinheiro em papel continua circulando.',
  'A reposição ficou irregular. Materiais, alimentos secos e vínculos passam a valer mais.',
  'Rafael oferece trabalho de manutenção no depósito. Leve comida e água para a jornada.',
  'Boatos sobre a conexão circulam. Não pague antecipado por promessas sem evidência.',
  'Moradores combinam avisos de porta em porta para substituir os grupos de mensagens.',
  'Célia lembra: folhas complementam a alimentação; arroz, feijão e outras fontes de energia continuam essenciais.',
  'Beatriz convida a cidade a organizar uma feira. Doações e trabalho fortalecem o abastecimento.',
  'O poço segue disponível, mas a água precisa de avaliação e tratamento.',
  'O posto organiza mutirões. Os recursos são limitados, mas ninguém precisa enfrentar tudo sozinho.',
  'A feira começa a conectar pequenos produtores. Confiança ajuda a manter preços justos.',
  'Metade do mês. Reveja as reservas e os cuidados com o quintal.',
  'Há relatos de furtos na região. Tranque a porta e combine vigilância antes de anoitecer.',
  'Rafael pede manutenção preventiva nos reservatórios. Água bem guardada é tão importante quanto coletar.',
  'As interrupções de energia variam de bairro para bairro. Evite depender só da geladeira.',
  'Marina recomenda não consumir alimentos com validade vencida. Ferver não remove contaminantes químicos.',
  'O cansaço pesa nas decisões. Descansar consome o tempo normal do dia, sem saltar horas.',
  'A feira ganha força quando os moradores contribuem. A cooperação reduz a vulnerabilidade do bairro.',
  'Produtores negociam um trajeto de entregas. Pequenas reposições voltam a acontecer.',
  'Vizinhos dividem informações verificadas. Promessas de retorno da rede seguem sem confirmação.',
  'As mudas mais antigas começam a mostrar resultado. Plantios longos ainda não estarão prontos.',
  'O depósito faz um balanço dos recursos. Cada acordo honesto ajuda a cidade a se reorganizar.',
  'Entramos nos últimos cinco dias. Mantenha uma reserva de água e refeições.',
  'O interior se reorganiza em caminhos conhecidos: sítios, feira, oficinas e vizinhos.',
  'O fim do mês se aproxima. Verifique os animais, os canteiros e a segurança da casa.',
  'Santa Aurora mudou. As relações construídas até aqui fazem diferença.',
  'Último dia. Permaneça vivo até o próximo amanhecer. O relógio ainda precisa completar seu percurso.'
];
