'use client';

import { Line } from 'react-konva';
import type { CanvasElement } from '@/types';

interface Props {
  /** The element currently being dragged */
  dragElement: CanvasElement | null;
  /** All other visible elements (excluding the dragged one) */
  otherElements: CanvasElement[];
  offsetX: number;
  offsetY: number;
  deviceHeight: number;
}

const SNAP_THRESHOLD = 6;

export interface GuideLines {
  vertical: number[];
  horizontal: number[];
}

/** Calculate which guide lines should show during a drag */
export function calcGuides(
  el: CanvasElement,
  others: CanvasElement[],
  threshold = SNAP_THRESHOLD
): GuideLines {
  const vGuides: number[] = [];
  const hGuides: number[] = [];

  const elCx = el.x + el.width / 2;
  const elCy = el.y + el.height / 2;
  const elR = el.x + el.width;
  const elB = el.y + el.height;

  for (const o of others) {
    const oCx = o.x + o.width / 2;
    const oCy = o.y + o.height / 2;
    const oR = o.x + o.width;
    const oB = o.y + o.height;

    // Vertical alignment (x-axis matches)
    if (Math.abs(el.x - o.x) < threshold) vGuides.push(o.x); // left-left
    if (Math.abs(elR - oR) < threshold) vGuides.push(oR);     // right-right
    if (Math.abs(elCx - oCx) < threshold) vGuides.push(oCx);  // center-center
    if (Math.abs(el.x - oR) < threshold) vGuides.push(oR);    // left-right
    if (Math.abs(elR - o.x) < threshold) vGuides.push(o.x);   // right-left

    // Horizontal alignment (y-axis matches)
    if (Math.abs(el.y - o.y) < threshold) hGuides.push(o.y);  // top-top
    if (Math.abs(elB - oB) < threshold) hGuides.push(oB);     // bottom-bottom
    if (Math.abs(elCy - oCy) < threshold) hGuides.push(oCy);  // center-center
    if (Math.abs(el.y - oB) < threshold) hGuides.push(oB);    // top-bottom
    if (Math.abs(elB - o.y) < threshold) hGuides.push(o.y);   // bottom-top
  }

  return {
    vertical: [...new Set(vGuides)],
    horizontal: [...new Set(hGuides)],
  };
}

export default function AlignmentGuides({
  dragElement,
  otherElements,
  offsetX,
  offsetY,
  deviceHeight,
}: Props) {
  if (!dragElement) return null;

  const guides = calcGuides(dragElement, otherElements);

  return (
    <>
      {guides.vertical.map((x, i) => (
        <Line
          key={`vg-${i}`}
          points={[offsetX + x, offsetY, offsetX + x, offsetY + deviceHeight]}
          stroke="#f472b6"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
      {guides.horizontal.map((y, i) => (
        <Line
          key={`hg-${i}`}
          points={[offsetX, offsetY + y, offsetX + 2000, offsetY + y]}
          stroke="#f472b6"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
    </>
  );
}
