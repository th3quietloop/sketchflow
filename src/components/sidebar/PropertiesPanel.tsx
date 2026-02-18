'use client';

import { useProjectStore } from '@/store/useProjectStore';
import type { SemanticTag, ScreenStateType } from '@/types';

const SEMANTIC_OPTIONS: { value: SemanticTag; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'primary-cta', label: 'Primary CTA' },
  { value: 'destructive-action', label: 'Destructive Action' },
  { value: 'trust-signal', label: 'Trust Signal' },
  { value: 'social-proof', label: 'Social Proof' },
  { value: 'hero-section', label: 'Hero Section' },
  { value: 'utility-nav', label: 'Utility Nav' },
];

export default function PropertiesPanel() {
  const {
    project,
    activeScreenId,
    selectedElementId,
    selectedElementIds,
    updateElement,
    deleteSelectedElements,
    duplicateSelected,
    copySelected,
    bringToFront,
    sendToBack,
    renameScreen,
    setScreenGoal,
  } = useProjectStore();

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const element = screen?.elements.find((el) => el.id === selectedElementId);
  const multiCount = selectedElementIds.size;

  return (
    <aside className="w-72 bg-gray-950 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Properties
        </h2>
      </div>

      {/* Screen properties */}
      {screen && (
        <div className="p-3 border-b border-gray-800 space-y-3">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Screen Name
            </label>
            <input
              type="text"
              value={screen.name}
              onChange={(e) => renameScreen(screen.id, e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              User Goal
            </label>
            <textarea
              value={screen.userGoal}
              onChange={(e) => setScreenGoal(screen.id, e.target.value)}
              placeholder="What is the user trying to do here?"
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Multi-select info */}
      {multiCount > 1 && (
        <div className="p-3 border-b border-gray-800 space-y-2">
          <p className="text-xs text-gray-400">{multiCount} elements selected</p>
          <div className="flex gap-2">
            <button
              onClick={duplicateSelected}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Duplicate
            </button>
            <button
              onClick={deleteSelectedElements}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Delete All
            </button>
          </div>
        </div>
      )}

      {/* Single element properties */}
      {element ? (
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase">
              {element.type}
            </span>
            <div className="flex gap-2">
              <button
                onClick={copySelected}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                title="Copy (Cmd+C)"
              >
                Copy
              </button>
              <button
                onClick={duplicateSelected}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={deleteSelectedElements}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Layering */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Layer Order
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => bringToFront(element.id)}
                className="flex-1 px-2 py-1 text-[10px] bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Bring Front
              </button>
              <button
                onClick={() => sendToBack(element.id)}
                className="flex-1 px-2 py-1 text-[10px] bg-gray-800 border border-gray-700 rounded text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Send Back
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Label
            </label>
            <input
              type="text"
              value={element.label}
              onChange={(e) =>
                updateElement(element.id, { label: e.target.value })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">X</label>
              <input
                type="number"
                value={Math.round(element.x)}
                onChange={(e) => updateElement(element.id, { x: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Y</label>
              <input
                type="number"
                value={Math.round(element.y)}
                onChange={(e) => updateElement(element.id, { y: Number(e.target.value) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Width</label>
              <input
                type="number"
                value={Math.round(element.width)}
                onChange={(e) => updateElement(element.id, { width: Math.max(24, Number(e.target.value)) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Height</label>
              <input
                type="number"
                value={Math.round(element.height)}
                onChange={(e) => updateElement(element.id, { height: Math.max(24, Number(e.target.value)) })}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Semantic Tag
            </label>
            <select
              value={element.semanticTag}
              onChange={(e) =>
                updateElement(element.id, { semanticTag: e.target.value as SemanticTag })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {SEMANTIC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Visible In State
            </label>
            <select
              value={element.screenState}
              onChange={(e) =>
                updateElement(element.id, { screenState: e.target.value as ScreenStateType })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="default">Default</option>
              <option value="empty">Empty</option>
              <option value="error">Error</option>
              <option value="loading">Loading</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Annotation
            </label>
            <textarea
              value={element.annotation}
              onChange={(e) =>
                updateElement(element.id, { annotation: e.target.value })
              }
              placeholder="Design intent, notes for AI..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      ) : multiCount === 0 ? (
        <div className="p-3 text-sm text-gray-500">
          <p>Select an element to edit its properties.</p>
          <p className="mt-3 text-xs text-gray-600 leading-relaxed">
            <span className="text-gray-500">Shift+Click</span> to multi-select<br />
            <span className="text-gray-500">Cmd+D</span> to duplicate<br />
            <span className="text-gray-500">Cmd+A</span> to select all<br />
            <span className="text-gray-500">Cmd+Z</span> to undo
          </p>
        </div>
      ) : null}
    </aside>
  );
}
