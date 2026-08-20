import {
  INVESTMENT_PAYMENT_QR_MATRIX_BASE64,
  INVESTMENT_PAYMENT_QR_QUIET_ZONE,
  INVESTMENT_PAYMENT_QR_SIZE,
} from '@/lib/investment/payment-qr';

const packed = Buffer.from(INVESTMENT_PAYMENT_QR_MATRIX_BASE64, 'base64');
const totalModules = INVESTMENT_PAYMENT_QR_SIZE * INVESTMENT_PAYMENT_QR_SIZE;

function isDarkModule(index: number) {
  if (index < 0 || index >= totalModules) return false;
  const byte = packed[Math.floor(index / 8)];
  const bit = 7 - (index % 8);
  return ((byte >> bit) & 1) === 1;
}

function renderQrSvg() {
  const quiet = INVESTMENT_PAYMENT_QR_QUIET_ZONE;
  const viewSize = INVESTMENT_PAYMENT_QR_SIZE + quiet * 2;
  let path = '';

  for (let y = 0; y < INVESTMENT_PAYMENT_QR_SIZE; y += 1) {
    for (let x = 0; x < INVESTMENT_PAYMENT_QR_SIZE; x += 1) {
      const index = y * INVESTMENT_PAYMENT_QR_SIZE + x;
      if (isDarkModule(index)) {
        path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${viewSize}" height="${viewSize}" shape-rendering="crispEdges" role="img" aria-label="QR Bancolombia Bre-B"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

const QR_SVG = renderQrSvg();

export async function GET() {
  return new Response(QR_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Security-Policy': "default-src 'none'; style-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
