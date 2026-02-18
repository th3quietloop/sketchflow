'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import { useProjectStore } from '@/store/useProjectStore';
import { DEVICE_DIMENSIONS, ELEMENT_DEFAULTS, type ElementType, type CanvasElement } from '@/types';
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
    selectedElementId,
    snapEnabled,
    hasClipboard,
    addElement,
    updateElement,
    selectElement,
    toggleSelectElement,
    selectAll,
    deleteSelectedElements,
    duplicateSelected,
    copySelected,
    paste,
    bringToFront,
    sendToBack,
    setActiveTool,
    beginDrag,
    undo,
    redo,
  } = useProjectStore();

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragElementState, setDragElementState] = useState<CanvasElement | null>(null);
  const [dropHighlight, setDropHighlight] = useState(false);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

  // Ghost preview state
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const dim = DEVICE_DIMENSIONS[project.device];

  const stageWidth = dim.width + CANVAS_PADDING * 2;
  const stageHeight = dim.height + CANVAS_PADDING * 2;

  // Close context menu on any click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [contextMenu]);

  // Focus inline edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // ─── Click-to-place (hold Shift to keep tool active) ───
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
          const keepTool = e.evt.shiftKey;
          addElement(activeTool as ElementType, x, y, keepTool);
        }
      } else {
        selectElement(null);
        setEditingId(null);
      }
    },
    [activeTool, addElement, selectElement, dim]
  );

  // ─── Ghost preview on mouse move ────────────────────────
  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'select' || activeTool === 'arrow') {
        setGhostPos((prev) => (prev ? null : prev));
        return;
      }
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      setGhostPos({ x: pos.x, y: pos.y });
    },
    [activeTool]
  );

  const handleStageMouseLeave = useCallback(() => {
    setGhostPos(null);
  }, []);

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

      const container = containerRef.current;
      if (!container) return;

      const stageEl = container.querySelector('canvas')?.parentElement;
      const stageRect = stageEl?.getBoundingClientRect();
      if (!stageRect) return;

      const x = e.clientX - stageRect.left - CANVAS_PADDING;
      const y = e.clientY - stageRect.top - CANVAS_PADDING;

      if (x >= 0 && y >= 0 && x <= dim.width && y <= dim.height) {
        addElement(type, x, y);
      }
    },
    [addElement, dim]
  );

  // ─── Inline label editing ──────────────────────────────
  const startEditing = useCallback((elementId: string) => {
    const el = screen?.elements.find((e) => e.id === elementId);
    if (!el) return;
    setEditingId(elementId);
    setEditValue(el.label);
  }, [screen]);

  const commitEdit = useCallback(() => {
    if (editingId && editValue.trim()) {
      updateElement(editingId, { label: editValue.trim() });
    }
    setEditingId(null);
  }, [editingId, editValue, updateElement]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

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
      if (isMeta && e.key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }
      if (isMeta && e.key === 'v') {
        e.preventDefault();
        paste();
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        if (!isMeta) setActiveTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedElements();
      } else if (e.key === 'Escape') {
        selectElement(null);
        setActiveTool('select');
        setEditingId(null);
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelectedElements, selectElement, selectAll, duplicateSelected, copySelected, paste, setActiveTool, undo, redo]);

  if (!screen) return null;

  const visibleElements = screen.elements.filter(
    (el) => el.screenState === screen.activeState
  );

  const otherElements = dragElementState
    ? visibleElements.filter((el) => el.id !== dragElementState.id)
    : visibleElements;

  // Ghost preview element defaults
  const ghostTool = activeTool !== 'select' && activeTool !== 'arrow' ? activeTool as ElementType : null;
  const ghostDefaults = ghostTool ? ELEMENT_DEFAULTS[ghostTool] : null;

  // Editing element for overlay positioning
  const editingEl = editingId ? screen.elements.find((e) => e.id === editingId) : null;

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-gray-900 overflow-auto flex items-start justify-center pt-8 transition-colors relative ${
        dropHighlight ? 'bg-blue-950/30' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Empty state hint — minimal, canvas-first */}
      {visibleElements.length === 0 && !editingId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Click a tool and click to place, or drag from the sidebar
            </p>
            <p className="text-[10px] text-gray-600 mt-1.5">
              <span className="text-gray-500">Shift+click</span> to place multiple
            </p>
          </div>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
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

          {/* Ghost placement preview */}
          {ghostPos && ghostDefaults && ghostTool && (
            <>
              <Rect
                x={ghostPos.x - ghostDefaults.width / 2}
                y={ghostPos.y - ghostDefaults.height / 2}
                width={ghostDefaults.width}
                height={ghostDefaults.height}
                fill="rgba(59, 130, 246, 0.08)"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth={1}
                dash={[6, 3]}
                cornerRadius={4}
                listening={false}
              />
              <Text
                x={ghostPos.x - ghostDefaults.width / 2 + 8}
                y={ghostPos.y - 8}
                width={ghostDefaults.width - 16}
                text={ghostDefaults.label}
                fill="rgba(59, 130, 246, 0.5)"
                fontSize={12}
                fontFamily="monospace"
                listening={false}
              />
            </>
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
              onLabelChange={(label) => {
                startEditing(el.id);
              }}
              onContextMenu={(cx, cy) => {
                selectElement(el.id);
                setContextMenu({ x: cx, y: cy, elementId: el.id });
              }}
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

      {/* Inline edit HTML overlay */}
      {editingEl && (() => {
        const stageEl = containerRef.current?.querySelector('canvas')?.parentElement;
        if (!stageEl || !containerRef.current) return null;
        const containerRect = containerRef.current.getBoundingClientRect();
        const stageRect = stageEl.getBoundingClientRect();
        const x = stageRect.left - containerRect.left + editingEl.x + CANVAS_PADDING + 4 + containerRef.current.scrollLeft;
        const y = stageRect.top - containerRect.top + editingEl.y + CANVAS_PADDING +
          (editingEl.type === 'heading' ? 2 : editingEl.height / 2 - 14) + containerRef.current.scrollTop;

        return (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="absolute bg-gray-800/90 border border-blue-500 rounded px-1 py-0.5 text-sm text-white font-mono focus:outline-none z-20"
            style={{
              left: x,
              top: y,
              width: Math.max(100, editingEl.width - 8),
            }}
          />
        );
      })()}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <CtxItem label="Edit Label" shortcut="Dbl-click" onClick={() => { startEditing(contextMenu.elementId); setContextMenu(null); }} />
          <div className="h-px bg-gray-700 my-1" />
          <CtxItem label="Copy" shortcut="Cmd+C" onClick={() => { copySelected(); setContextMenu(null); }} />
          {hasClipboard && <CtxItem label="Paste" shortcut="Cmd+V" onClick={() => { paste(); setContextMenu(null); }} />}
          <CtxItem label="Duplicate" shortcut="Cmd+D" onClick={() => { duplicateSelected(); setContextMenu(null); }} />
          <div className="h-px bg-gray-700 my-1" />
          <CtxItem label="Bring to Front" onClick={() => { bringToFront(contextMenu.elementId); setContextMenu(null); }} />
          <CtxItem label="Send to Back" onClick={() => { sendToBack(contextMenu.elementId); setContextMenu(null); }} />
          <div className="h-px bg-gray-700 my-1" />
          <CtxItem label="Delete" shortcut="Del" danger onClick={() => { deleteSelectedElements(); setContextMenu(null); }} />
        </div>
      )}
    </div>
  );
}

function CtxItem({ label, shortcut, danger, onClick }: { label: string; shortcut?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-4 transition-colors ${
        danger ? 'text-red-400 hover:bg-red-950/50' : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      <span>{label}</span>
      {shortcut && <span className="text-gray-500 text-[10px]">{shortcut}</span>}
    </button>
  );
}
