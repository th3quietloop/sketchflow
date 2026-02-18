'use client';

import { useState, useEffect, useCallback } from 'react';
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
import IntentLauncher from './IntentLauncher';

const DEVICE_LABELS: Record<string, string> = {
  mobile: '📱 Mobile',
  tablet: '📟 Tablet',
  desktop: '🖥 Desktop',
};

export default function SketchFlowApp() {
  const { viewMode, project } = useProjectStore();
  const [showExport, setShowExport] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showLauncher, setShowLauncher] = useState(
    !project.goal && project.name === 'Untitled Project'
  );
  const [showIntentBanner, setShowIntentBanner] = useState(false);
  const [quickExportToast, setQuickExportToast] = useState(false);

  // Auto-dismiss the intent banner after 8 seconds
  useEffect(() => {
    if (!showIntentBanner) return;
    const timer = setTimeout(() => setShowIntentBanner(false), 8000);
    return () => clearTimeout(timer);
  }, [showIntentBanner]);

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

  const handleLauncherClose = useCallback((showBanner: boolean) => {
    setShowLauncher(false);
    if (showBanner) setShowIntentBanner(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200 overflow-hidden">
      {showLauncher && (
        <IntentLauncher onClose={handleLauncherClose} />
      )}

      <TopBar
        onExport={() => setShowExport(true)}
        onVersions={() => setShowVersions(true)}
      />

      {/* Intent echo banner — shown after launcher closes with a goal */}
      {showIntentBanner && project.goal && (
        <div className="bg-blue-950/80 border-b border-blue-800/50 px-4 py-3 flex items-center justify-between animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 text-blue-400 text-xs font-medium uppercase tracking-wide">Your intent</span>
            <span className="w-px h-4 bg-blue-800/50 shrink-0" />
            <p className="text-sm text-blue-200 truncate">{project.goal}</p>
            <span className="w-px h-4 bg-blue-800/50 shrink-0" />
            <span className="text-xs text-blue-400/70 shrink-0">
              {DEVICE_LABELS[project.device] || project.device} · {project.screens.length} screen{project.screens.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowIntentBanner(false)}
            className="ml-4 text-blue-400/60 hover:text-blue-300 text-xs transition-colors shrink-0"
          >
            ✕
          </button>
        </div>
      )}

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
