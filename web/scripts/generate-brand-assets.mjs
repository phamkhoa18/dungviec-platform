/**
 * Sinh toàn bộ tài sản thương hiệu "Đúng Việc" từ một biểu tượng SVG duy nhất:
 * Tờ CV + kính lúp có dấu tick + tia sáng AI.
 *
 * Chạy: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = (p) => resolve(root, p);
const write = (p, data) => {
  mkdirSync(dirname(out(p)), { recursive: true });
  writeFileSync(out(p), data);
};

const BLUE = "#2563EB";
const NAVY = "#0F1F4D";
const FOLD = "#1E4A9E";
const SPARK = "#FFB300";

/** Biểu tượng (viewBox 64x64), nền trong suốt – dùng trên nền sáng. */
const markBody = `
  <path d="M20 6h21a5 5 0 0 1 5 5v38a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V16z" fill="${BLUE}"/>
  <path d="M20 6v7a3 3 0 0 1-3 3h-7z" fill="${FOLD}"/>
  <circle cx="24" cy="25" r="4.2" fill="#fff" fill-opacity=".9"/>
  <rect x="16" y="33" width="8" height="3" rx="1.5" fill="#fff" fill-opacity=".9"/>
  <line x1="51" y1="49" x2="58" y2="56" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
  <circle cx="40" cy="38" r="16" fill="#fff"/>
  <line x1="50" y1="48" x2="58" y2="56" stroke="${BLUE}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="40" cy="38" r="12.2" fill="#fff" stroke="${BLUE}" stroke-width="4.6"/>
  <path d="M33.5 38.5l4.8 4.8L47 32.5" fill="none" stroke="${BLUE}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M52 3.5q1.1 7.4 8.5 8.5-7.4 1.1-8.5 8.5-1.1-7.400-8.500-8.500 7.400-1.100 8.500-8.500z" fill="${SPARK}"/>
`;
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">${markBody}</svg>`;

/** App icon: nền xanh bo góc, biểu tượng trắng (favicon, PWA, Apple touch). */
function appIcon({ radius = 14, pad = 0 } = {}) {
  const s = 1 - (pad * 2) / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3B82F6"/><stop offset="1" stop-color="#1346B8"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${pad} ${pad}) scale(${s})">
    <path d="M20 6h21a5 5 0 0 1 5 5v38a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V16z" fill="#fff"/>
    <path d="M20 6v7a3 3 0 0 1-3 3h-7z" fill="#BFD4FF"/>
    <circle cx="24" cy="25" r="4.2" fill="#93B4F5"/>
    <rect x="16" y="33" width="8" height="3" rx="1.5" fill="#93B4F5"/>
    <line x1="51" y1="49" x2="58" y2="56" stroke="#1A4FC4" stroke-width="11" stroke-linecap="round"/>
    <circle cx="40" cy="38" r="16" fill="#1A4FC4"/>
    <line x1="50" y1="48" x2="58" y2="56" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <circle cx="40" cy="38" r="12.2" fill="#1A4FC4" stroke="#fff" stroke-width="4.6"/>
    <path d="M33.5 38.5l4.8 4.8L47 32.5" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M52 3.5q1.1 7.4 8.5 8.5-7.4 1.1-8.5 8.5-1.1-7.4-8.5-8.5 7.4-1.1 8.5-8.5z" fill="${SPARK}"/>
  </g>
</svg>`;
}

const FONT = "Lexend, 'Helvetica Neue', Arial, sans-serif";

/** Logo ngang: biểu tượng + chữ "ĐúngViệc". */
function horizontal({ dark = NAVY, accent = BLUE, bg } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 80" fill="none">
  ${bg ? `<rect width="360" height="80" fill="${bg}"/>` : ""}
  <g transform="translate(8 8) scale(1)">${markBody
    .replaceAll(BLUE, accent)
    .replaceAll(FOLD, dark === "#fff" ? "#BFD4FF" : FOLD)}</g>
  <text x="84" y="53" font-family="${FONT}" font-size="40" font-weight="700" letter-spacing="-1.4" fill="${dark}">Đúng<tspan fill="${accent}">Việc</tspan></text>
</svg>`;
}

async function png(svg, size, file) {
  mkdirSync(dirname(out(file)), { recursive: true });
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png()
    .toFile(out(file));
}

// 1) SVG nguồn
write("src/app/icon.svg", appIcon());
write("public/brand/logo-mark.svg", markSvg);
write("public/brand/logo-app.svg", appIcon());
write("public/brand/logo-horizontal.svg", horizontal());
write("public/brand/logo-horizontal-white.svg", horizontal({ dark: "#fff", accent: "#fff" }));

// 2) PNG: Apple touch, PWA, favicon
await png(appIcon({ radius: 0, pad: 4 }), 180, "src/app/apple-icon.png");
await png(appIcon({ radius: 14 }), 192, "public/brand/icon-192.png");
await png(appIcon({ radius: 14 }), 512, "public/brand/icon-512.png");
await png(appIcon({ radius: 0, pad: 6 }), 512, "public/brand/icon-maskable-512.png");
for (const s of [16, 32, 48]) {
  await png(appIcon({ radius: s <= 32 ? 12 : 14 }), s, `.brand-tmp/favicon-${s}.png`);
}

// 3) Logo ngang PNG
await sharp(Buffer.from(horizontal()), { density: 384 })
  .resize({ width: 1080 })
  .png()
  .toFile(out("public/brand/logo-horizontal.png"));

// 4) Ảnh chia sẻ (Open Graph) 1200x630
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1346B8"/><stop offset=".55" stop-color="#1E5CE6"/><stop offset="1" stop-color="#117BE8"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1060" cy="90" r="260" fill="#fff" fill-opacity=".06"/>
  <circle cx="1120" cy="560" r="180" fill="#fff" fill-opacity=".05"/>
  <rect x="80" y="86" width="412" height="104" rx="52" fill="#fff"/>
  <g transform="translate(100 98) scale(1.3)">${markBody}</g>
  <text x="196" y="156" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="-2" fill="${NAVY}">Đúng<tspan fill="${BLUE}">Việc</tspan></text>
  <text x="80" y="320" font-family="${FONT}" font-size="56" font-weight="700" fill="#fff">Tuyển dụng ứng dụng AI</text>
  <text x="80" y="390" font-family="${FONT}" font-size="56" font-weight="700" fill="#fff">phân tích CV</text>
  <text x="80" y="480" font-family="${FONT}" font-size="30" fill="#fff" fill-opacity=".85">Đánh giá mức độ phù hợp giữa CV và vị trí tuyển dụng</text>
  ${appIcon({ radius: 14 }).replace(/<svg [^>]*>/, '<svg x="830" y="250" width="290" height="290" viewBox="0 0 64 64" fill="none">')}
</svg>`;
await sharp(Buffer.from(og), { density: 144 }).resize(1200, 630).png().toFile(out("src/app/opengraph-image.png"));

console.log("Brand assets generated.");
