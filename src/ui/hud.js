export const VITALS = [
  { key: 'health', name: 'SAÚDE', color: '#e26762', path: 'M1 5h2V3h4v2h2V3h4v2h2v5h-2v2h-2v2H9v1H7v-1H5v-2H3v-2H1z' },
  { key: 'food', name: 'SACIEDADE', color: '#e2b85f', path: 'M3 4h2V3h6v1h2v2h2v5h-2v2H3v-2H1V6h2z' },
  { key: 'water', name: 'HIDRATAÇÃO', color: '#69b9df', path: 'M7 1h2v2h2v2h2v2h2v4h-2v2h-2v2H5v-2H3v-2H1V7h2V5h2V3h2z' },
  { key: 'energy', name: 'ENERGIA', color: '#bd91dc', path: 'M8 1h6v2h-2v3h3v2h-2v3h-2v3h-2v1H8v-4h2V9H5V7h2V4h1z' }
];

export function vitalFill(value, index) {
  if (!Number.isFinite(value) || !Number.isInteger(index) || index < 0 || index >= 10) {
    throw new RangeError('Valor ou posição do ícone inválidos.');
  }
  const amount = Math.max(0, Math.min(10, value - index * 10));
  return { state: amount === 10 ? 'full' : amount === 0 ? 'empty' : 'partial', fill: amount * 10 };
}

function icon(path, className = '') {
  return `<svg class="${className}" viewBox="0 0 16 16" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
}

export function createVitalsMarkup() {
  return VITALS.map(({ key, name, color, path }) => `
    <div class="vital" data-vital="${key}" role="meter" aria-label="${name}" aria-valuemin="0" aria-valuemax="100" style="--vital:${color}">
      ${icon(path, 'vital-symbol')}
      <span class="vital-label">${name}</span>
      <b class="vital-value"></b>
      <div class="vital-units" aria-hidden="true">${Array.from({ length: 10 }, (_, index) => `
        <span class="vital-unit is-empty" data-unit="${index}">
          ${icon(path, 'vital-unit-base')}
          ${icon(path, 'vital-unit-fill')}
        </span>`).join('')}
      </div>
    </div>`).join('');
}

export function updateVitals(root, player) {
  let healthDropped = false;
  for (const { key, name } of VITALS) {
    const value = player[key];
    if (!Number.isFinite(value)) throw new TypeError(`Valor inválido para ${name}.`);
    const stat = root.querySelector(`[data-vital="${key}"]`);
    if (!stat) throw new Error(`Indicador ausente: ${name}.`);
    const previous = stat.dataset.value;
    const current = String(value);
    if (previous !== current) {
      healthDropped ||= key === 'health' && previous !== undefined && value < Number(previous);
      stat.dataset.value = current;
      stat.setAttribute('aria-valuenow', current);
      stat.title = `${name}: ${Math.round(value)} de 100`;
      stat.classList.toggle('low', value < 20);
      stat.querySelector('.vital-value').textContent = String(Math.round(value));
      for (const unit of stat.querySelectorAll('.vital-unit')) {
        const { state, fill } = vitalFill(value, Number(unit.dataset.unit));
        if (unit.dataset.state !== state) {
          unit.dataset.state = state;
          unit.className = `vital-unit is-${state}`;
        }
        const fillValue = `${fill}%`;
        if (unit.style.getPropertyValue('--fill') !== fillValue) unit.style.setProperty('--fill', fillValue);
      }
    }
  }
  return healthDropped;
}
