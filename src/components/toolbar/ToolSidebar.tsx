'use client';

import { TOOL_GROUPS, type ElementType } from '@/types';
import { useProjectStore } from '@/store/useProjectStore';

export default function ToolSidebar() {
  const { activeTool, setActiveTool, viewMode } = useProjectStore();

  return (
    <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</h2>
      </div>

      {/* Select tool */}
      <div className="px-2 pt-2">
        <button
          onClick={() => setActiveTool('select')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
            activeTool === 'select'
              ? 'bg-blue-600 text-white'
              : 'text-gray-300 hover:bg-gray-800'
          }`}
        >
          <span className="w-5 text-center">↖</span>
          Select
        </button>
      </div>

      {/* Arrow tool (flow mode) */}
      {viewMode === 'flow' && (
        <div className="px-2 pt-1">
          <button
            onClick={() => setActiveTool('arrow')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
              activeTool === 'arrow'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span className="w-5 text-center">→</span>
            Connect Screens
          </button>
        </div>
      )}

      {/* Element tools */}
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="px-2 pt-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">
            {group.label}
          </p>
          {group.tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => setActiveTool(tool.type)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                activeTool === tool.type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="w-5 text-center text-base">{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>
      ))}

      {/* Keyboard shortcuts hint */}
      <div className="mt-auto p-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-600 leading-relaxed">
          <span className="text-gray-500">V</span> Select &nbsp;
          <span className="text-gray-500">Del</span> Delete<br />
          <span className="text-gray-500">Esc</span> Deselect
        </p>
      </div>
    </aside>
  );
}
