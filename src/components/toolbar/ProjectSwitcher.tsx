'use client';

import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';

export default function ProjectSwitcher() {
  const {
    project,
    getProjectList,
    switchProject,
    createNewProject,
    deleteProject,
    exportProjectJSON,
    importProjectJSON,
  } = useProjectStore();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const projects = getProjectList().sort((a, b) => b.updatedAt - a.updatedAt);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExport = () => {
    const json = exportProjectJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.sketchflow.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const json = ev.target?.result as string;
      importProjectJSON(json);
      setOpen(false);
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-md hover:border-gray-500 transition-colors"
      >
        <span className="text-[10px]">▼</span> Projects
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Project list */}
          <div className="max-h-48 overflow-y-auto">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                  p.id === project.id
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <button
                  onClick={() => {
                    if (p.id !== project.id) {
                      switchProject(p.id);
                    }
                    setOpen(false);
                  }}
                  className="flex-1 text-left truncate"
                >
                  {p.name}
                  {p.id === project.id && (
                    <span className="ml-2 text-[10px] text-blue-400">active</span>
                  )}
                </button>
                {p.id !== project.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(p.id);
                    }}
                    className="text-gray-600 hover:text-red-400 text-xs ml-2 transition-colors"
                    title="Delete project"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-700 p-2 flex flex-col gap-1">
            <button
              onClick={() => {
                createNewProject();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              + New Project
            </button>
            <button
              onClick={handleExport}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleImport}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              Import JSON
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
