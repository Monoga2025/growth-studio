/**
 * build_batch_bucaramanga.js
 * Genera UNA demo por cada prospecto real de Bucaramanga (los mismos 10 que
 * quedaron cargados en el CRM de Twenty), y arma una galeria index.html para
 * que John las abra todas desde un solo lugar.
 *
 * Honestidad de datos: la galeria y cada demo usan SOLO los campos reales del
 * archivo de leads. Los bloques que no tienen dato real van marcados como
 * borrador por demo_builder.js. Nunca se inventan metricas, precios ni resenas.
 *
 * Uso: node build_batch_bucaramanga.js
 */

const fs = require('fs');
const path = require('path');
const { buildAutomotiveDemo } = require('./demo_builder');

const LEADS_PATH = path.resolve(
  __dirname, '..', '..', '09_AUTO_REVENUE_ENGINE', 'leads', 'calificados-sin-web-2026-09-29.json'
);
const OUT_DIR = path.resolve(__dirname, 'output_demos', 'bucaramanga');
const IMG_DIR = path.join(OUT_DIR, 'img');
const LIMIT = 10;

function readLeads() {
  const raw = fs.readFileSync(LEADS_PATH, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

/** El MISMO orden con el que se cargaron los prospectos en el CRM. */
function rankedLeads(leads) {
  return leads
    .slice()
    .sort((a, b) => (b.reviewsCount * b.totalScore) - (a.reviewsCount * a.totalScore));
}

/** Nombre de archivo seguro y estable para cada negocio. */
function slugify(title) {
  return String(title)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'negocio';
}

function stars(score) {
  const n = Math.max(0, Math.min(5, Math.round(Number(score) || 0)));
  return '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '');
}

function galleryHtml(items) {
  const cards = items.map((it) => {
    const b = it.business;
    const wa = it.phoneUnformatted ? `https://wa.me/${digitsOnly(it.phoneUnformatted)}` : '';
    const tel = it.phoneUnformatted ? `tel:+${digitsOnly(it.phoneUnformatted)}`
      : (it.phone ? `tel:${String(it.phone).replace(/[^\d+]/g, '')}` : '');
    return `
      <article class="card">
        <a class="card-link" href="${esc(it.file)}">
          <div class="card-top">
            <h2>${esc(b.title)}</h2>
            <span class="badge">${esc(b.categoryName || 'Automotriz')}</span>
          </div>
          <dl class="meta">
            <div><dt>Calificacion</dt><dd>${esc(b.totalScore)} ${esc(stars(b.totalScore))}</dd></div>
            <div><dt>Resenas</dt><dd>${esc(b.reviewsCount)}</dd></div>
            <div><dt>Fotos</dt><dd>${esc(b.imagesCount)}</dd></div>
            <div><dt>Zona</dt><dd>${esc(b.neighborhood || b.city || '')}</dd></div>
          </dl>
          <span class="ver">Ver la pagina \u2192</span>
        </a>
        <div class="acciones">
          ${tel && it.phone ? `<a class="btn" href="${esc(tel)}">${esc(it.phone)}</a>` : '<span class="btn btn--off">Sin telefono</span>'}
          ${wa ? `<a class="btn btn--wa" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Demos Bucaramanga \u2014 Monoga OS</title>
<style>
  :root {
    --bg: #08090f; --panel: #101219; --line: rgba(255,255,255,.09);
    --text: #f2f0eb; --muted: rgba(242,240,235,.62); --gold: #d7bd83; --radius: 14px;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px; line-height: 1.5; }
  .wrap { width: min(100% - 32px, 1080px); margin: 0 auto; padding: 40px 0 64px; }
  header h1 { font-size: clamp(26px, 5vw, 40px); letter-spacing: -.03em; margin: 0 0 6px; }
  header p { color: var(--muted); margin: 0 0 4px; }
  .aviso { margin: 18px 0 30px; padding: 12px 14px; border: 1px solid var(--line);
    border-left: 3px solid var(--gold); border-radius: 10px; color: var(--muted); font-size: 12.5px; }
  .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
  .card { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel);
    overflow: hidden; display: flex; flex-direction: column; }
  .card-link { display: block; padding: 18px; color: inherit; text-decoration: none; flex: 1; }
  .card-link:active { transform: scale(.985); }
  .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .card h2 { font-size: 16px; margin: 0; letter-spacing: -.01em; }
  .badge { flex: none; font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .08em; color: var(--gold); border: 1px solid var(--line);
    border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
  .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 16px; margin: 16px 0 0; }
  .meta dt { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
  .meta dd { margin: 2px 0 0; font-size: 13px; }
  .ver { display: inline-block; margin-top: 16px; font-weight: 700; color: var(--gold); font-size: 12.5px; }
  .acciones { display: flex; gap: 8px; flex-wrap: wrap; padding: 0 18px 18px; }
  .btn { border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px;
    font-size: 12px; color: var(--text); text-decoration: none; }
  .btn--wa { border-color: var(--gold); color: var(--gold); }
  .btn--off { color: var(--muted); opacity: .6; }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .grid { grid-template-columns: repeat(3, 1fr); } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Demos \u2014 Bucaramanga</h1>
    <p>${items.length} negocios reales de estetica automotriz, sin pagina web.</p>
    <p style="font-size:12.5px">Generado desde Google Maps. Datos publicos verificables.</p>
  </header>
  <p class="aviso">
    Cada demo se genera con <strong>datos reales del negocio</strong> (nombre, calificacion,
    resenas, telefono, horarios). Los bloques que no tienen dato real van marcados como
    <em>borrador</em> hasta que el negocio los complete. No hay metricas ni precios inventados.
  </p>
  <div class="grid">
${cards}
  </div>
</div>
</body>
</html>`;
}

function main() {
  if (!fs.existsSync(LEADS_PATH)) {
    console.error(`[ERROR] No se encontro el archivo de leads: ${LEADS_PATH}`);
    process.exitCode = 1;
    return;
  }

  const leads = rankedLeads(readLeads()).slice(0, LIMIT);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const items = [];
  console.log('=== GENERANDO DEMOS ===');
  for (const business of leads) {
    const slug = slugify(business.title);
    const file = `${slug}.html`;
    // Foto REAL del negocio, descargada a disco por fetch_photos.js.
    // Se prefiere el archivo local: la demo no depende de la nube y no se
    // rompe si Google cambia la URL. Si no hay foto local, se cae a la remota.
    const localPhoto = path.join(IMG_DIR, `${slug}.jpg`);
    const imageUrl = fs.existsSync(localPhoto) ? `img/${slug}.jpg` : business.imageUrl;
    const html = buildAutomotiveDemo({
      title: business.title,
      categoryName: business.categoryName,
      totalScore: business.totalScore,
      reviewsCount: business.reviewsCount,
      address: business.address,
      neighborhood: business.neighborhood,
      city: business.city,
      state: business.state,
      phone: business.phone,
      phoneUnformatted: business.phoneUnformatted,
      url: business.url,
      openingHours: business.openingHours,
      imagesCount: business.imagesCount,
      imageUrl,
    });
    fs.writeFileSync(path.join(OUT_DIR, file), html, 'utf8');
    const kb = Math.round(fs.statSync(path.join(OUT_DIR, file)).size / 1024);
    console.log(`  [OK] ${String(business.title).slice(0, 46).padEnd(48)} ${kb} KB  -> ${file}`);
    items.push({
      business, file,
      phone: business.phone || '',
      phoneUnformatted: business.phoneUnformatted || '',
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), galleryHtml(items), 'utf8');
  const total = items.reduce((acc, it) => acc + fs.statSync(path.join(OUT_DIR, it.file)).size, 0);
  console.log('\n=== RESULTADO ===');
  console.log(`  demos generadas : ${items.length}`);
  console.log(`  peso total      : ${Math.round(total / 1024)} KB (sin imagenes remotas)`);
  console.log(`  galeria         : ${path.join(OUT_DIR, 'index.html')}`);
}

main();
