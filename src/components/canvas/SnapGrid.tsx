'use client';

import { Line } from 'react-konva';
import { GRID_SIZE } from '@/store/useProjectStore';

interface Props {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export default function SnapGrid({ width, height, offsetX, offsetY }: Props) {
  const lines: React.ReactNode[] = [];

  // Vertical lines
  for (let x = 0; x <= width; x += GRID_SIZE) {
    const isMajor = x % (GRID_SIZE * 4) === 0;
    lines.push(
      <Line
        key={`v-${x}`}
        points={[offsetX + x, offsetY, offsetX + x, offsetY + height]}
        stroke={isMajor ? '#1a1a2e' : '#111118'}
        strokeWidth={1}
        listening={false}
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += GRID_SIZE) {
    const isMajor = y % (GRID_SIZE * 4) === 0;
    lines.push(
      <Line
        key={`h-${y}`}
        points={[offsetX, offsetY + y, offsetX + width, offsetY + y]}
        stroke={isMajor ? '#1a1a2e' : '#111118'}
        strokeWidth={1}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
