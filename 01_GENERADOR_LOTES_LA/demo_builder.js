/**
 * demo_builder.js
 * Generador de demos web reales para negocios locales (Monoga OS).
 *
 * PRINCIPIO RECTOR: honestidad de datos.
 * Solo se renderiza lo que viene en el registro real del negocio.
 * Si un campo falta, su bloque completo se omite. Las secciones que el
 * dueño debe completar (servicios, galería) van como placeholders
 * claramente marcados, nunca con contenido inventado.
 *
 * Cero dependencias externas: sin CDN, sin fuentes remotas, sin librerías.
 * CSS embebido, fuentes del sistema, español neutro (Colombia).
 */

/* ----------------------------- utilidades ----------------------------- */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function firstPresent(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

/** WhatsApp requiere solo dígitos, sin "+", espacios ni guiones. */
function whatsappLink(phoneUnformatted) {
  const digits = String(phoneUnformatted || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

/** Iniciales del negocio para el fallback del hero. */
function businessInitials(name) {
  const words = String(name || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Normaliza el texto de horario que entrega el scraper:
 * - espacios finos / no separables -> espacio normal
 * - "AM"/"PM" -> "a. m." / "p. m." (formato es-CO)
 * No altera la información real (números, "Cerrado").
 */
function formatHours(raw) {
  if (raw === null || raw === undefined) return '';
  let text = String(raw).trim();
  if (!text) return '';
  text = text.replace(/[\u202F\u00A0]/g, ' ');
  text = text.replace(/\bAM\b/gi, 'a. m.').replace(/\bPM\b/gi, 'p. m.');
  text = text.replace(/\s+to\s+/gi, ' – ');
  return text.replace(/\s{2,}/g, ' ').trim();
}

const SPANISH_DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function todayName(date) {
  const ref = date instanceof Date ? date : new Date();
  return SPANISH_DAYS[ref.getDay()];
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/* --------------------------- bloques de UI --------------------------- */

function kpiHtml(label, value, hint) {
  return `
      <div class="kpi tap">
        <span class="kpi-label">${escapeHtml(label)}</span>
        <span class="kpi-value">${escapeHtml(value)}</span>
        ${hint ? `<span class="kpi-hint">${escapeHtml(hint)}</span>` : ''}
      </div>`;
}

function actionHtml(href, className, label, icon, external) {
  const target = external ? ' target="_blank" rel="noopener"' : '';
  return `
      <a class="action ${className} tap" href="${escapeAttr(href)}"${target}>
        <span class="action-icon" aria-hidden="true">${icon}</span>
        <span class="action-label">${escapeHtml(label)}</span>
      </a>`;
}

function gallerySlotHtml(index) {
  return `
      <div class="gallery-slot tap" aria-label="Foto real pendiente ${index}">
        <span class="gallery-mark">Foto real pendiente</span>
      </div>`;
}

function servicePlaceholderHtml(index) {
  return `
      <div class="service tap">
        <div class="service-head">
          <span class="service-name">Servicio ${index} — por definir</span>
          <span class="service-price">Precio por definir</span>
        </div>
        <p class="service-desc">Descripción pendiente. Se completará con la información real del negocio.</p>
      </div>`;
}

/* ------------------------------- builder ------------------------------- */

function buildAutomotiveDemo(business = {}) {
  const b = business && typeof business === 'object' ? business : {};

  const name = firstPresent(b.title, b.name);
  const category = firstPresent(b.categoryName, b.category);
  const rating = firstPresent(b.totalScore, b.rating);
  const reviews = firstPresent(b.reviewsCount, b.reviewCount);
  const address = firstPresent(b.address);
  const neighborhood = firstPresent(b.neighborhood);
  const city = firstPresent(b.city);
  const state = firstPresent(b.state);
  const phone = firstPresent(b.phone);
  const phoneUnformatted = firstPresent(b.phoneUnformatted);
  const mapsUrl = firstPresent(b.url, b.mapsUrl);
  const imageUrl = firstPresent(b.imageUrl, b.heroImage);
  const imagesCount = firstPresent(b.imagesCount);
  const openingHours = isNonEmptyArray(b.openingHours) ? b.openingHours : null;

  const safeName = name ? escapeHtml(name) : 'Negocio local';
  const initials = businessInitials(name || '');
  const wa = whatsappLink(phoneUnformatted);
  const telLink = phoneUnformatted
    ? `tel:+${String(phoneUnformatted).replace(/\D/g, '')}`
    : (phone ? `tel:${String(phone).replace(/[^\d+]/g, '')}` : '');
  const mapsLink = mapsUrl ? String(mapsUrl) : '';

  /* --- header --- */
  const liveLocation = city ? `En vivo • ${escapeHtml(city)}` : 'En vivo';
  const headerActions = [
    telLink
      ? `<a class="hdr-btn tap" href="${escapeAttr(telLink)}" aria-label="Llamar">${'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5a2 2 0 0 1 2-2h2.6a1 1 0 0 1 .95.68l1.2 3.6a1 1 0 0 1-.5 1.2l-1.5.75a11 11 0 0 0 5.1 5.1l.75-1.5a1 1 0 0 1 1.2-.5l3.6 1.2a1 1 0 0 1 .68.95V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5z"/></svg>'}</a>`
      : '',
    wa
      ? `<a class="hdr-cta tap" href="${escapeAttr(wa)}" target="_blank" rel="noopener">WhatsApp</a>`
      : '',
  ].join('');

  /* --- hero --- */
  const heroMedia = imageUrl
    ? `<div class="hero-media">
        <div class="hero-fallback" aria-hidden="true"><span>${escapeHtml(initials)}</span></div>
        <img src="${escapeAttr(imageUrl)}" alt="${safeName}" loading="lazy" onerror="this.style.display='none'">
        <div class="hero-scrim"></div>
      </div>`
    : `<div class="hero-media">
        <div class="hero-fallback hero-fallback--only" aria-hidden="true"><span>${escapeHtml(initials)}</span></div>
        <div class="hero-scrim"></div>
      </div>`;

  const ratingBadge = rating !== undefined
    ? `<span class="badge badge-rating">★ ${escapeHtml(rating)}</span>`
    : '';
  const reviewsBadge = reviews !== undefined
    ? `<span class="badge">${escapeHtml(reviews)} reseñas en Google</span>`
    : '';
  const badges = ratingBadge || reviewsBadge
    ? `<div class="hero-badges">${ratingBadge}${reviewsBadge}</div>`
    : '';

  const locationLine = [address, neighborhood || null]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' · ');

  const heroMeta = [
    category ? `<span class="hero-cat">${escapeHtml(category)}</span>` : '',
    locationLine ? `<p class="hero-line">${locationLine}</p>` : '',
    phone ? `<a class="hero-line hero-line--link tap" href="${escapeAttr(telLink)}">${escapeHtml(phone)}</a>` : '',
  ].join('');

  /* --- KPIs (solo datos reales existentes) --- */
  const kpiCards = [];
  if (rating !== undefined) kpiCards.push(kpiHtml('Calificación', String(rating), 'Promedio en Google'));
  if (reviews !== undefined) kpiCards.push(kpiHtml('Reseñas', String(reviews), 'Opiniones publicadas'));
  if (imagesCount !== undefined) kpiCards.push(kpiHtml('Fotos', String(imagesCount), 'Publicadas por el negocio'));
  if (openingHours) {
    const today = todayName(new Date());
    const entry = openingHours.find((item) => item && String(item.day || '').toLowerCase() === today);
    if (entry && firstPresent(entry.hours) !== undefined) {
      kpiCards.push(kpiHtml('Horario de hoy', formatHours(entry.hours), today.charAt(0).toUpperCase() + today.slice(1)));
    }
  }
  const kpis = kpiCards.length
    ? `<section class="panel" aria-label="Indicadores reales">
      <div class="kpi-grid">${kpiCards.join('')}
      </div>
    </section>`
    : '';

  /* --- acciones directas --- */
  const actions = [];
  if (telLink && phone) actions.push(actionHtml(telLink, 'action--call', 'Llamar', '📞', false));
  if (wa) actions.push(actionHtml(wa, 'action--wa', 'WhatsApp', '💬', true));
  if (mapsLink) actions.push(actionHtml(mapsLink, 'action--maps', 'Google Maps', '📍', true));
  const actionsHtml = actions.length
    ? `<section class="panel" aria-label="Acciones directas">
      <div class="actions">${actions.join('')}
      </div>
    </section>`
    : '';

  /* --- galería (placeholders marcados) --- */
  const gallery = `<section class="panel">
      <div class="panel-head">
        <h2 class="panel-title">Galería</h2>
        <span class="draft-badge">Borrador — completar con datos reales</span>
      </div>
      <p class="panel-note">Estos espacios se reemplazarán por fotografías reales del negocio.</p>
      <div class="gallery-grid">
        ${[1, 2, 3, 4].map(gallerySlotHtml).join('')}
      </div>
    </section>`;

  /* --- servicios (placeholders marcados) --- */
  const services = `<section class="panel">
      <div class="panel-head">
        <h2 class="panel-title">Servicios</h2>
        <span class="draft-badge">Borrador — completar con datos reales</span>
      </div>
      <p class="panel-note">Listado de servicios y precios pendiente de confirmación con el negocio.</p>
      <div class="services">
        ${[1, 2, 3, 4].map(servicePlaceholderHtml).join('')}
      </div>
    </section>`;

  /* --- horario completo --- */
  const schedule = openingHours
    ? `<section class="panel">
      <div class="panel-head">
        <h2 class="panel-title">Horario de atención</h2>
      </div>
      <ul class="schedule">
        ${openingHours
          .map((item) => {
            const day = firstPresent(item && item.day);
            const hours = firstPresent(item && item.hours);
            if (day === undefined && hours === undefined) return '';
            return `<li class="schedule-row">
            <span class="schedule-day">${escapeHtml(day ? day.charAt(0).toUpperCase() + day.slice(1) : '')}</span>
            <span class="schedule-hours">${escapeHtml(formatHours(hours))}</span>
          </li>`;
          })
          .join('')}
      </ul>
    </section>`
    : '';

  /* --- CTA final --- */
  const ctaButtons = [
    wa ? `<a class="cta-btn cta-btn--wa tap" href="${escapeAttr(wa)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : '',
    telLink && phone ? `<a class="cta-btn cta-btn--call tap" href="${escapeAttr(telLink)}">Llamar ${escapeHtml(phone)}</a>` : '',
    mapsLink ? `<a class="cta-btn cta-btn--ghost tap" href="${escapeAttr(mapsLink)}" target="_blank" rel="noopener">Ver en Google Maps</a>` : '',
  ].filter(Boolean).join('');
  const cta = ctaButtons
    ? `<section class="panel panel--cta">
      <h2 class="cta-title">Contactá a ${safeName}</h2>
      <p class="cta-note">Atención directa con el negocio. Sin intermediarios.</p>
      <div class="cta-actions">${ctaButtons}</div>
    </section>`
    : '';

  /* --- barra inferior sticky --- */
  const bottomBar = `<div class="bottom-wrap">
      <div class="bottom-bar">
        <div class="bottom-info">
          <span class="bottom-name">${safeName}</span>
          ${category ? `<span class="bottom-cat">${escapeHtml(category)}</span>` : ''}
        </div>
        <div class="bottom-actions">
          ${telLink ? `<a class="bottom-btn bottom-btn--call tap" href="${escapeAttr(telLink)}" aria-label="Llamar">📞</a>` : ''}
          ${wa ? `<a class="bottom-btn bottom-btn--wa tap" href="${escapeAttr(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        </div>
      </div>
    </div>`;

  const draftBanner = `<div class="draft-banner">Demostración generada con datos públicos de Google. Pendiente de aprobación del negocio.</div>`;

  const footer = `<footer class="footer">
      <span>Vista previa · datos públicos de Google Maps</span>
    </footer>`;

  const stateLine = [city, state].filter(Boolean).map(escapeHtml).join(', ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0a0a0c">
<title>${safeName}${city ? ` — ${escapeHtml(city)}` : ''}</title>
<style>
  :root {
    --canvas: #0a0a0c;
    --surface: rgba(24, 24, 30, 0.72);
    --surface-2: rgba(34, 34, 42, 0.9);
    --border: rgba(255, 255, 255, 0.08);
    --border-accent: rgba(224, 182, 74, 0.35);
    --accent: #e0b64a;
    --accent-soft: rgba(224, 182, 74, 0.14);
    --danger: #34d17a;
    --text: #f5f5f7;
    --muted: rgba(245, 245, 247, 0.62);
    --radius: 24px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  * { box-sizing: border-box; -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--canvas);
    color: var(--text);
    font-family: var(--font);
    display: flex;
    justify-content: center;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
  }
  .orb { position: fixed; pointer-events: none; z-index: 0; filter: blur(130px); }
  .orb--top {
    top: -160px; right: -140px; width: 480px; height: 480px;
    background: radial-gradient(circle, rgba(224, 182, 74, 0.22) 0%, transparent 70%);
  }
  .orb--bottom {
    bottom: -180px; left: -160px; width: 520px; height: 520px;
    background: radial-gradient(circle, rgba(74, 125, 189, 0.18) 0%, transparent 70%);
  }
  .shot {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 460px;
    min-height: 100vh;
    padding: 0 0 118px;
    box-shadow: 0 0 80px rgba(0, 0, 0, 0.9);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
  }
  .tap { transition: transform 0.16s var(--ease), background-color 0.2s ease, border-color 0.2s ease; }
  .tap:active { transform: scale(0.975); }
  h1, h2, h3 { letter-spacing: -0.03em; line-height: 1.14; margin: 0; }
  p { margin: 0; }

  /* Header */
  .header {
    position: sticky; top: 0; z-index: 40;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 16px;
    background: rgba(10, 10, 12, 0.82);
    backdrop-filter: blur(18px);
    border-bottom: 1px solid var(--border);
  }
  .header-id { min-width: 0; }
  .header-name {
    display: block; font-size: 13px; font-weight: 700; letter-spacing: -0.02em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px;
  }
  .header-live {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--danger); margin-top: 3px;
  }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--danger); box-shadow: 0 0 0 0 rgba(52, 209, 122, 0.6); animation: pulse 1.8s infinite; }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(52, 209, 122, 0.55); }
    70% { box-shadow: 0 0 0 8px rgba(52, 209, 122, 0); }
    100% { box-shadow: 0 0 0 0 rgba(52, 209, 122, 0); }
  }
  .header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .hdr-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 12px;
    background: var(--surface-2); border: 1px solid var(--border); color: var(--accent);
  }
  .hdr-cta {
    display: inline-flex; align-items: center;
    padding: 10px 15px; border-radius: 12px;
    background: linear-gradient(135deg, #e0b64a, #b8892a);
    color: #17130a; font-size: 12px; font-weight: 800; text-decoration: none;
    box-shadow: 0 8px 22px rgba(224, 182, 74, 0.25);
  }

  /* Draft banner */
  .draft-banner {
    margin: 14px 16px 0;
    padding: 10px 14px;
    font-size: 11px; line-height: 1.5; color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 14px;
  }

  /* Hero */
  .hero { margin: 16px; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); background: var(--surface); }
  .hero-media { position: relative; height: 190px; }
  .hero-fallback {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, rgba(224, 182, 74, 0.28), rgba(74, 125, 189, 0.22) 55%, rgba(20, 20, 26, 0.9));
  }
  .hero-fallback span {
    font-size: 46px; font-weight: 800; letter-spacing: -0.04em;
    color: rgba(255, 255, 255, 0.85);
  }
  .hero-media img { position: relative; width: 100%; height: 100%; object-fit: cover; display: block; }
  .hero-scrim {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(10, 10, 12, 0.96) 8%, rgba(10, 10, 12, 0.2) 60%, transparent 100%);
  }
  .hero-body { padding: 16px; }
  .hero-cat {
    display: inline-block; margin-bottom: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--accent);
  }
  .hero-title { font-size: 24px; font-weight: 800; }
  .hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .badge {
    display: inline-flex; align-items: center;
    padding: 5px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--border);
    color: var(--text);
  }
  .badge-rating { color: #f6d364; border-color: var(--border-accent); background: var(--accent-soft); }
  .hero-meta { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
  .hero-line { font-size: 13px; color: var(--muted); line-height: 1.45; }
  .hero-line--link { color: var(--accent); text-decoration: none; font-weight: 600; }

  /* Panels */
  .panel {
    margin: 16px; padding: 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    backdrop-filter: blur(18px);
  }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .panel-title { font-size: 15px; font-weight: 800; }
  .panel-note { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; }
  .draft-badge {
    display: inline-flex; align-items: center;
    padding: 5px 10px; border-radius: 999px;
    font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--accent); background: var(--accent-soft); border: 1px solid var(--border-accent);
  }

  /* KPIs */
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .kpi {
    display: flex; flex-direction: column; gap: 4px;
    padding: 14px; border-radius: 18px;
    background: var(--surface-2); border: 1px solid var(--border);
  }
  .kpi-label { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
  .kpi-value { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
  .kpi-hint { font-size: 10px; color: var(--muted); line-height: 1.35; }

  /* Actions */
  .actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .action {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 14px 8px; border-radius: 18px; text-decoration: none;
    font-size: 11px; font-weight: 700; color: var(--text);
    background: var(--surface-2); border: 1px solid var(--border);
  }
  .action-icon { font-size: 19px; line-height: 1; }
  .action--call { border-color: rgba(224, 182, 74, 0.4); }
  .action--wa { border-color: rgba(52, 209, 122, 0.35); }
  .action--maps { border-color: rgba(74, 125, 189, 0.4); }

  /* Gallery */
  .gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .gallery-slot {
    position: relative; aspect-ratio: 4 / 3; border-radius: 18px;
    background: linear-gradient(135deg, rgba(224, 182, 74, 0.16), rgba(74, 125, 189, 0.12) 60%, rgba(30, 30, 38, 0.9));
    border: 1px dashed rgba(255, 255, 255, 0.18);
    display: flex; align-items: center; justify-content: center;
  }
  .gallery-mark { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; }

  /* Services */
  .services { display: flex; flex-direction: column; gap: 10px; }
  .service {
    padding: 14px; border-radius: 18px;
    background: var(--surface-2); border: 1px dashed rgba(255, 255, 255, 0.16);
  }
  .service-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .service-name { font-size: 13px; font-weight: 700; }
  .service-price { font-size: 11px; font-weight: 700; color: var(--accent); white-space: nowrap; }
  .service-desc { font-size: 11px; color: var(--muted); line-height: 1.45; margin-top: 6px; }

  /* Schedule */
  .schedule { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .schedule-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .schedule-row:last-child { border-bottom: none; }
  .schedule-day { font-size: 12px; font-weight: 600; }
  .schedule-hours { font-size: 12px; color: var(--muted); }

  /* CTA */
  .panel--cta { border-color: var(--border-accent); }
  .cta-title { font-size: 19px; font-weight: 800; }
  .cta-note { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .cta-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
  .cta-btn {
    display: block; text-align: center; text-decoration: none;
    padding: 15px; border-radius: 16px; font-size: 13px; font-weight: 800;
  }
  .cta-btn--wa { background: linear-gradient(135deg, #34d17a, #1f9e57); color: #06210f; box-shadow: 0 10px 26px rgba(52, 209, 122, 0.22); }
  .cta-btn--call { background: linear-gradient(135deg, #e0b64a, #b8892a); color: #17130a; }
  .cta-btn--ghost { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); }

  /* Footer */
  .footer { margin: 22px 16px 8px; text-align: center; font-size: 10px; color: rgba(245, 245, 247, 0.4); }

  /* Bottom bar */
  .bottom-wrap { position: fixed; bottom: 0; left: 0; right: 0; z-index: 45; display: flex; justify-content: center; padding: 12px; pointer-events: none; }
  .bottom-bar {
    pointer-events: auto;
    width: 100%; max-width: 436px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 12px; border-radius: 20px;
    background: rgba(18, 18, 24, 0.92);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-accent);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
  }
  .bottom-info { display: flex; flex-direction: column; min-width: 0; padding-left: 4px; }
  .bottom-name { font-size: 13px; font-weight: 800; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
  .bottom-cat { font-size: 10px; color: var(--muted); }
  .bottom-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .bottom-btn { text-decoration: none; border-radius: 13px; font-size: 12px; font-weight: 800; }
  .bottom-btn--call { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: var(--surface-2); border: 1px solid var(--border); }
  .bottom-btn--wa { display: inline-flex; align-items: center; padding: 0 16px; height: 42px; background: linear-gradient(135deg, #34d17a, #1f9e57); color: #06210f; }

  @media (min-width: 720px) {
    .shot { border-radius: 26px; margin: 24px 0; min-height: auto; }
  }
</style>
</head>
<body>
  <div class="orb orb--top"></div>
  <div class="orb orb--bottom"></div>

  <div class="shot">

    <header class="header">
      <div class="header-id">
        <span class="header-name">${safeName}</span>
        <span class="header-live"><span class="live-dot" aria-hidden="true"></span>${liveLocation}</span>
      </div>
      <div class="header-actions">${headerActions}</div>
    </header>

    ${draftBanner}

    <section class="hero">
      ${heroMedia}
      <div class="hero-body">
        ${category ? `<span class="hero-cat">${escapeHtml(category)}</span>` : ''}
        <h1 class="hero-title">${safeName}</h1>
        ${badges}
        ${heroMeta ? `<div class="hero-meta">${heroMeta}</div>` : ''}
      </div>
    </section>

    ${kpis}

    ${actionsHtml}

    ${gallery}

    ${services}

    ${schedule}

    ${cta}

    <footer class="footer">
      <span>Vista previa · datos públicos de Google Maps${stateLine ? ` · ${stateLine}` : ''}</span>
    </footer>

  </div>

  ${bottomBar}

</body>
</html>`;
}

module.exports = { buildAutomotiveDemo };
