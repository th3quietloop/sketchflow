'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import type { DeviceType } from '@/types';

const DEVICES: { value: DeviceType; label: string; icon: string; desc: string }[] = [
  { value: 'mobile', label: 'Mobile', icon: '📱', desc: '375px viewport' },
  { value: 'tablet', label: 'Tablet', icon: '📟', desc: '768px viewport' },
  { value: 'desktop', label: 'Desktop', icon: '🖥', desc: '1440px viewport' },
];

/** Try to extract screen names from a goal description */
function parseScreensFromGoal(goal: string): string[] {
  const cleaned = goal
    .replace(/^.*?—\s*/, '')
    .replace(/^.*?:\s*/, '');

  const parts = cleaned
    .split(/,\s*(?:then\s+)?|;\s*|\.\s+|(?:\s+then\s+)|(?:\s+and\s+then\s+)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 3 && p.length < 60);

  if (parts.length < 2) return [];

  return parts.map((part) => {
    const clean = part
      .replace(/^(?:user|they|the user|users)\s+/i, '')
      .replace(/^(?:can|will|should)\s+/i, '')
      // Strip common leading verbs for cleaner screen names
      .replace(/^(?:goes to|views?|sees?|opens?|visits?|navigates? to|clicks? on|taps?|fills? (?:in|out)?|enters?|submits?|completes?|gets?|receives?|lands? on)\s+/i, '');
    return clean
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  });
}

/** Extract per-screen goal fragments from the full goal string */
function parsePerScreenGoals(goal: string): string[] {
  const cleaned = goal
    .replace(/^.*?—\s*/, '')
    .replace(/^.*?:\s*/, '');

  return cleaned
    .split(/,\s*(?:then\s+)?|;\s*|\.\s+|(?:\s+then\s+)|(?:\s+and\s+then\s+)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 3 && p.length < 60)
    .map((p) => {
      // Capitalize first letter
      return p.charAt(0).toUpperCase() + p.slice(1);
    });
}

interface Props {
  onClose: (showBanner: boolean) => void;
}

export default function IntentLauncher({ onClose }: Props) {
  const { setProjectName, setProjectGoal, setDevice, scaffoldScreensWithGoals, project } =
    useProjectStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [userFlow, setUserFlow] = useState('');
  const [device, setDeviceLocal] = useState<DeviceType>('mobile');

  // Combine description + user flow for the full goal
  const fullGoal = [description.trim(), userFlow.trim()].filter(Boolean).join(' — ');
  const suggestedScreens = parseScreensFromGoal(userFlow || description);
  const perScreenGoals = parsePerScreenGoals(userFlow || description);

  const handleStart = useCallback(() => {
    if (name.trim()) setProjectName(name.trim());
    setDevice(device);

    if (fullGoal) {
      setProjectGoal(fullGoal);

      if (suggestedScreens.length >= 2) {
        scaffoldScreensWithGoals(suggestedScreens, perScreenGoals, fullGoal);
      }
    }

    onClose(!!fullGoal);
  }, [name, device, fullGoal, suggestedScreens, perScreenGoals, setProjectName, setDevice, setProjectGoal, scaffoldScreensWithGoals, onClose]);

  // Submit on Enter from any text input (not textarea)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      handleStart();
    }
  }, [handleStart]);

  // Dynamic button label
  const startLabel = suggestedScreens.length >= 2
    ? `Start with ${suggestedScreens.length} Screens`
    : name.trim()
      ? `Start ${name.trim()}`
      : 'Start Designing';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8">
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg"
        onKeyDown={handleKeyDown}
      >
        <div className="p-8">
          <h1 className="text-2xl font-bold text-white mb-1">SketchFlow</h1>
          <p className="text-sm text-gray-400 mb-1">
            Designer-first wireframing for AI code generation
          </p>
          <p className="text-[11px] text-gray-600 mb-8">
            Everything here can be changed later
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

          {/* What are you designing? */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
              What are you designing?
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Onboarding flow for a fitness app"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Describe the user flow */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-2">
              Describe the user flow
            </label>
            <textarea
              value={userFlow}
              onChange={(e) => setUserFlow(e.target.value)}
              placeholder="e.g. user signs up, picks goals, connects wearable"
              rows={2}
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
                  <p className="text-lg mb-0.5">{d.icon}</p>
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions — two equal paths */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onClose(false)}
              className="flex-1 px-6 py-2.5 text-sm rounded-lg font-medium transition-colors border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={handleStart}
              className="flex-1 px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition-colors font-medium"
            >
              {startLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
