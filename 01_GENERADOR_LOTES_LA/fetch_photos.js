/**
 * fetch_photos.js
 * Descarga la foto de portada REAL (Google Maps) de cada prospecto de
 * Bucaramanga a disco, en alta resolucion, para incrustarla en su demo.
 *
 * Por que local y no hotlink: el usuario quiere que todo funcione sin depender
 * de la nube, y una demo no deberia romperse si Google cambia la URL.
 *
 * Las fotos son del propio negocio, publicas en su ficha de Google Maps, y se
 * usan para mostrarle a ESE negocio como se veria su sitio.
 *
 * Uso: node fetch_photos.js
 */

const fs = require('fs');
const path = require('path');

const LEADS_PATH = path.resolve(
  __dirname, '..', '..', '09_AUTO_REVENUE_ENGINE', 'leads', 'calificados-sin-web-2026-09-29.json'
);
const OUT_DIR = path.resolve(__dirname, 'output_demos', 'bucaramanga');
const IMG_DIR = path.join(OUT_DIR, 'img');
const LIMIT = 10;

/** Resolucion alta: reemplaza cualquier sufijo de tamano por =s1600. */
function hiRes(url) {
  const s = String(url || '');
  if (!s) return '';
  return s.includes('=') ? s.replace(/=[^=]*$/, '=s1600') : s;
}

function slugify(title) {
  return String(title)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'negocio';
}

function readLeads() {
  const raw = fs.readFileSync(LEADS_PATH, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`respuesta demasiado chica (${buf.length} bytes)`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const leads = readLeads()
    .slice()
    .sort((a, b) => (b.reviewsCount * b.totalScore) - (a.reviewsCount * a.totalScore))
    .slice(0, LIMIT);

  console.log('=== DESCARGANDO PORTADAS REALES ===');
  let ok = 0;
  const manifest = {};

  for (const b of leads) {
    const slug = slugify(b.title);
    const file = `${slug}.jpg`;
    const dest = path.join(IMG_DIR, file);
    const src = b.imageUrl;

    if (!src) {
      console.log(`  [SKIP] ${String(b.title).slice(0, 44).padEnd(46)} sin foto en el lead`);
      continue;
    }
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      console.log(`  [=]    ${String(b.title).slice(0, 44).padEnd(46)} ya existia`);
      manifest[slug] = file; ok++;
      continue;
    }
    try {
      const bytes = await download(hiRes(src), dest);
      manifest[slug] = file; ok++;
      console.log(`  [OK]   ${String(b.title).slice(0, 44).padEnd(46)} ${Math.round(bytes / 1024)} KB -> img/${file}`);
    } catch (e) {
      console.log(`  [ERR]  ${String(b.title).slice(0, 44).padEnd(46)} ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  fs.writeFileSync(path.join(IMG_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  const total = Object.values(manifest)
    .map((f) => fs.statSync(path.join(IMG_DIR, f)).size)
    .reduce((a, b) => a + b, 0);

  console.log('\n=== RESULTADO ===');
  console.log(`  fotos descargadas : ${ok}/${leads.length}`);
  console.log(`  peso total        : ${Math.round(total / 1024)} KB`);
  console.log(`  carpeta           : ${IMG_DIR}`);
}

main().catch((e) => { console.error('[ERROR]', e.message); process.exitCode = 1; });
