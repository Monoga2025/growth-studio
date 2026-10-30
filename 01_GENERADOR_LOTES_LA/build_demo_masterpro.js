/**
 * build_demo_masterpro.js
 * Runner de demostración para MASTER PRO Pintura automotriz (Bucaramanga).
 *
 * Lee el registro real desde el archivo de leads calificados, mapea sus
 * campos y genera la demo con demo_builder.js. Nunca genera con datos
 * vacíos: si no encuentra el negocio, sale con código 1.
 *
 * Uso: node build_demo_masterpro.js
 */

const fs = require('fs');
const path = require('path');
const { buildAutomotiveDemo } = require('./demo_builder');

const LEADS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '09_AUTO_REVENUE_ENGINE',
  'leads',
  'calificados-sin-web-2026-09-29.json'
);
const OUTPUT_PATH = path.resolve(__dirname, 'output_demos', 'master_pro_bucaramanga.html');
const TARGET = 'MASTER PRO';

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function readLeads() {
  const raw = fs.readFileSync(LEADS_PATH, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

function main() {
  if (!fs.existsSync(LEADS_PATH)) {
    fail(`No se encontró el archivo de leads: ${LEADS_PATH}`);
    return;
  }

  let leads;
  try {
    leads = readLeads();
  } catch (error) {
    fail(`No se pudo leer o parsear el archivo de leads: ${error.message}`);
    return;
  }

  const target = TARGET.toLowerCase();
  const business = leads.find(
    (lead) => lead && typeof lead.title === 'string' && lead.title.toLowerCase().includes(target)
  );

  if (!business) {
    fail(`No se encontró ningún negocio cuyo título contenga "${TARGET}". No se genera demo.`);
    return;
  }

  const payload = {
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
    imageUrl: business.imageUrl,
  };

  const html = buildAutomotiveDemo(payload);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');

  const size = fs.statSync(OUTPUT_PATH).size;
  console.log(`Negocio: ${business.title}`);
  console.log(`Archivo generado: ${OUTPUT_PATH}`);
  console.log(`Tamaño: ${size} bytes`);
}

main();
