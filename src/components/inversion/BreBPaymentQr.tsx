'use client';

import React, { useEffect, useRef } from 'react';

const MODULES = 117;
const QUIET_ZONE = 4;
const MODULE_SCALE = 5;

// Exact module matrix recovered from the Bancolombia/Bre-B QR approved by the
// business. Keeping the QR as packed bits avoids external image hosting while
// preserving the payment payload byte-for-byte. Do not edit this value by hand.
const PACKED_QR = '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';

function unpackModules() {
  const bytes = Uint8Array.from(atob(PACKED_QR), (char) => char.charCodeAt(0));
  return (row: number, column: number) => {
    const bitIndex = row * MODULES + column;
    const byte = bytes[Math.floor(bitIndex / 8)];
    return ((byte >> (7 - (bitIndex % 8))) & 1) === 1;
  };
}

export function BreBPaymentQr({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const totalModules = MODULES + QUIET_ZONE * 2;
    const size = totalModules * MODULE_SCALE;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    context.imageSmoothingEnabled = false;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.fillStyle = '#000000';

    const isDark = unpackModules();
    for (let row = 0; row < MODULES; row += 1) {
      for (let column = 0; column < MODULES; column += 1) {
        if (!isDark(row, column)) continue;
        context.fillRect(
          (column + QUIET_ZONE) * MODULE_SCALE,
          (row + QUIET_ZONE) * MODULE_SCALE,
          MODULE_SCALE,
          MODULE_SCALE,
        );
      }
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="QR oficial Bre-B de Grupo Pisao Food para pagos de CTG Craft Beer Inversión"
      className={`block h-auto w-full max-w-full bg-white ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      QR oficial Bre-B de Grupo Pisao Food.
    </canvas>
  );
}
