import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.TEST_URL || 'http://127.0.0.1:4190';
const output = 'test-results/visual/hud-prototypes';
const sizes = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];
const states = [
  { name: 'full', values: { health: 100, food: 100, water: 100, energy: 100 } },
  { name: 'mixed', values: { health: 55, food: 30, water: 70, energy: 90 } },
  { name: 'critical', values: { health: 8, food: 12, water: 4, energy: 10 } },
];
const hudCss = await readFile('src/ui/hud.css', 'utf8');
const browser = await chromium.launch({
  executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const report = [];
await mkdir(output, { recursive: true });

try {
  for (const viewport of sizes) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: viewport.name === 'mobile',
      hasTouch: viewport.name === 'mobile',
    });
    const page = await context.newPage();
    await page.route('**/hud-prototype*', (route) => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html>
        <html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden}
          body{background:#405947;color:#eee6cd;font-family:system-ui,sans-serif}
          .preview-world{position:absolute;inset:0;background:linear-gradient(180deg,#78836a 0%,#78836a 44%,#647b58 44%,#647b58 100%)}
          .preview-world:before{content:"";position:absolute;inset:0;background-image:linear-gradient(#263e3920 1px,transparent 1px),linear-gradient(90deg,#263e3920 1px,transparent 1px);background-size:32px 32px}
          .preview-house{position:absolute;top:48%;left:42%;width:180px;height:95px;background:linear-gradient(180deg,#9c674b 0 17%,#d1b78a 17% 100%);border:4px solid #554b3b;box-shadow:0 12px 0 #344b37}
          .preview-house:before{content:"";position:absolute;left:-18px;top:-30px;width:calc(100% + 28px);height:34px;background:#754a3e;border:4px solid #473b35}
          .preview-player{position:absolute;top:66%;left:50%;width:16px;height:24px;background:#dbb68d;border:4px solid #31423a;box-shadow:0 10px 0 -2px #31423a}
          #hud{position:absolute;inset:0 0 auto;z-index:10}
          #countdown{position:absolute;z-index:8;top:106px;left:50%;transform:translateX(-50%);padding:10px 14px;background:#142b29e8;border:1px solid #d5dec447;text-align:center}
          #countdown span{display:block;color:#b9c5af;font:8px monospace;letter-spacing:1px}
          #countdown strong{display:block;margin-top:3px;color:#f0c484;font:23px monospace}
          #objectives{position:absolute;z-index:8;top:112px;left:30px;width:230px;padding:12px 14px;background:#142b29e8;border-left:2px solid #e3b271}
          #objectives .eyebrow{font:600 8px monospace;letter-spacing:1px;color:#e3b271}
          #objectives p{margin:8px 0 0;font-size:11px;line-height:1.5}
          #objectives small{display:block;margin-top:9px;color:#b9c5af;font:8px monospace}
          ${hudCss}
          @media(max-width:700px){
            #countdown{top:calc(env(safe-area-inset-top) + 168px);left:auto;right:calc(env(safe-area-inset-right) + 8px);transform:none;padding:7px 9px}
            #countdown span{display:none}
            #countdown strong{font-size:19px;line-height:1;margin:0}
            #objectives{top:calc(env(safe-area-inset-top) + 168px);left:calc(env(safe-area-inset-left) + 8px);width:min(58vw,230px);max-width:calc(100vw - 130px);padding:8px 10px}
            #objectives p{font-size:9px;line-height:1.35;margin:3px 0}
            #objectives small{display:none}
          }
        </style></head>
        <body><div class="preview-world"><div class="preview-house"></div><div class="preview-player"></div></div>
          <header id="hud"></header>
          <div id="countdown"><span>O PRÓLOGO TERMINA EM</span><strong>00:30</strong></div>
          <aside id="objectives"><span class="eyebrow">OS ÚLTIMOS 30 SEGUNDOS</span><p>01 &nbsp; Saque dinheiro no banco →</p><p>02 &nbsp; Escolha reservas no mercado →</p><small>WASD mover · Shift correr · E interagir</small></aside>
          <script type="module">
            import { createHUDMarkup, updateVitals, vitalUnitCount } from './src/ui/hud.js';
            const states = {
              full: { health: 100, food: 100, water: 100, energy: 100 },
              mixed: { health: 55, food: 30, water: 70, energy: 90 },
              critical: { health: 8, food: 12, water: 4, energy: 10 }
            };
            const units = vitalUnitCount();
            const hud = document.querySelector('#hud');
            hud.innerHTML = createHUDMarkup(units);
            hud.querySelector('[data-hud-day]').textContent = 'DIA 01';
            hud.querySelector('.game-hud__clock-value').textContent = '10:00';
            hud.querySelector('#money').textContent = 'R$ 1.500';
            hud.querySelector('#weather').textContent = 'SOL · 27° · LUZ / ÁGUA';
            updateVitals(hud, states[new URL(location.href).searchParams.get('state')], units);
          </script>
        </body></html>`,
    }));

    for (const state of states) {
      await page.goto(`${base}/hud-prototype?state=${state.name}`, { waitUntil: 'networkidle' });
      await page.locator('.game-vital__icon').first().waitFor();
      const actual = await page.evaluate(() => ({
        unitCount: Number(document.querySelector('.game-vitals').dataset.unitCount),
        groups: [...document.querySelectorAll('.game-vital')].map((group) => ({
          value: group.getAttribute('aria-valuenow'),
          fills: [...group.querySelectorAll('.game-vital__unit')].map((unit) => unit.dataset.state),
          icons: [...group.querySelectorAll('.game-vital__unit')].map((unit) => {
            const { width, height } = unit.getBoundingClientRect();
            return { width, height };
          }),
        })),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        hudBottom: document.querySelector('#hud').getBoundingClientRect().bottom,
        objectivesTop: document.querySelector('#objectives').getBoundingClientRect().top,
        countdownTop: document.querySelector('#countdown').getBoundingClientRect().top,
      }));
      await page.screenshot({ path: `${output}/${viewport.name}-${state.name}.png` });
      const expectedUnits = viewport.width <= 1150 ? 5 : 10;
      assert.equal(actual.unitCount, expectedUnits, `${viewport.name}/${state.name}: responsive icon count`);
      assert.equal(actual.groups.length, 4, `${viewport.name}/${state.name}: four attributes`);
      assert.equal(actual.horizontalOverflow, false, `${viewport.name}/${state.name}: no horizontal overflow`);
      assert.deepEqual(actual.groups.map((group) => group.value), Object.values(state.values).map(String));
      assert.ok(actual.groups.flatMap((group) => group.icons).every(({ width, height }) => Math.abs(width - height) < 0.1));
      assert.ok(actual.hudBottom < actual.objectivesTop, `${viewport.name}/${state.name}: HUD overlaps instructions`);
      if (state.name === 'mixed' && expectedUnits === 10) {
        assert.deepEqual(actual.groups[0].fills, [...Array(5).fill('full'), 'partial', ...Array(4).fill('empty')]);
        assert.deepEqual(actual.groups[1].fills, [...Array(3).fill('full'), ...Array(7).fill('empty')]);
        assert.deepEqual(actual.groups[2].fills, [...Array(7).fill('full'), ...Array(3).fill('empty')]);
        assert.deepEqual(actual.groups[3].fills, [...Array(9).fill('full'), 'empty']);
      }
      if (state.name === 'mixed' && expectedUnits === 5) {
        assert.deepEqual(actual.groups[0].fills, ['full', 'full', 'partial', 'empty', 'empty']);
        assert.deepEqual(actual.groups[1].fills, ['full', 'partial', 'empty', 'empty', 'empty']);
        assert.deepEqual(actual.groups[2].fills, ['full', 'full', 'full', 'partial', 'empty']);
        assert.deepEqual(actual.groups[3].fills, ['full', 'full', 'full', 'full', 'partial']);
      }
      report.push({ viewport: viewport.name, state: state.name, ...actual });
    }
    await context.close();
  }
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.map(({ viewport, state, unitCount }) => ({ viewport, state, unitCount })), null, 2));
} finally {
  await browser.close();
}
