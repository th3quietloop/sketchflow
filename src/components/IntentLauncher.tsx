'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import type { DeviceType } from '@/types';

const DEVICES: { value: DeviceType; label: string; desc: string }[] = [
  { value: 'mobile', label: 'Mobile', desc: '375px viewport' },
  { value: 'tablet', label: 'Tablet', desc: '768px viewport' },
  { value: 'desktop', label: 'Desktop', desc: '1440px viewport' },
];

/** Try to extract screen names from a goal description */
function parseScreensFromGoal(goal: string): string[] {
  // Look for comma-separated or "then" separated actions
  // "user signs up, picks goals, connects wearable" → 3 screens
  const cleaned = goal
    .replace(/^.*?—\s*/, '') // Remove prefix before em dash
    .replace(/^.*?:\s*/, ''); // Remove prefix before colon

  // Split on common delimiters
  const parts = cleaned
    .split(/,\s*(?:then\s+)?|;\s*|\.\s+|(?:\s+then\s+)|(?:\s+and\s+then\s+)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 3 && p.length < 60);

  if (parts.length < 2) return [];

  // Convert actions to screen names: "signs up" → "Sign Up"
  return parts.map((part) => {
    // Remove leading "user" or "they"
    const clean = part
      .replace(/^(?:user|they|the user|users)\s+/i, '')
      .replace(/^(?:can|will|should)\s+/i, '');
    // Title case
    return clean
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  });
}

interface Props {
  onClose: (showBanner: boolean) => void;
}

export default function IntentLauncher({ onClose }: Props) {
  const { setProjectName, setProjectGoal, setDevice, setScreenGoal, scaffoldScreens, project } =
    useProjectStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [device, setDeviceLocal] = useState<DeviceType>('mobile');

  const suggestedScreens = parseScreensFromGoal(goal);

  const handleStart = () => {
    if (name.trim()) setProjectName(name.trim());
    setDevice(device);

    if (goal.trim()) {
      setProjectGoal(goal.trim());

      // If we parsed multiple screens, scaffold them
      if (suggestedScreens.length >= 2) {
        scaffoldScreens(suggestedScreens, goal.trim());
      } else {
        setScreenGoal(project.screens[0].id, goal.trim());
      }
    }

    onClose(!!goal.trim()); // show banner if goal was set
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-white mb-1">SketchFlow</h1>
          <p className="text-sm text-gray-400 mb-8">
            Designer-first wireframing for AI code generation
          </p>

          {/* Project name */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Intent */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
              What are you designing? What should the user be able to do?
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Onboarding flow for a fitness app — user signs up, picks goals, connects wearable"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            {/* Live screen preview */}
            {suggestedScreens.length >= 2 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-gray-500 mr-1 self-center">Screens:</span>
                {suggestedScreens.map((s, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-blue-950/50 border border-blue-800/50 rounded text-[10px] text-blue-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Device */}
          <div className="mb-8">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
              Device Frame
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DEVICES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDeviceLocal(d.value)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    device === d.value
                      ? 'border-blue-500 bg-blue-950/50 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => onClose(false)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Start from scratch
            </button>
            <button
              onClick={handleStart}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors font-medium"
            >
              Start Designing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
