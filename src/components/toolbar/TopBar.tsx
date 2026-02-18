'use client';

import { useProjectStore } from '@/store/useProjectStore';
import type { DeviceType } from '@/types';

interface Props {
  onExport: () => void;
  onVersions: () => void;
}

const DEVICES: { value: DeviceType; label: string; icon: string }[] = [
  { value: 'mobile', label: 'Mobile', icon: '📱' },
  { value: 'tablet', label: 'Tablet', icon: '📟' },
  { value: 'desktop', label: 'Desktop', icon: '🖥' },
];

export default function TopBar({ onExport, onVersions }: Props) {
  const {
    project,
    viewMode,
    canUndo,
    canRedo,
    snapEnabled,
    setProjectName,
    setDevice,
    setViewMode,
    setSnapEnabled,
    undo,
    redo,
  } = useProjectStore();

  return (
    <header className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4">
      {/* Left: project name + device */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent text-sm font-semibold text-gray-200 focus:outline-none focus:text-white border-b border-transparent focus:border-gray-600 px-1"
        />

        <div className="flex items-center gap-1 bg-gray-900 rounded-md p-0.5">
          {DEVICES.map((d) => (
            <button
              key={d.value}
              onClick={() => setDevice(d.value)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                project.device === d.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title={d.label}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            title="Undo (Cmd+Z)"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            title="Redo (Cmd+Shift+Z)"
          >
            ↪
          </button>
        </div>

        {/* Snap toggle */}
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`px-2 py-1 rounded text-xs transition-colors ${
            snapEnabled
              ? 'bg-gray-700 text-blue-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Toggle snap to grid"
        >
          Grid {snapEnabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* Center: view mode toggle */}
      <div className="flex items-center gap-1 bg-gray-900 rounded-md p-0.5">
        <button
          onClick={() => setViewMode('screen')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            viewMode === 'screen'
              ? 'bg-gray-700 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Screen
        </button>
        <button
          onClick={() => setViewMode('flow')}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            viewMode === 'flow'
              ? 'bg-gray-700 text-white'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Flow
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onVersions}
          className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-md hover:border-gray-500 transition-colors"
        >
          History
        </button>
        <button
          onClick={onExport}
          className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-500 transition-colors font-medium"
        >
          Export Blueprint
        </button>
      </div>
    </header>
  );
}
