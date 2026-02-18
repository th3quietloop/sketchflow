'use client';

import { useRef, useState } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type { CanvasElement as CanvasElementType } from '@/types';
import type Konva from 'konva';

interface Props {
  element: CanvasElementType;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onResizeStart: () => void;
  onResize: (width: number, height: number) => void;
  onLabelChange?: (label: string) => void;
  onContextMenu?: (x: number, y: number) => void;
}

function getElementStyle(type: CanvasElementType['type']) {
  switch (type) {
    case 'container':
      return { fill: 'transparent', stroke: '#555', dash: [6, 3], textColor: '#888' };
    case 'heading':
      return { fill: 'transparent', stroke: '#888', dash: [], textColor: '#fff', fontSize: 18, fontStyle: 'bold' };
    case 'body':
      return { fill: 'transparent', stroke: '#666', dash: [], textColor: '#aaa', fontSize: 13 };
    case 'cta':
      return { fill: '#2563eb', stroke: '#3b82f6', dash: [], textColor: '#fff', cornerRadius: 8 };
    case 'textfield':
      return { fill: '#1a1a2e', stroke: '#444', dash: [], textColor: '#888', cornerRadius: 6 };
    case 'image':
      return { fill: '#1a1a2e', stroke: '#444', dash: [], textColor: '#666' };
    case 'card':
      return { fill: '#111827', stroke: '#374151', dash: [], textColor: '#ccc', cornerRadius: 12 };
    case 'topnav':
      return { fill: '#111827', stroke: '#374151', dash: [], textColor: '#fff' };
    case 'tabbar':
      return { fill: '#111827', stroke: '#374151', dash: [], textColor: '#fff' };
    case 'bottomsheet':
      return { fill: '#1f2937', stroke: '#4b5563', dash: [], textColor: '#fff', cornerRadius: 16 };
    case 'list':
      return { fill: 'transparent', stroke: '#444', dash: [4, 4], textColor: '#aaa' };
    default:
      return { fill: 'transparent', stroke: '#555', dash: [], textColor: '#ccc' };
  }
}

const MIN_SIZE = 24;

export default function CanvasElementComponent({
  element,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResize,
  onLabelChange,
  onContextMenu,
}: Props) {
  const groupRef = useRef<Konva.Group>(null);
  const style = getElementStyle(element.type);
  const [resizing, setResizing] = useState(false);

  const handleDragStart = () => {
    onDragStart();
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(e.target.x(), e.target.y());
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    onSelect(e.evt.shiftKey || e.evt.metaKey);
  };

  const handleTap = () => {
    onSelect(false);
  };

  const handleDblClick = () => {
    if (onLabelChange) {
      onLabelChange(element.label);
    }
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    if (onContextMenu) {
      onContextMenu(e.evt.clientX, e.evt.clientY);
    }
  };

  const handleResizeDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newW = Math.max(MIN_SIZE, node.x() + 6);
    const newH = Math.max(MIN_SIZE, node.y() + 6);
    onResize(newW, newH);
    node.x(newW - 6);
    node.y(newH - 6);
  };

  const isImage = element.type === 'image';
  const hasAnnotation = element.annotation.length > 0;
  const hasSemanticTag = element.semanticTag !== 'none';

  // Inline edit overlay — rendered outside Konva via a portal-like trick
  // We'll handle this in ScreenCanvas instead, using an HTML input overlay

  return (
    <Group
      ref={groupRef}
      x={element.x}
      y={element.y}
      draggable={!resizing}
      onClick={handleClick}
      onTap={handleTap}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
    >
      {/* Main shape */}
      <Rect
        width={element.width}
        height={element.height}
        fill={style.fill}
        stroke={isSelected ? '#3b82f6' : style.stroke}
        strokeWidth={isSelected ? 2 : 1}
        dash={style.dash && style.dash.length > 0 ? style.dash : undefined}
        cornerRadius={(style as Record<string, unknown>).cornerRadius as number || 0}
      />

      {/* Label */}
      <Text
        x={8}
        y={element.type === 'heading' ? 6 : element.height / 2 - 8}
        width={element.width - 16}
        text={element.label}
        fill={style.textColor}
        fontSize={(style as Record<string, unknown>).fontSize as number || 14}
        fontStyle={(style as Record<string, unknown>).fontStyle as string || 'normal'}
        fontFamily="monospace"
        align={element.type === 'cta' ? 'center' : 'left'}
        listening={false}
      />

      {/* Image placeholder X */}
      {isImage && (
        <>
          <Line points={[0, 0, element.width, element.height]} stroke="#333" strokeWidth={1} listening={false} />
          <Line points={[element.width, 0, 0, element.height]} stroke="#333" strokeWidth={1} listening={false} />
        </>
      )}

      {/* List separator lines */}
      {element.type === 'list' &&
        Array.from({ length: Math.max(0, Math.floor(element.height / 48) - 1) }).map((_, i) => (
          <Line
            key={i}
            points={[8, (i + 1) * 48, element.width - 8, (i + 1) * 48]}
            stroke="#333"
            strokeWidth={1}
            listening={false}
          />
        ))}

      {/* Tab bar item placeholders */}
      {element.type === 'tabbar' &&
        [0.2, 0.4, 0.6, 0.8].map((pct, i) => (
          <Rect
            key={i}
            x={element.width * pct - 12}
            y={12}
            width={24}
            height={24}
            fill="transparent"
            stroke="#555"
            strokeWidth={1}
            cornerRadius={4}
            listening={false}
          />
        ))}

      {/* Annotation indicator */}
      {hasAnnotation && (
        <Rect x={element.width - 14} y={-6} width={12} height={12} fill="#eab308" cornerRadius={6} listening={false} />
      )}

      {/* Semantic tag badge */}
      {hasSemanticTag && (
        <>
          <Rect
            x={0}
            y={-18}
            width={element.semanticTag.length * 6.5 + 12}
            height={16}
            fill="#7c3aed"
            cornerRadius={3}
            listening={false}
          />
          <Text x={6} y={-16} text={element.semanticTag} fill="#fff" fontSize={9} fontFamily="monospace" listening={false} />
        </>
      )}

      {/* Resize handle */}
      {isSelected && (
        <Rect
          x={element.width - 6}
          y={element.height - 6}
          width={12}
          height={12}
          fill="#3b82f6"
          cornerRadius={2}
          draggable
          onDragStart={() => {
            setResizing(true);
            onResizeStart();
          }}
          onDragMove={handleResizeDragMove}
          onDragEnd={() => setResizing(false)}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'nwse-resize';
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }}
        />
      )}
    </Group>
  );
}
