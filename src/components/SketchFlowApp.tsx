'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import TopBar from './toolbar/TopBar';
import ToolSidebar from './toolbar/ToolSidebar';
import ScreenTabs from './canvas/ScreenTabs';
import ScreenCanvas from './canvas/ScreenCanvas';
import FlowCanvas from './flow/FlowCanvas';
import PropertiesPanel from './sidebar/PropertiesPanel';
import ExportPanel from './export/ExportPanel';
import VersionPanel from './history/VersionPanel';
import IntentLauncher from './IntentLauncher';

export default function SketchFlowApp() {
  const { viewMode, project } = useProjectStore();
  const [showExport, setShowExport] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  // Only show launcher for brand-new projects (no goal and default name)
  const [showLauncher, setShowLauncher] = useState(
    !project.goal && project.name === 'Untitled Project'
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-200 overflow-hidden">
      {showLauncher && (
        <IntentLauncher onClose={() => setShowLauncher(false)} />
      )}

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
    </div>
  );
}
