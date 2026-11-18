#!/usr/bin/env node

/**
 * UniServ Real-world Traffic & Analytics Simulator
 * 
 * Simula tráfico realista con un navegador real (Chromium / Google Chrome headless)
 * para disparar eventos reales de Google Analytics (GA4 - gtag.js):
 * - page_view (landing y rutas virtuales)
 * - cta_click (audiencias: cliente, estudiante, universidad)
 * - generate_lead (conversión de formulario de afiliación universitaria)
 * - view_search_results / form_start / scroll depth
 * - Tiempos de permanencia y engagement realistas
 * - Fuentes de tráfico orgánico, social (Instagram, LinkedIn), directo y campañas UTM
 * - Emulación de dispositivos móviles y de escritorio aleatorios
 */

const puppeteer = require('puppeteer-core');
const path = require('path');

// Configuración de destino y navegador
const DEFAULT_URL = 'https://uniserv.dvergaram.dev/';
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable' || '/usr/bin/chromium';

// Argumentos CLI
const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}
const hasFlag = flag => args.includes(flag);

const TARGET_URL = getArg('--url', DEFAULT_URL);
const IS_CONTINUOUS = hasFlag('--continuous') || hasFlag('-c');
const IS_HEADFUL = hasFlag('--headful') || hasFlag('--visible');
const CONCURRENCY = parseInt(getArg('--concurrency', '1'), 10);
const TOTAL_VISITORS = IS_CONTINUOUS ? Infinity : parseInt(getArg('--count', '5'), 10);
const SELECTED_PERSONA = getArg('--persona', 'all');

// Perfiles de Dispositivos (resolución, user-agent, touch)
const DEVICES = [
  {
    name: 'Desktop Windows (Chrome)',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080, isMobile: false, hasTouch: false }
  },
  {
    name: 'Desktop MacOS (Safari)',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    viewport: { width: 1440, height: 900, isMobile: false, hasTouch: false }
  },
  {
    name: 'Mobile iPhone 15 Pro (Safari)',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    viewport: { width: 393, height: 852, isMobile: true, hasTouch: true }
  },
  {
    name: 'Mobile Samsung Galaxy S23 (Chrome)',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    viewport: { width: 412, height: 915, isMobile: true, hasTouch: true }
  }
];

// Fuentes de adquisición de tráfico (Referrers y parámetros UTM para GA4)
const TRAFFIC_SOURCES = [
  { name: 'Google (Orgánico)', referrer: 'https://www.google.com/', urlSuffix: '' },
  { name: 'Directo (Navegador)', referrer: '', urlSuffix: '' },
  { name: 'Instagram Stories', referrer: 'https://l.instagram.com/', urlSuffix: '?utm_source=instagram&utm_medium=stories&utm_campaign=lanzamiento' },
  { name: 'Instagram Perfil', referrer: 'https://l.instagram.com/', urlSuffix: '?utm_source=instagram&utm_medium=bio&utm_campaign=comunidad' },
  { name: 'LinkedIn Publicación', referrer: 'https://www.linkedin.com/', urlSuffix: '?utm_source=linkedin&utm_medium=social&utm_campaign=talento_universitario' },
  { name: 'Portal Universidad Nacional', referrer: 'https://unal.edu.co/', urlSuffix: '?utm_source=unal&utm_medium=referral&utm_campaign=convenio' },
  { name: 'Portal Universidad de Antioquia', referrer: 'https://udea.edu.co/', urlSuffix: '?utm_source=udea&utm_medium=referral&utm_campaign=consultorio' },
  { name: 'WhatsApp Compartido', referrer: 'https://web.whatsapp.com/', urlSuffix: '?utm_source=whatsapp&utm_medium=chat&utm_campaign=recomendacion' }
];

// Datos aleatorios verosímiles para formularios de leads institucionales
const UNIVERSITIES_DATA = [
  { name: 'Dra. Claudia Patricia Morales', uni: 'Universidad Nacional de Colombia', faculty: 'Derecho' },
  { name: 'Dr. Alejandro Restrepo Vélez', uni: 'Pontificia Universidad Javeriana', faculty: 'Psicología' },
  { name: 'Dra. María Fernanda Henao', uni: 'Universidad de Antioquia', faculty: 'Odontología' },
  { name: 'Ing. Carlos Alberto Cuervo', uni: 'Universidad de los Andes', faculty: 'Ingeniería' },
  { name: 'Dr. Mauricio Gómez Londoño', uni: 'Universidad del Valle', faculty: 'Derecho' },
  { name: 'Dra. Silvia Juliana Cadavid', uni: 'Universidad del Norte', faculty: 'Psicología' },
  { name: 'Dr. Fernando Salazar Ruiz', uni: 'Universidad Pontificia Bolivariana', faculty: 'Diseño' }
];

// Funciones auxiliares
const sleep = ms => new Promise(r => setTimeout(r, ms));
const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Estadísticas de la sesión
const stats = {
  totalVisitors: 0,
  pageViews: 0,
  ctaClicks: 0,
  leadsGenerated: 0,
  loginAttempts: 0,
  errors: 0
};

