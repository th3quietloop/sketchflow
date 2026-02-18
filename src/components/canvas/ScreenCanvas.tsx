'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { useProjectStore } from '@/store/useProjectStore';
import { DEVICE_DIMENSIONS, type ElementType, type CanvasElement } from '@/types';
import DeviceFrame from './DeviceFrame';
import SnapGrid from './SnapGrid';
import AlignmentGuides from './AlignmentGuides';
import CanvasElementComponent from './CanvasElement';

const CANVAS_PADDING = 60;

export default function ScreenCanvas() {
  const {
    project,
    activeScreenId,
    activeTool,
    selectedElementIds,
    snapEnabled,
    addElement,
    updateElement,
    selectElement,
    toggleSelectElement,
    selectAll,
    deleteSelectedElements,
    duplicateSelected,
    setActiveTool,
    beginDrag,
    undo,
    redo,
  } = useProjectStore();

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragElementState, setDragElementState] = useState<CanvasElement | null>(null);
  const [dropHighlight, setDropHighlight] = useState(false);

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const dim = DEVICE_DIMENSIONS[project.device];

  const stageWidth = dim.width + CANVAS_PADDING * 2;
  const stageHeight = dim.height + CANVAS_PADDING * 2;

  // ─── Click-to-place (existing behavior) ────────────────
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target !== e.target.getStage() && e.target.name() !== 'device-bg') {
        return;
      }

      if (activeTool !== 'select' && activeTool !== 'arrow') {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        const x = pos.x - CANVAS_PADDING;
        const y = pos.y - CANVAS_PADDING;

        if (x >= 0 && y >= 0 && x <= dim.width && y <= dim.height) {
          addElement(activeTool as ElementType, x, y);
        }
      } else {
        selectElement(null);
      }
    },
    [activeTool, addElement, selectElement, dim]
  );

  // ─── Drag-and-drop from sidebar ────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('sketchflow/element-type')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropHighlight(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropHighlight(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setDropHighlight(false);
      const type = e.dataTransfer.getData('sketchflow/element-type') as ElementType;
      if (!type) return;

      e.preventDefault();

      // Calculate drop position relative to the canvas stage
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      // Account for scroll offset within the container
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;

      // The stage is centered in the container — find its offset
      const stageEl = container.querySelector('canvas')?.parentElement;
      const stageRect = stageEl?.getBoundingClientRect();
      if (!stageRect) return;

      const x = e.clientX - stageRect.left - CANVAS_PADDING;
      const y = e.clientY - stageRect.top - CANVAS_PADDING;

      // Only place if within device bounds
      if (x >= 0 && y >= 0 && x <= dim.width && y <= dim.height) {
        addElement(type, x, y);
      }
    },
    [addElement, dim]
  );

  // ─── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isMeta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (isMeta && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (isMeta && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedElements();
      } else if (e.key === 'Escape') {
        selectElement(null);
        setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelectedElements, selectElement, selectAll, duplicateSelected, setActiveTool, undo, redo]);

  if (!screen) return null;

  const visibleElements = screen.elements.filter(
    (el) => el.screenState === screen.activeState
  );

  const otherElements = dragElementState
    ? visibleElements.filter((el) => el.id !== dragElementState.id)
    : visibleElements;

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-gray-900 overflow-auto flex items-start justify-center pt-8 transition-colors ${
        dropHighlight ? 'bg-blue-950/30' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onClick={handleStageClick}
        style={{ cursor: activeTool !== 'select' ? 'crosshair' : 'default' }}
      >
        <Layer>
          <DeviceFrame
            device={project.device}
            offsetX={CANVAS_PADDING}
            offsetY={CANVAS_PADDING}
          />

          {snapEnabled && (
            <SnapGrid
              width={dim.width}
              height={dim.height}
              offsetX={CANVAS_PADDING}
              offsetY={CANVAS_PADDING}
            />
          )}

          {visibleElements.map((el) => (
            <CanvasElementComponent
              key={el.id}
              element={{
                ...el,
                x: el.x + CANVAS_PADDING,
                y: el.y + CANVAS_PADDING,
              }}
              isSelected={selectedElementIds.has(el.id)}
              onSelect={(shiftKey) => {
                if (shiftKey) {
                  toggleSelectElement(el.id);
                } else {
                  selectElement(el.id);
                }
              }}
              onDragStart={() => {
                beginDrag();
                setDragElementState(el);
              }}
              onDragMove={(x, y) => {
                setDragElementState({
                  ...el,
                  x: x - CANVAS_PADDING,
                  y: y - CANVAS_PADDING,
                });
              }}
              onDragEnd={(x, y) => {
                updateElement(el.id, {
                  x: x - CANVAS_PADDING,
                  y: y - CANVAS_PADDING,
                });
                setDragElementState(null);
              }}
              onResizeStart={() => beginDrag()}
              onResize={(w, h) =>
                updateElement(el.id, { width: w, height: h })
              }
            />
          ))}

          <AlignmentGuides
            dragElement={dragElementState}
            otherElements={otherElements}
            offsetX={CANVAS_PADDING}
            offsetY={CANVAS_PADDING}
            deviceHeight={dim.height}
          />
        </Layer>
      </Stage>
    </div>
  );
}
