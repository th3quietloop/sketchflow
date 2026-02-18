'use client';

import dynamic from 'next/dynamic';

const SketchFlowApp = dynamic(() => import('@/components/SketchFlowApp'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-500 text-sm font-mono">Loading SketchFlow...</p>
    </div>
  ),
});

export default function Home() {
  return <SketchFlowApp />;
}