/**
 * Simula desplazamiento suave y humano para registrar engagement y scroll depth
 */
async function humanScroll(page, steps = 3) {
  for (let i = 0; i < steps; i++) {
    const scrollAmount = randomInt(250, 550);
    await page.evaluate(y => window.scrollBy({ top: y, behavior: 'smooth' }), scrollAmount);
    await sleep(randomInt(900, 2200));
  }
}

/**
 * Ejecuta una sesión de usuario simulada con comportamiento humano
 */
async function runVisitorSession(visitorNumber) {
  const device = randomChoice(DEVICES);
  const source = randomChoice(TRAFFIC_SOURCES);
  const fullUrl = TARGET_URL.replace(/\/$/, '') + '/' + source.urlSuffix;

  // Selección de persona
  let persona = SELECTED_PERSONA;
  if (persona === 'all') {
    const roll = Math.random();
    if (roll < 0.20) persona = 'bounce';          // 20% Rebota pronto
    else if (roll < 0.45) persona = 'explore';     // 25% Lee secciones (scroll + nav)
    else if (roll < 0.65) persona = 'client_cta';  // 20% Interesado en contratar
    else if (roll < 0.80) persona = 'student_cta'; // 15% Interesado en ofrecer servicio
    else if (roll < 0.92) persona = 'lead';        // 12% Llena afiliación universitaria
    else persona = 'login_view';                   // 8%  Abre modal de inicio de sesión
  }

  console.log(`\n======================================================`);
  console.log(`👤 Visitante #${visitorNumber} iniciando sesión`);
  console.log(`📱 Dispositivo : ${device.name}`);
  console.log(`🌐 Canal       : ${source.name} ${source.referrer ? `[Referrer: ${source.referrer}]` : ''}`);
  console.log(`🎯 Perfil      : [${persona.toUpperCase()}]`);
  console.log(`======================================================`);

  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: !IS_HEADFUL,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(device.userAgent);
    await page.setViewport(device.viewport);

    // Monitorear y registrar eventos reales enviados a Google Analytics
    page.on('request', req => {
      const u = req.url();
      if (u.includes('google-analytics.com/g/collect') || u.includes('analytics.google.com')) {
        stats.pageViews++;
        try {
          const parsed = new URL(u);
          const ev = parsed.searchParams.get('en') || 'collect';
          console.log(`  📊 [GA4 Telemetría] -> Evento registrado: "${ev}"`);
        } catch (_) {}
      }
    });

    // Encabezado de referencia si proviene de una red social o buscador
    if (source.referrer) {
      await page.setExtraHTTPHeaders({ 'Referer': source.referrer });
    }

    // 1. Cargar el sitio
    console.log(`  ⏳ Cargando ${fullUrl} ...`);
    await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 35000 });
    console.log(`  ✅ Título de página: "${await page.title()}"`);
    await sleep(randomInt(1500, 2800));

    // 2. Acciones según el perfil asignado
    switch (persona) {
      case 'bounce': {
        console.log(`  👀 El visitante mira el encabezado, hace un breve scroll y abandona.`);
        await humanScroll(page, 1);
        await sleep(randomInt(2000, 4500));
        break;
      }

      case 'explore': {
        console.log(`  📖 Navegando por el sitio: leyendo cómo funciona y beneficios...`);
        // Desplazamiento a Cómo funciona
        const howBtn = await page.$('button[data-act="scroll"][data-to="como-funciona"]');
        if (howBtn) {
          await howBtn.click();
          await sleep(randomInt(2000, 3500));
        }
        await humanScroll(page, 2);

        // Desplazamiento a Beneficios
        const benBtn = await page.$('button[data-act="scroll"][data-to="beneficios"]');
        if (benBtn) {
          await benBtn.click();
          await sleep(randomInt(2000, 3500));
        }
        await humanScroll(page, 2);
        console.log(`  ✨ Lectura de propuesta de valor completada.`);
        break;
      }

      case 'client_cta': {
        console.log(`  🔍 Visitante interesado en servicios. Clic en 'Soy cliente'...`);
        await humanScroll(page, 1);
        await sleep(1000);
        const btn = await page.$('button[data-act="cta-client"]');
        if (btn) {
          await btn.click();
          stats.ctaClicks++;
          console.log(`  👉 Clic registrado: 'cta_click' (audiencia: cliente)`);
          await sleep(randomInt(2500, 4000));

          // Cerrar el modal
          const closeBtn = await page.$('[data-act="access-close"]');
          if (closeBtn) {
            await closeBtn.click();
            await sleep(1200);
          }
        }
        break;
      }

      case 'student_cta': {
        console.log(`  🎓 Estudiante evaluando publicar servicios. Clic en 'Soy estudiante'...`);
        await humanScroll(page, 1);
        await sleep(1000);
        const btn = await page.$('button[data-act="cta-student"]');
        if (btn) {
          await btn.click();
          stats.ctaClicks++;
          console.log(`  👉 Clic registrado: 'cta_click' (audiencia: estudiante)`);
          await sleep(randomInt(2500, 4000));

          // Cerrar el modal
          const closeBtn = await page.$('[data-act="access-close"]');
          if (closeBtn) {
            await closeBtn.click();
            await sleep(1200);
          }
        }
        break;
      }

      case 'lead': {
        console.log(`  🏛️ Representante de facultad solicitando afiliación (Conversión)...`);
        await humanScroll(page, 1);
        const uniBtn = await page.$('button[data-act="cta-uni"]');
        if (uniBtn) {
          await uniBtn.click();
          stats.ctaClicks++;
          console.log(`  👉 Clic en "AFILIARSE CON NOSOTROS"`);
          await sleep(1500);

          const lead = randomChoice(UNIVERSITIES_DATA);
          console.log(`  ✍️ Diligenciando solicitud institucional: ${lead.name} (${lead.uni} · ${lead.faculty})`);

          await page.waitForSelector('form[data-form="affiliate"]', { timeout: 6000 });
          await page.type('input[name="uni"]', lead.uni, { delay: 35 });
          await page.select('select[name="faculty"]', lead.faculty);
          await page.type('input[name="name"]', lead.name, { delay: 35 });

          const cleanName = lead.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '.');
          await page.type('input[name="email"]', `${cleanName}@edu.co`, { delay: 30 });
          await sleep(1200);

          const submitBtn = await page.$('form[data-form="affiliate"] button[type="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            stats.leadsGenerated++;
            console.log(`  🏆 Formulario enviado correctamente -> Evento 'generate_lead' registrado!`);
            await sleep(2500);
          }
        }
        break;
      }

      case 'login_view': {
        console.log(`  🔑 Visitante haciendo clic en Iniciar Sesión...`);
        const loginBtn = await page.$('button[data-act="open-login"]');
        if (loginBtn) {
          await loginBtn.click();
          stats.loginAttempts++;
          await sleep(randomInt(2000, 4000));

          // Simular clic en pestaña de registro
          const regTab = await page.$('button[data-tab="register"]');
          if (regTab) {
            await regTab.click();
            await sleep(1500);
          }

          const closeBtn = await page.$('[data-act="access-close"]');
          if (closeBtn) {
            await closeBtn.click();
            await sleep(1000);
          }
        }
        break;
      }
    }

    // Tiempo de permanencia antes de salir (Engagement time en GA4)
    const dwellTime = randomInt(2000, 4500);
    await sleep(dwellTime);

    stats.totalVisitors++;
    console.log(`🏁 Sesión concluida para Visitante #${visitorNumber}`);
  } catch (err) {
    stats.errors++;
    console.error(`❌ Incidencia en visitante #${visitorNumber}:`, err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Muestra el panel de métricas consolidado
 */
function printSummary() {
  console.log(`\n======================================================`);
  console.log(`📊 REPORTE DE TRÁFICO SIMULADO EN VIVO`);
  console.log(`======================================================`);
  console.log(`👥 Visitantes completados : ${stats.totalVisitors}`);
  console.log(`📈 Eventos GA4 disparados : ${stats.pageViews}`);
  console.log(`🎯 Clics en CTAs clave    : ${stats.ctaClicks}`);
  console.log(`🏆 Conversiones de leads  : ${stats.leadsGenerated}`);
  console.log(`🔑 Aperturas de acceso    : ${stats.loginAttempts}`);
  console.log(`⚠️  Errores                : ${stats.errors}`);
  console.log(`======================================================\n`);
}

/**
 * Punto de entrada principal
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 UniServ Traffic & Analytics Simulator v1.1.0          ║
║   Simulación de tráfico real sobre:                        ║
║   ${TARGET_URL.padEnd(56)} ║
╚════════════════════════════════════════════════════════════╝
  Modo          : ${IS_CONTINUOUS ? 'Continuo (en bucle hasta presionar Ctrl+C)' : `Por lotes (${TOTAL_VISITORS} visitantes)`}
  Concurrencia  : ${CONCURRENCY} usuario(s) simultáneo(s)
  Navegador     : ${IS_HEADFUL ? 'Visible (con interfaz gráfica)' : 'Headless (en segundo plano)'}
  Binario Chrome: ${CHROME_PATH}
`);

  process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo simulador de tráfico...');
    printSummary();
    process.exit(0);
  });

  let currentVisitor = 1;

  while (currentVisitor <= TOTAL_VISITORS) {
    if (CONCURRENCY <= 1) {
      await runVisitorSession(currentVisitor);
      currentVisitor++;
    } else {
      const batch = [];
      for (let i = 0; i < CONCURRENCY && currentVisitor <= TOTAL_VISITORS; i++) {
        batch.push(runVisitorSession(currentVisitor));
        currentVisitor++;
      }
      await Promise.all(batch);
    }

    if (currentVisitor <= TOTAL_VISITORS) {
      const waitTime = IS_CONTINUOUS ? randomInt(5000, 15000) : randomInt(1500, 3500);
      console.log(`\n⏱️ Esperando ${(waitTime / 1000).toFixed(1)}s antes del próximo visitante para mantener naturalidad...`);
      await sleep(waitTime);
    }
  }

  printSummary();
}

main().catch(err => {
  console.error('Error fatal al ejecutar la simulación:', err);
  process.exit(1);
});
