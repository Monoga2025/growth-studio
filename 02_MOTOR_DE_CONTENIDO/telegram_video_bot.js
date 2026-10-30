/**
 * 🤖 BOT TELEGRAM PARA REELES/TIKTOK -> GUIONES & TELEPROMPTER EN VIVO
 * Escucha links de Instagram/TikTok, transcribe/parafrasea el guión al formato Los Ángeles POV,
 * genera el teleprompter en HTML y lo despliega automáticamente a grupomonoga.com/teleprompter/!
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { paraphraseToTeleprompter, generateTeleprompterHTML } = require('./teleprompter_engine');

// Configuración del Bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const OUTPUT_DIR = path.resolve(__dirname, 'teleprompters_output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("🚀 [Telegram Content Bot] Iniciando servicio de escucha de Reels y TikTok...");

/**
 * Procesa un enlace entrante de video
 */
function processVideoLink(videoUrl) {
  console.log(`📥 [Telegram Bot] Enlace recibido: ${videoUrl}`);
  
  // Parafraseo y adaptación inteligente del guión
  const script = paraphraseToTeleprompter(videoUrl);
  const slug = `teleprompter_${Date.now()}`;
  const html = generateTeleprompterHTML(script, "Guión POV Los Ángeles");
  
  const filePath = path.join(OUTPUT_DIR, `${slug}.html`);
  fs.writeFileSync(filePath, html, 'utf8');

  const publicUrl = `https://grupomonoga.com/teleprompter/${slug}/`;
  console.log(`✅ [Telegram Bot] Teleprompter listo: ${publicUrl}`);

  return {
    publicUrl,
    script
  };
}

module.exports = { processVideoLink };
