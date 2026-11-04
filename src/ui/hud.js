export const VITALS = [
  {
    key: 'health',
    name: 'Saúde',
    label: 'SAÚDE',
    icon: [
      '................',
      '..OOO......OOO..',
      '.OFHHFO..OFHHFO.',
      'OFFFFFOOOFFFFFOO',
      'OFFFFFFFFFFFFFFO',
      '.OFFFFFFFFFFFFO.',
      '..OFFFFFFFFFFO..',
      '...OFFFFFFFFO...',
      '....OFFFFFFO....',
      '.....OFFFFO.....',
      '......OFFO......',
      '.......OO.......',
      '................',
      '................',
      '................',
      '................',
    ],
    colors: { outline: '#592c3d', fill: '#e44756', highlight: '#ff8790', detail: '#b82f46' },
  },
  {
    key: 'hunger',
    name: 'Saciedade',
    label: 'SACIEDADE',
    icon: [
      '................',
      '................',
      '.....OOOOOO.....',
      '...OOFFFFFFOO...',
      '..OFFHHHHHHFFO..',
      '.OFFHHHHHHHHFFO.',
      '.OFFDDHHHHDDFFO.',
      '.OFFDDHHHHDDFFO.',
      '..OFFHHHHHHFFO..',
      '..OOFFFFFFFFOO..',
      '...OOFFFFFFOO...',
      '.....OOOOOO.....',
      '................',
      '................',
      '................',
      '................',
    ],
    colors: { outline: '#5d4424', fill: '#dda83e', highlight: '#ffe28a', detail: '#b8792b' },
  },
  {
    key: 'thirst',
    name: 'Hidratação',
    label: 'HIDRATAÇÃO',
    icon: [
      '................',
      '.......OO.......',
      '......OFFO......',
      '.....OFFFFO.....',
      '....OFFFFFFO....',
      '...OFFFFFFFFO...',
      '..OFFFFFFFFFFO..',
      '..OFFFFFFFFFFO..',
      '.OFFFFFFFFFFFFO.',
      '.OFFFFFFFFFFFFO.',
      '..OFFFFFFFFFFO..',
      '...OFFFFFFFFO...',
      '....OOFFFFOO....',
      '......OOOO......',
      '................',
      '................',
    ],
    colors: { outline: '#174d70', fill: '#39a8df', highlight: '#a2e9ff', detail: '#2676b9' },
  },
  {
    key: 'energy',
    name: 'Energia',
    label: 'ENERGIA',
    icon: [
      '................',
      '.....OOOOO......',
      '....OFFFFFO.....',
      '...OFFFFFO......',
      '...OFFFFFO......',
      '..OFFFFFO.......',
      '.OFFFFFO........',
      'OFFFFFFFFOO.....',
      '......OOFFO.....',
      '.....OOFFO......',
      '....OOFFO.......',
      '...OOFFO........',
      '...OOOO.........',
      '................',
      '................',
      '................',
    ],
    colors: { outline: '#493b74', fill: '#9e7be2', highlight: '#d3b8ff', detail: '#7054ba' },
  },
];

let nextClipId = 0;

function pixelPath(rows, characters) {
  let path = '';
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (characters.includes(rows[y][x])) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return path;
}

for (const vital of VITALS) {
  if (vital.icon.length !== 16 || vital.icon.some((row) => row.length !== 16)) {
    throw new Error(`The ${vital.key} pixel-art sprite must use a 16 by 16 grid.`);
  }
}

export function vitalUnitCount(
  width = typeof window === 'undefined' ? 1280 : window.innerWidth,
  height = typeof window === 'undefined' ? 720 : window.innerHeight,
) {
  return width <= 1150 || (width > height && height <= 500) ? 5 : 10;
}

export function vitalFill(value, index, units = 10) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError('Vital values must be finite numbers.');
  }
  if (!Number.isInteger(index) || index < 0 || index >= units) {
    throw new RangeError('Vital icon index is outside the configured unit count.');
  }
  if (units !== 5 && units !== 10) throw new RangeError('Vital indicators support 5 or 10 units.');
  const step = 100 / units;
  return Math.max(0, Math.min(1, (value - index * step) / step));
}

function spriteMarkup(vital, index, clipPrefix) {
  const id = `${clipPrefix}-${vital.key}-${index}`;
  const outline = pixelPath(vital.icon, 'O#');
  const body = pixelPath(vital.icon, 'FHD');
  return `<svg class="game-vital__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path class="game-vital__outline" d="${outline}"></path>
    <path class="game-vital__body" d="${body}"></path>
    <defs><clipPath id="${id}"><rect class="game-vital__fill-clip" x="0" y="0" width="0" height="16"></rect></clipPath></defs>
    <path class="game-vital__fill" d="${pixelPath(vital.icon, 'F')}" clip-path="url(#${id})"></path>
    <path class="game-vital__highlight" d="${pixelPath(vital.icon, 'H')}" clip-path="url(#${id})"></path>
    <path class="game-vital__detail" d="${pixelPath(vital.icon, 'D')}" clip-path="url(#${id})"></path>
  </svg>`;
}

