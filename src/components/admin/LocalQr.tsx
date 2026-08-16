'use client';

import React, { useMemo } from 'react';
import encodeQR from 'qr';

export function LocalQr({ value, size = 180, title }: { value: string; size?: number; title?: string }) {
  const matrix = useMemo(() => encodeQR(value, 'raw', { ecc: 'medium', border: 2 }) as boolean[][], [value]);
  const modules = matrix.length;
  return (
    <svg
      viewBox={`0 0 ${modules} ${modules}`}
      width={size}
      height={size}
      role="img"
      aria-label={title ?? 'QR de trazabilidad'}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={modules} height={modules} fill="white" />
      {matrix.flatMap((row, y) => row.map((dark, x) => dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="black" /> : null))}
    </svg>
  );
}
