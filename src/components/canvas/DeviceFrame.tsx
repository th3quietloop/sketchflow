'use client';

import { Rect, Text, Line } from 'react-konva';
import { DEVICE_DIMENSIONS, type DeviceType } from '@/types';

interface Props {
  device: DeviceType;
  offsetX: number;
  offsetY: number;
}

export default function DeviceFrame({ device, offsetX, offsetY }: Props) {
  const dim = DEVICE_DIMENSIONS[device];

  return (
    <>
      {/* Device frame background */}
      <Rect
        x={offsetX}
        y={offsetY}
        width={dim.width}
        height={dim.height}
        fill="#0a0a0f"
        stroke="#333"
        strokeWidth={2}
        cornerRadius={device === 'mobile' ? 24 : device === 'tablet' ? 16 : 0}
      />

      {/* Status bar (mobile/tablet) */}
      {(device === 'mobile' || device === 'tablet') && (
        <>
          <Rect
            x={offsetX}
            y={offsetY}
            width={dim.width}
            height={44}
            fill="#0a0a0f"
            cornerRadius={device === 'mobile' ? [24, 24, 0, 0] : [16, 16, 0, 0]}
          />
          <Text
            x={offsetX + 16}
            y={offsetY + 14}
            text="9:41"
            fill="#666"
            fontSize={12}
            fontFamily="monospace"
          />
          <Line
            points={[offsetX, offsetY + 44, offsetX + dim.width, offsetY + 44]}
            stroke="#222"
            strokeWidth={1}
          />
        </>
      )}

      {/* Home indicator (mobile) */}
      {device === 'mobile' && (
        <Rect
          x={offsetX + dim.width / 2 - 67}
          y={offsetY + dim.height - 20}
          width={134}
          height={5}
          fill="#333"
          cornerRadius={3}
        />
      )}

      {/* Thumb zone overlay hint (mobile) */}
      {device === 'mobile' && (
        <Rect
          x={offsetX}
          y={offsetY + dim.height * 0.55}
          width={dim.width}
          height={dim.height * 0.45 - 20}
          fill="rgba(34, 197, 94, 0.03)"
          listening={false}
        />
      )}

      {/* Device label */}
      <Text
        x={offsetX}
        y={offsetY - 24}
        text={`${device.charAt(0).toUpperCase() + device.slice(1)} — ${dim.width}×${dim.height}`}
        fill="#555"
        fontSize={11}
        fontFamily="monospace"
      />
    </>
  );
}
