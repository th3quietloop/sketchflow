'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { generateMarkdown } from './export/generateMarkdown';
import TopBar from './toolbar/TopBar';
import ToolSidebar from './toolbar/ToolSidebar';
import ScreenTabs from './canvas/ScreenTabs';
import ScreenCanvas from './canvas/ScreenCanvas';
import FlowCanvas from './flow/FlowCanvas';
import PropertiesPanel from './sidebar/PropertiesPanel';
import ExportPanel from './export/ExportPanel';
import VersionPanel from './history/VersionPanel';

export default function SketchFlowApp() {
  const { viewMode, project } = useProjectStore();
  const [showExport, setShowExport] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [quickExportToast, setQuickExportToast] = useState(false);

  // Auto-dismiss quick export toast
  useEffect(() => {
    if (!quickExportToast) return;
    const timer = setTimeout(() => setQuickExportToast(false), 2000);
    return () => clearTimeout(timer);
  }, [quickExportToast]);

  // Global keyboard shortcut: Cmd+Shift+E for quick export
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
        e.preventDefault();
        const md = generateMarkdown(project, 'react-tailwind');
        navigator.clipboard.writeText(md).then(() => {
          setQuickExportToast(true);
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [project]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200 overflow-hidden">
      <TopBar
        onExport={() => setShowExport(true)}
        onVersions={() => setShowVersions(true)}
      />

      {viewMode === 'screen' && <ScreenTabs />}

      <div className="flex-1 flex overflow-hidden">
        <ToolSidebar />
        {viewMode === 'screen' ? <ScreenCanvas /> : <FlowCanvas />}
        {viewMode === 'screen' && <PropertiesPanel />}
      </div>

      {showExport && <ExportPanel onClose={() => setShowExport(false)} />}
      {showVersions && <VersionPanel onClose={() => setShowVersions(false)} />}

      {/* Quick export toast */}
      {quickExportToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-sm px-5 py-2.5 rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-bottom duration-200">
          Blueprint copied to clipboard
        </div>
      )}
    </div>
  );
}
