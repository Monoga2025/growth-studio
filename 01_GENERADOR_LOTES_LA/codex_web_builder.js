/**
 * 🎨 CODEX GENERATIVE WEB BUILDER ENGINE (skill-diseno-web-luxury Standard)
 * Implements the Web Design Engineering Standard (skill-diseno-web-luxury):
 * 1) Real Apify Scraped Business Data & Authentic Photography
 * 2) Bento Grid Architecture (KPIs, Quick Actions, Live Activity)
 * 3) Pure Dark Luxury Canvas with Edge-Cast Gaussian Blur Lighting Orbs (blur 130px)
 * 4) Tactile Micro-Interactions (Emil Kowalski rule: scale 0.975, cubic-bezier 0.16, 1, 0.3, 1)
 */

const fs = require('fs');
const path = require('path');
const { ApifyGoogleMapsScraper } = require('./apify_google_maps_scraper');
const { generateMobileAppSite } = require('./mobile_app_builder');

async function buildCodexLABatch() {
  console.log('🚀 [Codex Luxury Web Builder] Iniciando pipeline skill-diseno-web-luxury con imágenes reales de Apify...');

  const scraper = new ApifyGoogleMapsScraper();
  const prospects = await scraper.scrapeLAMarket('medspa', 'Pasadena, CA', 5);

  const outputDir = path.resolve(__dirname, 'output_demos');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generatedList = [];

  for (const prospect of prospects) {
    const slug = prospect.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 28);
    const livePublicUrl = `https://grupomonoga.com/la/${slug}/`;
    prospect.livePublicUrl = livePublicUrl;

    const htmlContent = generateMobileAppSite(prospect);
    const filePath = path.join(outputDir, `${slug}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');

    generatedList.push({
      name: prospect.name,
      address: prospect.address,
      phone: prospect.phone,
      slug: slug,
      htmlPath: filePath,
      liveUrl: livePublicUrl
    });

    console.log(`✨ [Luxury Web App Pro Max] ${prospect.name} generada -> ${filePath}`);
  }

  // Generate printable QR Cards
  const cardsHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Tarjetas QR Imprimibles - Los Ángeles Luxury Demos</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { background: white; color: black; }
      .no-print { display: none; }
      .qr-card { page-break-inside: avoid; border: 1px solid #ddd !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #030712; color: #f3f4f6; }
    .qr-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.12); }
  </style>
</head>
<body class="p-8">
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between border-b border-gray-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold text-white">🌴 Tarjetas de Demostración QR (skill-diseno-web-luxury)</h1>
        <p class="text-sm text-gray-400">Imágenes reales extraídas por Apify • Estándar UI/UX Pro Max</p>
      </div>
      <button onclick="window.print()" class="no-print bg-pink-600 hover:bg-pink-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
        🖨️ Imprimir / Guardar PDF
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${generatedList.map(p => `
        <div class="qr-card p-6 rounded-3xl shadow-2xl flex flex-col justify-between border border-pink-500/20">
          <div>
            <span class="text-[10px] uppercase tracking-widest text-pink-400 font-bold block mb-1">Muestra Exclusiva de Maquetación Luxury</span>
            <h2 class="text-lg font-bold text-white">${p.name}</h2>
            <p class="text-xs text-gray-400">${p.address}</p>
          </div>

          <div class="my-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl w-52 h-52 mx-auto shadow-2xl">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(p.liveUrl)}" alt="QR Code" class="w-40 h-40 object-contain">
            <span class="text-[9px] text-gray-700 font-mono mt-1 font-bold text-center block overflow-hidden text-ellipsis w-48">${p.liveUrl}</span>
          </div>

          <div class="text-center space-y-1">
            <span class="text-[11px] font-semibold text-white block">Escanear con la Cámara del iPhone</span>
            <p class="text-[10px] text-gray-400">Web App Luxury • Fotos Reales de Apify</p>
            <span class="text-[9px] text-pink-400 font-mono block mt-2">Monoga Studios LA • Support: ${p.phone}</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

  const cardsPath = path.join(outputDir, 'tarjetas_qr_codex_imprimibles.html');
  fs.writeFileSync(cardsPath, cardsHtml, 'utf8');
  console.log(`\n🎉 Tarjetas QR Imprimibles de Codex actualizadas en: ${cardsPath}`);
}

if (require.main === module) {
  buildCodexLABatch();
}

module.exports = { buildCodexLABatch };
