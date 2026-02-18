'use client';

import { useState, useCallback } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { generateMarkdown } from './generateMarkdown';

export default function ExportPanel({ onClose }: { onClose: () => void }) {
  const { project } = useProjectStore();
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState<'react-tailwind' | 'html-css' | 'nextjs'>('react-tailwind');

  const markdown = generateMarkdown(project, target);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Export Blueprint</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Copy this markdown and paste into Claude Code
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Export target selector */}
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="text-xs text-gray-500">Target:</span>
          {(
            [
              { value: 'react-tailwind', label: 'React + Tailwind' },
              { value: 'html-css', label: 'HTML / CSS' },
              { value: 'nextjs', label: 'Next.js App Router' },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setTarget(t.value)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                target === t.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Markdown preview */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed bg-gray-950 rounded-lg p-4 border border-gray-800">
            {markdown}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-6 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-500 transition-colors font-medium"
          >
            {copied ? 'Copied!' : 'Copy for Claude'}
          </button>
        </div>
      </div>
    </div>
  );
}
