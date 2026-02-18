'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Arrow, Group, Line } from 'react-konva';
import type Konva from 'konva';
import { useProjectStore } from '@/store/useProjectStore';

const SCREEN_CARD_W = 200;
const SCREEN_CARD_H = 140;

export default function FlowCanvas() {
  const {
    project,
    activeScreenId,
    activeTool,
    selectedArrowId,
    setActiveScreen,
    updateScreenFlowPosition,
    addArrow,
    updateArrow,
    removeArrow,
    selectArrow,
    deleteSelectedArrow,
    setActiveTool,
    setViewMode,
  } = useProjectStore();

  const stageRef = useRef<Konva.Stage>(null);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const [triggerModal, setTriggerModal] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [triggerText, setTriggerText] = useState('tap');

  // Edit trigger modal for existing arrows
  const [editArrowId, setEditArrowId] = useState<string | null>(null);
  const [editTriggerText, setEditTriggerText] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (arrowStart) {
          setArrowStart(null);
        } else if (selectedArrowId) {
          selectArrow(null);
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedArrowId) {
        if (!triggerModal && !editArrowId) {
          e.preventDefault();
          deleteSelectedArrow();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [arrowStart, selectedArrowId, triggerModal, editArrowId, selectArrow, deleteSelectedArrow]);

  const handleScreenClick = useCallback(
    (screenId: string) => {
      if (activeTool === 'arrow') {
        if (!arrowStart) {
          setArrowStart(screenId);
        } else if (arrowStart !== screenId) {
          setTriggerModal({ from: arrowStart, to: screenId });
          setArrowStart(null);
        }
      } else {
        setActiveScreen(screenId);
        selectArrow(null);
      }
    },
    [activeTool, arrowStart, setActiveScreen, selectArrow]
  );

  const handleScreenDblClick = useCallback(
    (screenId: string) => {
      setActiveScreen(screenId);
      setViewMode('screen');
    },
    [setActiveScreen, setViewMode]
  );

  const handleArrowClick = useCallback(
    (arrowId: string) => {
      if (activeTool === 'select') {
        selectArrow(arrowId);
      }
    },
    [activeTool, selectArrow]
  );

  const handleArrowDblClick = useCallback(
    (arrowId: string) => {
      const arrow = project.arrows.find((a) => a.id === arrowId);
      if (arrow) {
        setEditArrowId(arrowId);
        setEditTriggerText(arrow.trigger);
      }
    },
    [project.arrows]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Click on empty space deselects
      if (e.target === e.target.getStage()) {
        selectArrow(null);
      }
    },
    [selectArrow]
  );

  const confirmArrow = () => {
    if (triggerModal) {
      addArrow(triggerModal.from, triggerModal.to, triggerText);
      setTriggerModal(null);
      setTriggerText('tap');
    }
  };

  const confirmEditTrigger = () => {
    if (editArrowId) {
      updateArrow(editArrowId, { trigger: editTriggerText });
      setEditArrowId(null);
      setEditTriggerText('');
    }
  };

  const getScreenCenter = (screenId: string) => {
    const s = project.screens.find((sc) => sc.id === screenId);
    if (!s) return null;
    return {
      x: s.flowX + SCREEN_CARD_W / 2,
      y: s.flowY + SCREEN_CARD_H / 2,
    };
  };

  const getEdgePoint = (
    fromId: string,
    toId: string,
    side: 'from' | 'to'
  ) => {
    const from = getScreenCenter(fromId);
    const to = getScreenCenter(toId);
    if (!from || !to) return null;

    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Guard against overlapping/identical positions (division by zero)
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      const center = side === 'from' ? from : to;
      return { x: center.x + (side === 'from' ? -SCREEN_CARD_W / 2 : SCREEN_CARD_W / 2), y: center.y };
    }

    const angle = Math.atan2(dy, dx);
    const center = side === 'from' ? from : to;
    const hw = SCREEN_CARD_W / 2;
    const hh = SCREEN_CARD_H / 2;

    const absCos = Math.abs(Math.cos(angle));
    const absSin = Math.abs(Math.sin(angle));
    let ex: number, ey: number;

    if (hw * absSin <= hh * absCos) {
      const sign = side === 'from' ? 1 : -1;
      ex = center.x + sign * hw * Math.sign(dx);
      ey = center.y + sign * hw * Math.sign(dx) * Math.tan(angle);
    } else {
      const sign = side === 'from' ? 1 : -1;
      ex = center.x + sign * hh * Math.sign(dy) / Math.tan(angle);
      ey = center.y + sign * hh * Math.sign(dy);
    }

    // Final NaN/Infinity guard
    if (!isFinite(ex) || !isFinite(ey)) {
      return { x: center.x, y: center.y };
    }

    return { x: ex, y: ey };
  };

  return (
    <div className="flex-1 bg-gray-900 overflow-auto relative">
      <Stage
        ref={stageRef}
        width={2000}
        height={1200}
        draggable
        onClick={handleStageClick}
        style={{
          cursor: activeTool === 'arrow' ? 'crosshair' : 'grab',
        }}
      >
        <Layer>
          {/* Arrows between screens */}
          {project.arrows.map((arrow) => {
            // Skip arrows referencing deleted screens or self-arrows
            if (arrow.fromScreenId === arrow.toScreenId) return null;
            const from = getEdgePoint(arrow.fromScreenId, arrow.toScreenId, 'from');
            const to = getEdgePoint(arrow.fromScreenId, arrow.toScreenId, 'to');
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const isSelected = arrow.id === selectedArrowId;

            return (
              <Group
                key={arrow.id}
                onClick={(e) => {
                  e.cancelBubble = true;
                  handleArrowClick(arrow.id);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  handleArrowDblClick(arrow.id);
                }}
              >
                {/* Invisible wider hit area for easier clicking */}
                <Line
                  points={[from.x, from.y, to.x, to.y]}
                  stroke="transparent"
                  strokeWidth={16}
                  listening={true}
                />
                <Arrow
                  points={[from.x, from.y, to.x, to.y]}
                  stroke={isSelected ? '#f59e0b' : '#6366f1'}
                  strokeWidth={isSelected ? 3 : 2}
                  fill={isSelected ? '#f59e0b' : '#6366f1'}
                  pointerLength={10}
                  pointerWidth={8}
                  listening={false}
                />
                {/* Trigger label */}
                <Rect
                  x={midX - 30}
                  y={midY - 10}
                  width={60}
                  height={20}
                  fill={isSelected ? '#451a03' : '#1e1b4b'}
                  cornerRadius={4}
                  stroke={isSelected ? '#f59e0b' : '#4338ca'}
                  strokeWidth={1}
                  listening={false}
                />
                <Text
                  x={midX - 30}
                  y={midY - 6}
                  width={60}
                  text={arrow.trigger}
                  fill={isSelected ? '#fcd34d' : '#a5b4fc'}
                  fontSize={10}
                  fontFamily="monospace"
                  align="center"
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Screen cards */}
          {project.screens.map((s) => {
            const isActive = s.id === activeScreenId;
            const isArrowSource = s.id === arrowStart;

            return (
              <Group
                key={s.id}
                x={s.flowX}
                y={s.flowY}
                draggable
                onClick={(e) => {
                  e.cancelBubble = true;
                  handleScreenClick(s.id);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  handleScreenDblClick(s.id);
                }}
                onDragEnd={(e) =>
                  updateScreenFlowPosition(s.id, e.target.x(), e.target.y())
                }
              >
                <Rect
                  width={SCREEN_CARD_W}
                  height={SCREEN_CARD_H}
                  fill={isArrowSource ? '#1e1b4b' : '#111827'}
                  stroke={
                    isArrowSource
                      ? '#6366f1'
                      : isActive
                      ? '#3b82f6'
                      : '#374151'
                  }
                  strokeWidth={isActive || isArrowSource ? 2 : 1}
                  cornerRadius={8}
                />
                <Text
                  x={12}
                  y={12}
                  width={SCREEN_CARD_W - 24}
                  text={s.name}
                  fill="#fff"
                  fontSize={14}
                  fontStyle="bold"
                  fontFamily="monospace"
                />
                <Text
                  x={12}
                  y={34}
                  width={SCREEN_CARD_W - 24}
                  text={s.userGoal || 'No user goal set'}
                  fill="#666"
                  fontSize={11}
                  fontFamily="monospace"
                />
                <Text
                  x={12}
                  y={SCREEN_CARD_H - 30}
                  width={SCREEN_CARD_W - 24}
                  text={`${s.elements.length} elements`}
                  fill="#555"
                  fontSize={10}
                  fontFamily="monospace"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Arrow source indicator */}
      {arrowStart && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-900 border border-indigo-500 text-indigo-200 px-4 py-2 rounded-lg text-sm">
          Click a target screen to connect — or press Escape to cancel
        </div>
      )}

      {/* Selected arrow toolbar */}
      {selectedArrowId && !editArrowId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 px-4 py-2 rounded-lg flex items-center gap-3 shadow-xl">
          <span className="text-xs text-gray-400">Arrow selected</span>
          <button
            onClick={() => {
              const arrow = project.arrows.find((a) => a.id === selectedArrowId);
              if (arrow) {
                setEditArrowId(selectedArrowId);
                setEditTriggerText(arrow.trigger);
              }
            }}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
          >
            Edit Trigger
          </button>
          <button
            onClick={deleteSelectedArrow}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
          <span className="text-[10px] text-gray-500">Del to delete / Esc to deselect</span>
        </div>
      )}

      {/* Trigger input modal (new arrow) */}
      {triggerModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              Navigation Trigger
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              What triggers this navigation?
            </p>
            <input
              type="text"
              value={triggerText}
              onChange={(e) => setTriggerText(e.target.value)}
              placeholder='e.g. tap "Sign In", swipe, submit'
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmArrow();
                if (e.key === 'Escape') {
                  setTriggerModal(null);
                  setTriggerText('tap');
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setTriggerModal(null);
                  setTriggerText('tap');
                }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmArrow}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-500 transition-colors"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit trigger modal (existing arrow) */}
      {editArrowId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              Edit Trigger
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Update the navigation trigger text
            </p>
            <input
              type="text"
              value={editTriggerText}
              onChange={(e) => setEditTriggerText(e.target.value)}
              placeholder='e.g. tap "Sign In", swipe, submit'
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmEditTrigger();
                if (e.key === 'Escape') {
                  setEditArrowId(null);
                  setEditTriggerText('');
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditArrowId(null);
                  setEditTriggerText('');
                }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmEditTrigger}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-500 transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
