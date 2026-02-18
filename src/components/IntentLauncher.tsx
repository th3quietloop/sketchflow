'use client';

import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import type { DeviceType } from '@/types';

const DEVICES: { value: DeviceType; label: string; desc: string }[] = [
  { value: 'mobile', label: 'Mobile', desc: '375px viewport' },
  { value: 'tablet', label: 'Tablet', desc: '768px viewport' },
  { value: 'desktop', label: 'Desktop', desc: '1440px viewport' },
];

export default function IntentLauncher({ onClose }: { onClose: () => void }) {
  const { setProjectName, setProjectGoal, setDevice, setScreenGoal, project } =
    useProjectStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [device, setDeviceLocal] = useState<DeviceType>('mobile');

  const handleStart = () => {
    if (name.trim()) setProjectName(name.trim());
    if (goal.trim()) {
      setProjectGoal(goal.trim());
      setScreenGoal(project.screens[0].id, goal.trim());
    }
    setDevice(device);
    onClose();
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
              onClick={onClose}
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
