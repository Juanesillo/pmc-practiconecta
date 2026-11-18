#!/usr/bin/env node
/**
 * Captura las pantallas reales del MVP para el póster.
 * Uso: DEMO=1 node poster/shots.js [baseUrl]
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:3177';
const OUT = path.join(__dirname, 'assets');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

const SHOTS = [
  { file: 'shot-explorar.png', email: 'juan@demo.com',          route: 'explorar', clip: { x: 340, y: 178, width: 940, height: 418 } },
  { file: 'shot-docente.png',  email: 'martha.gil@demo.edu.co', route: 'casos/1',  clip: { x: 410, y: 130, width: 870, height: 565 } },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=2'],
  });
  for (const s of SHOTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1700, deviceScaleFactor: 2 });
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    const ok = await page.evaluate(async email => {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'demo1234' }),
      });
      return r.ok;
    }, s.email);
    if (!ok) { console.error(`login falló: ${s.email}`); await page.close(); continue; }
    await page.goto(`${BASE}/#/${s.route}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: path.join(OUT, s.file), clip: s.clip });
    console.log(`-> ${s.file}`);
    await page.close();
  }
  await browser.close();
})();
