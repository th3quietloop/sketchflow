'use client';

import { useRef, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Text, Arrow, Group } from 'react-konva';
import type Konva from 'konva';
import { useProjectStore } from '@/store/useProjectStore';
import { DEVICE_DIMENSIONS } from '@/types';

const SCREEN_CARD_W = 200;
const SCREEN_CARD_H = 140;

export default function FlowCanvas() {
  const {
    project,
    activeScreenId,
    activeTool,
    setActiveScreen,
    updateScreenFlowPosition,
    addArrow,
    removeArrow,
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
      }
    },
    [activeTool, arrowStart, setActiveScreen]
  );

  const handleScreenDblClick = useCallback(
    (screenId: string) => {
      setActiveScreen(screenId);
      setViewMode('screen');
    },
    [setActiveScreen, setViewMode]
  );

  const confirmArrow = () => {
    if (triggerModal) {
      addArrow(triggerModal.from, triggerModal.to, triggerText);
      setTriggerModal(null);
      setTriggerText('tap');
    }
  };

  // Get the center of a screen card for arrow positioning
  const getScreenCenter = (screenId: string) => {
    const s = project.screens.find((sc) => sc.id === screenId);
    if (!s) return { x: 0, y: 0 };
    return {
      x: s.flowX + SCREEN_CARD_W / 2,
      y: s.flowY + SCREEN_CARD_H / 2,
    };
  };

  // Get edge point for arrow (connects to edge of card, not center)
  const getEdgePoint = (
    fromId: string,
    toId: string,
    side: 'from' | 'to'
  ) => {
    const from = getScreenCenter(fromId);
    const to = getScreenCenter(toId);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    const center = side === 'from' ? from : to;
    const hw = SCREEN_CARD_W / 2;
    const hh = SCREEN_CARD_H / 2;

    // Find intersection with rectangle edge
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

    return { x: ex, y: ey };
  };

  return (
    <div className="flex-1 bg-gray-900 overflow-auto relative">
      <Stage
        ref={stageRef}
        width={2000}
        height={1200}
        draggable
        style={{
          cursor: activeTool === 'arrow' ? 'crosshair' : 'grab',
        }}
      >
        <Layer>
          {/* Arrows between screens */}
          {project.arrows.map((arrow) => {
            const from = getEdgePoint(arrow.fromScreenId, arrow.toScreenId, 'from');
            const to = getEdgePoint(arrow.fromScreenId, arrow.toScreenId, 'to');
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;

            return (
              <Group key={arrow.id}>
                <Arrow
                  points={[from.x, from.y, to.x, to.y]}
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="#6366f1"
                  pointerLength={10}
                  pointerWidth={8}
                />
                {/* Trigger label */}
                <Rect
                  x={midX - 30}
                  y={midY - 10}
                  width={60}
                  height={20}
                  fill="#1e1b4b"
                  cornerRadius={4}
                  stroke="#4338ca"
                  strokeWidth={1}
                />
                <Text
                  x={midX - 30}
                  y={midY - 6}
                  width={60}
                  text={arrow.trigger}
                  fill="#a5b4fc"
                  fontSize={10}
                  fontFamily="monospace"
                  align="center"
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
                onClick={() => handleScreenClick(s.id)}
                onDblClick={() => handleScreenDblClick(s.id)}
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

      {/* Trigger input modal */}
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
    </div>
  );
}