function createVitalUnits(vital, units) {
  const clipPrefix = `game-vital-${nextClipId++}`;
  return Array.from({ length: units }, (_, index) =>
    `<span class="game-vital__unit" data-unit="${index}">${spriteMarkup(vital, index, clipPrefix)}</span>`,
  ).join('');
}

function createVitalMarkup(vital, units) {
  return `<section class="game-vital" data-vital="${vital.key}" style="--vital-outline:${vital.colors.outline};--vital-fill:${vital.colors.fill};--vital-highlight:${vital.colors.highlight};--vital-detail:${vital.colors.detail}" role="meter" aria-label="${vital.name}" aria-valuemin="0" aria-valuemax="100">
    <div class="game-vital__heading"><span class="game-vital__name">${vital.label}</span><span class="game-vital__number" data-vital-number>100</span></div>
    <div class="game-vital__icons" data-vital-icons>${createVitalUnits(vital, units)}</div>
  </section>`;
}

export function createVitalsMarkup(units = 10) {
  if (units !== 5 && units !== 10) throw new RangeError('Vital indicators support 5 or 10 units.');
  return `<div class="game-vitals" data-unit-count="${units}">${VITALS.map((vital) => createVitalMarkup(vital, units)).join('')}</div>`;
}

export function createHUDMarkup(units = 10) {
  return `<div class="game-hud" role="group" aria-label="Indicadores de sobrevivência">
    <div class="game-hud__campaign">
      <div class="game-hud__clock"><span class="game-hud__eyebrow" data-hud-day>DIA 01</span><strong class="game-hud__clock-value">10:00</strong></div>
      <div class="game-hud__wallet"><span class="game-hud__eyebrow">DINHEIRO</span><strong id="money">$0</strong></div>
    </div>
    ${createVitalsMarkup(units)}
    <div class="game-hud__meta">
      <div class="game-hud__weather"><span class="game-hud__eyebrow">CLIMA</span><span id="weather">—</span></div>
      <button class="game-hud__pause" data-act="pause" type="button" aria-label="Pausar jogo">
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 2h4v12H3zM9 2h4v12H9z"></path></svg>
      </button>
    </div>
  </div>`;
}

function formatValue(value) {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function updateVitals(root, player, units = vitalUnitCount()) {
  if (!root || !player) throw new TypeError('Updating vital indicators requires a HUD root and player state.');
  const vitals = root.querySelector('.game-vitals');
  if (!vitals) throw new Error('The HUD root does not contain its vital indicators.');

  if (Number(vitals.dataset.unitCount) !== units) {
    vitals.replaceWith(createVitalsElement(units));
    return updateVitals(root, player, units);
  }

  let healthDropped = false;
  const values = {
    health: player.health,
    hunger: player.food,
    thirst: player.water,
    energy: player.energy,
  };
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`Player vital "${key}" must be a finite number.`);
    }
  }

  for (const vital of VITALS) {
    const section = root.querySelector(`[data-vital="${vital.key}"]`);
    const value = values[vital.key];
    const number = section.querySelector('[data-vital-number]');
    const displayValue = formatValue(value);
    if (number.textContent !== displayValue) number.textContent = displayValue;
    if (section.getAttribute('aria-valuenow') !== String(value)) section.setAttribute('aria-valuenow', String(value));

    const previousValue = Number(section.dataset.value);
    if (vital.key === 'health' && Number.isFinite(previousValue) && value < previousValue) {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        section.animate([{ opacity: 1 }, { opacity: 0.58 }, { opacity: 1 }], {
          duration: 260,
          easing: 'steps(2, end)',
        });
      }
      healthDropped = true;
    }
    if (section.dataset.value !== String(value)) section.dataset.value = String(value);

    section.querySelectorAll('.game-vital__unit').forEach((unit, index) => {
      const ratio = vitalFill(value, index, units);
      const clip = unit.querySelector('.game-vital__fill-clip');
      const width = String(ratio === 0 ? 0 : Math.max(1, Math.round(16 * ratio)));
      if (clip.getAttribute('width') !== width) clip.setAttribute('width', width);
      const state = ratio === 1 ? 'full' : ratio === 0 ? 'empty' : 'partial';
      if (unit.dataset.state !== state) unit.dataset.state = state;
    });
  }
  return healthDropped;
}

function createVitalsElement(units) {
  const template = document.createElement('template');
  template.innerHTML = createVitalsMarkup(units);
  return template.content.firstElementChild;
}
