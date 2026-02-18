'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';

export default function VersionPanel({ onClose }: { onClose: () => void }) {
  const { project, saveVersion, restoreVersion } = useProjectStore();
  const [label, setLabel] = useState('');

  const handleSave = () => {
    if (!label.trim()) return;
    saveVersion(label.trim());
    setLabel('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Save new version */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Describe this version..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <button
              onClick={handleSave}
              disabled={!label.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto">
          {project.versions.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No versions saved yet. Save your first version above.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {project.versions.map((v) => (
                <div
                  key={v.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <p className="text-sm text-gray-200">{v.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(v.timestamp)} · {v.screens.length} screens
                    </p>
                  </div>
                  <button
                    onClick={() => restoreVersion(v.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
