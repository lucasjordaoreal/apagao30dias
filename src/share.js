import { SITE_URL } from './site-config.js';

export const GAME_SHARE_TEXT = 'APAGÃO: 30 DIAS — Você conseguiria sobreviver sem internet? Jogue gratuitamente e descubra!';
export const WHATSAPP_SHARE_TEXT = '🎮 APAGÃO: 30 DIAS\n\nA internet mundial acabou! 😱\n\nVocê tem só 30 segundos para se preparar e precisa sobreviver por 30 dias.\n\nSerá que você consegue?\n\n🌱 Plante, negocie, cuide dos seus recursos e sobreviva!';
export const X_SHARE_TEXT = '🚨 A INTERNET MUNDIAL ACABOU!\n\nVocê tem 30 segundos para se preparar e 30 dias para sobreviver.\n\n🎮 APAGÃO: 30 DIAS — um jogo brasileiro de sobrevivência.\n\nSerá que você consegue?';

export function platformShareUrl(platform, message) {
  const url = new URL(SITE_URL).href;
  const title = 'APAGÃO: 30 DIAS — Você consegue sobreviver?';
  const content = message??(platform==='whatsapp'?WHATSAPP_SHARE_TEXT:platform==='x'?X_SHARE_TEXT:GAME_SHARE_TEXT);
  const cleanMessage=content.endsWith(`\n${url}`)?content.slice(0,-url.length-1):content;
  const shareUrls = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${cleanMessage}\n\nJogue aqui:\n${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(cleanMessage)}&url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(cleanMessage)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  };
  if (!Object.hasOwn(shareUrls, platform)) throw new Error('Rede social desconhecida.');
  return shareUrls[platform];
}

export async function copyText(text) {
  let clipboardError;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) { clipboardError=error; }
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  let copied;
  try { copied=document.execCommand('copy'); }
  finally { field.remove(); }
  if (!copied) throw new Error(clipboardError?`O navegador não permitiu copiar o link: ${clipboardError.message}`:'O navegador não permitiu copiar o link.');
}

const formatMoney = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const campaignDays = state => state.phase === 'won' ? 30 : Math.max(0, Math.min(30, state.day - 1));

export function resultShareText(state) {
  const days = campaignDays(state);
  const headline = state.phase === 'won'
    ? 'EU SOBREVIVI AOS 30 DIAS!'
    : `CHEGUEI AO DIA ${state.day}, COM ${days} ${days === 1 ? 'DIA COMPLETO' : 'DIAS COMPLETOS'} DE SOBREVIVÊNCIA.`;
  return `${headline}\n\n${state.phase === 'won' ? `Perfil: ${state.ending}.` : `A cidade me venceu: ${state.deathCause}.`}\nPessoas ajudadas: ${state.stats.helped} · Colheitas: ${state.stats.harvests} · Dinheiro restante: ${formatMoney(state.player.cash + state.house.safeCash)}\n\nVocê consegue ir mais longe?\n${SITE_URL}`;
}

export function resultImage(state) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const c = canvas.getContext('2d');
  const sky = c.createLinearGradient(0, 0, 0, 630);
  sky.addColorStop(0, '#142b2b');
  sky.addColorStop(1, '#344c3a');
  c.fillStyle = sky;
  c.fillRect(0, 0, 1200, 630);

  const pixel = (color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
  pixel('#1b3531', 0, 412, 1200, 218);
  pixel('#aab0a0', 0, 493, 1200, 42);
  for (let x = 70; x < 1200; x += 190) {
    pixel('#554b3b', x, 326, 132, 166);
    pixel('#bd7859', x - 12, 300, 156, 33);
    for (let wx = x + 17; wx < x + 122; wx += 42) {
      pixel('#d9b66f', wx, 363, 20, 28);
      pixel('#364b45', wx + 8, 363, 4, 28);
    }
    pixel('#263c34', x + 48, 433, 32, 59);
  }
  pixel('#786847', 905, 452, 9, 60);
  pixel('#536e47', 875, 395, 70, 53);
  pixel('#719358', 884, 380, 50, 30);
  pixel('#6b4e37', 971, 510, 146, 10);
  for (let x = 983; x < 1105; x += 29) {
    pixel('#755a40', x, 490, 17, 26);
    pixel('#789252', x + 3, 482, 11, 12);
  }
  for (let x = 1035; x < 1145; x += 37) {
    pixel('#e8dfbc', x, 476, 17, 14);
    pixel('#b96f54', x + 3, 472, 11, 5);
    pixel('#d3ad79', x + 6, 480, 3, 3);
  }

  c.fillStyle = '#e3b271';
  c.font = '700 22px monospace';
  c.fillText('APAGÃO: 30 DIAS  ·  RESULTADO', 70, 82);
  c.fillStyle = '#f0dfb8';
  c.font = '900 64px Impact, "Arial Narrow", sans-serif';
  c.fillText(state.phase === 'won' ? 'EU SOBREVIVI!' : `CHEGUEI AO DIA ${state.day}`, 70, 174);
  c.fillStyle = '#bdc7b0';
  c.font = '24px "Segoe UI", sans-serif';
  c.fillText(state.phase === 'won' ? `30 dias · ${state.ending}` : `${campaignDays(state)} dias completos · ${state.deathCause}`, 74, 220);

  const stats = [
    ['DINHEIRO RESTANTE', formatMoney(state.player.cash + state.house.safeCash)],
    ['PESSOAS AJUDADAS', String(state.stats.helped)],
    ['COLHEITAS', String(state.stats.harvests)],
    ['OVOS PRODUZIDOS', String(state.stats.eggs)]
  ];
  stats.forEach(([label, value], i) => {
    const x = 70 + i * 275;
    pixel('#e3b271', x, 552, 6, 6);
    c.fillStyle = '#b9c5af';
    c.font = '600 13px monospace';
    c.fillText(label, x + 17, 560);
    c.fillStyle = '#f0dfb8';
    c.font = '600 23px "Segoe UI", sans-serif';
    c.fillText(value, x + 17, 592);
  });
  c.fillStyle = '#d7decf';
  c.font = '15px monospace';
  c.textAlign = 'right';
  c.fillText(new URL(SITE_URL).host, 1128, 82);
  return canvas.toDataURL('image/png');
}

export function imageFile(dataUrl, filename = 'apagao-resultado.png') {
  const [header, encoded] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1];
  if (!mime || !encoded) throw new Error('Não foi possível preparar a imagem.');
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  return new File([bytes], filename, { type: mime });
}
