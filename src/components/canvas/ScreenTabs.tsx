'use client';

import { useProjectStore } from '@/store/useProjectStore';
import type { ScreenStateType } from '@/types';

const STATES: { value: ScreenStateType; label: string; color: string }[] = [
  { value: 'default', label: 'Default', color: 'bg-emerald-500' },
  { value: 'empty', label: 'Empty', color: 'bg-gray-500' },
  { value: 'error', label: 'Error', color: 'bg-red-500' },
  { value: 'loading', label: 'Loading', color: 'bg-amber-500' },
];

export default function ScreenTabs() {
  const {
    project,
    activeScreenId,
    setActiveScreen,
    setActiveState,
    addScreen,
    removeScreen,
  } = useProjectStore();

  const activeScreen = project.screens.find((s) => s.id === activeScreenId);

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center gap-4">
      {/* Screen selector */}
      <div className="flex items-center gap-1">
        {project.screens.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScreen(s.id)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              s.id === activeScreenId
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {s.name}
          </button>
        ))}
        <button
          onClick={addScreen}
          className="px-2 py-1 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          title="Add screen"
        >
          +
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-gray-700" />

      {/* State tabs */}
      {activeScreen && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500 uppercase mr-1">State:</span>
          {STATES.map((state) => (
            <button
              key={state.value}
              onClick={() => setActiveState(state.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                activeScreen.activeState === state.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${state.color}`} />
              {state.label}
            </button>
          ))}
        </div>
      )}

      {/* Remove screen */}
      {project.screens.length > 1 && (
        <>
          <div className="w-px h-5 bg-gray-700" />
          <button
            onClick={() => removeScreen(activeScreenId)}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            Remove Screen
          </button>
        </>
      )}
    </div>
  );
}
