'use client';

import { useSyncExternalStore } from 'react';
import { v4 as uuid } from 'uuid';
import type {
  Project,
  Screen,
  CanvasElement,
  FlowArrow,
  DeviceType,
  ElementType,
  ScreenStateType,
  VersionSnapshot,
} from '@/types';
import { ELEMENT_DEFAULTS } from '@/types';

// ─── Helpers ───────────────────────────────────────────────

function createDefaultScreen(): Screen {
  return {
    id: uuid(),
    name: 'Screen 1',
    userGoal: '',
    elements: [],
    activeState: 'default',
    flowX: 0,
    flowY: 0,
  };
}

function createDefaultProject(): Project {
  return {
    id: uuid(),
    name: 'Untitled Project',
    goal: '',
    device: 'mobile',
    screens: [createDefaultScreen()],
    arrows: [],
    versions: [],
  };
}

const STORAGE_KEY = 'sketchflow-project';
const UNDO_LIMIT = 50;
const SAVE_DEBOUNCE_MS = 800;

// ─── localStorage persistence ──────────────────────────────

function loadFromStorage(): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveToStorage(p: Project) {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // storage full — silently fail
    }
  }, SAVE_DEBOUNCE_MS);
}

// ─── Undo / Redo stack ─────────────────────────────────────

interface ProjectState {
  screens: Screen[];
  arrows: FlowArrow[];
}

function cloneState(p: Project): ProjectState {
  return {
    screens: JSON.parse(JSON.stringify(p.screens)),
    arrows: JSON.parse(JSON.stringify(p.arrows)),
  };
}

const undoStack: ProjectState[] = [];
const redoStack: ProjectState[] = [];

function pushUndo() {
  undoStack.push(cloneState(project));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
}

// ─── Store state ───────────────────────────────────────────

const savedProject = loadFromStorage();
let project: Project = savedProject ?? createDefaultProject();
let selectedElementIds: Set<string> = new Set();
let activeScreenId: string = project.screens[0]?.id ?? '';
let activeTool: ElementType | 'select' | 'arrow' = 'select';
let viewMode: 'screen' | 'flow' = 'screen';
let snapEnabled: boolean = true;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── Snapshot type ─────────────────────────────────────────

type ToolType = ElementType | 'select' | 'arrow';
type ViewModeType = 'screen' | 'flow';

interface StoreSnapshot {
  project: Project;
  selectedElementIds: Set<string>;
  activeScreenId: string;
  activeTool: ToolType;
  viewMode: ViewModeType;
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
}

let snapshot: StoreSnapshot = buildSnapshot();

function buildSnapshot(): StoreSnapshot {
  return {
    project: { ...project },
    selectedElementIds: new Set(selectedElementIds),
    activeScreenId,
    activeTool,
    viewMode,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    snapEnabled,
  };
}

function getSnapshot() {
  return snapshot;
}

function updateSnapshot() {
  snapshot = buildSnapshot();
  saveToStorage(project);
  emit();
}

// ─── Snap helper ───────────────────────────────────────────

export const GRID_SIZE = 8;

function snap(val: number): number {
  return snapEnabled ? Math.round(val / GRID_SIZE) * GRID_SIZE : val;
}

// ─── Actions ───────────────────────────────────────────────

const actions = {
  // --- Undo / Redo ---

  undo() {
    if (undoStack.length === 0) return;
    redoStack.push(cloneState(project));
    const prev = undoStack.pop()!;
    project = { ...project, screens: prev.screens, arrows: prev.arrows };
    if (!project.screens.find((s) => s.id === activeScreenId)) {
      activeScreenId = project.screens[0]?.id ?? '';
    }
    selectedElementIds = new Set();
    updateSnapshot();
  },

  redo() {
    if (redoStack.length === 0) return;
    undoStack.push(cloneState(project));
    const next = redoStack.pop()!;
    project = { ...project, screens: next.screens, arrows: next.arrows };
    if (!project.screens.find((s) => s.id === activeScreenId)) {
      activeScreenId = project.screens[0]?.id ?? '';
    }
    selectedElementIds = new Set();
    updateSnapshot();
  },

  // --- Project metadata ---

  setProjectName(name: string) {
    project = { ...project, name };
    updateSnapshot();
  },

  setProjectGoal(goal: string) {
    project = { ...project, goal };
    updateSnapshot();
  },

  setDevice(device: DeviceType) {
    project = { ...project, device };
    updateSnapshot();
  },

  // --- UI state ---

  setActiveTool(tool: ElementType | 'select' | 'arrow') {
    activeTool = tool;
    updateSnapshot();
  },

  setViewMode(mode: 'screen' | 'flow') {
    viewMode = mode;
    updateSnapshot();
  },

  setSnapEnabled(enabled: boolean) {
    snapEnabled = enabled;
    updateSnapshot();
  },

  setActiveScreen(screenId: string) {
    activeScreenId = screenId;
    selectedElementIds = new Set();
    updateSnapshot();
  },

  setActiveState(state: ScreenStateType) {
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId ? { ...s, activeState: state } : s
      ),
    };
    updateSnapshot();
  },

  // --- Screens ---

  addScreen() {
    pushUndo();
    const idx = project.screens.length + 1;
    const newScreen: Screen = {
      id: uuid(),
      name: `Screen ${idx}`,
      userGoal: '',
      elements: [],
      activeState: 'default',
      flowX: (idx - 1) * 450,
      flowY: 0,
    };
    project = { ...project, screens: [...project.screens, newScreen] };
    activeScreenId = newScreen.id;
    updateSnapshot();
  },

  removeScreen(screenId: string) {
    if (project.screens.length <= 1) return;
    pushUndo();
    project = {
      ...project,
      screens: project.screens.filter((s) => s.id !== screenId),
      arrows: project.arrows.filter(
        (a) => a.fromScreenId !== screenId && a.toScreenId !== screenId
      ),
    };
    if (activeScreenId === screenId) {
      activeScreenId = project.screens[0].id;
    }
    updateSnapshot();
  },

  renameScreen(screenId: string, name: string) {
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === screenId ? { ...s, name } : s
      ),
    };
    updateSnapshot();
  },

  setScreenGoal(screenId: string, goal: string) {
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === screenId ? { ...s, userGoal: goal } : s
      ),
    };
    updateSnapshot();
  },

  // --- Elements ---

  addElement(type: ElementType, x: number, y: number) {
    const defaults = ELEMENT_DEFAULTS[type];
    const activeScreen = project.screens.find((s) => s.id === activeScreenId);
    if (!activeScreen) return;

    pushUndo();
    const el: CanvasElement = {
      id: uuid(),
      type,
      x: snap(x),
      y: snap(y),
      width: defaults.width,
      height: defaults.height,
      label: defaults.label,
      annotation: '',
      semanticTag: 'none',
      screenState: activeScreen.activeState,
    };

    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId ? { ...s, elements: [...s.elements, el] } : s
      ),
    };
    selectedElementIds = new Set([el.id]);
    activeTool = 'select';
    updateSnapshot();
  },

  updateElement(elementId: string, updates: Partial<CanvasElement>) {
    if (updates.x !== undefined) updates.x = snap(updates.x);
    if (updates.y !== undefined) updates.y = snap(updates.y);

    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? {
              ...s,
              elements: s.elements.map((el) =>
                el.id === elementId ? { ...el, ...updates } : el
              ),
            }
          : s
      ),
    };
    updateSnapshot();
  },

  /** Push undo checkpoint before a drag/resize begins */
  beginDrag() {
    pushUndo();
  },

  deleteElement(elementId: string) {
    pushUndo();
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? { ...s, elements: s.elements.filter((el) => el.id !== elementId) }
          : s
      ),
    };
    selectedElementIds = new Set(
      [...selectedElementIds].filter((id) => id !== elementId)
    );
    updateSnapshot();
  },

  deleteSelectedElements() {
    if (selectedElementIds.size === 0) return;
    pushUndo();
    const ids = selectedElementIds;
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? { ...s, elements: s.elements.filter((el) => !ids.has(el.id)) }
          : s
      ),
    };
    selectedElementIds = new Set();
    updateSnapshot();
  },

  // --- Selection ---

  selectElement(elementId: string | null) {
    selectedElementIds = elementId ? new Set([elementId]) : new Set();
    updateSnapshot();
  },

  toggleSelectElement(elementId: string) {
    const next = new Set(selectedElementIds);
    if (next.has(elementId)) {
      next.delete(elementId);
    } else {
      next.add(elementId);
    }
    selectedElementIds = next;
    updateSnapshot();
  },

  selectAll() {
    const screen = project.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    selectedElementIds = new Set(
      screen.elements
        .filter((el) => el.screenState === screen.activeState)
        .map((el) => el.id)
    );
    updateSnapshot();
  },

  // --- Duplicate ---

  duplicateSelected() {
    const screen = project.screens.find((s) => s.id === activeScreenId);
    if (!screen || selectedElementIds.size === 0) return;
    pushUndo();

    const newIds: string[] = [];
    const dupes = screen.elements
      .filter((el) => selectedElementIds.has(el.id))
      .map((el) => {
        const newId = uuid();
        newIds.push(newId);
        return { ...el, id: newId, x: el.x + 16, y: el.y + 16 };
      });

    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? { ...s, elements: [...s.elements, ...dupes] }
          : s
      ),
    };
    selectedElementIds = new Set(newIds);
    updateSnapshot();
  },

  // --- Arrows ---

  addArrow(fromScreenId: string, toScreenId: string, trigger: string) {
    pushUndo();
    const arrow: FlowArrow = { id: uuid(), fromScreenId, toScreenId, trigger };
    project = { ...project, arrows: [...project.arrows, arrow] };
    updateSnapshot();
  },

  updateArrow(arrowId: string, updates: Partial<FlowArrow>) {
    project = {
      ...project,
      arrows: project.arrows.map((a) =>
        a.id === arrowId ? { ...a, ...updates } : a
      ),
    };
    updateSnapshot();
  },

  removeArrow(arrowId: string) {
    pushUndo();
    project = {
      ...project,
      arrows: project.arrows.filter((a) => a.id !== arrowId),
    };
    updateSnapshot();
  },

  updateScreenFlowPosition(screenId: string, x: number, y: number) {
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === screenId ? { ...s, flowX: x, flowY: y } : s
      ),
    };
    updateSnapshot();
  },

  // --- Versions ---

  saveVersion(label: string) {
    const version: VersionSnapshot = {
      id: uuid(),
      timestamp: Date.now(),
      label,
      screens: JSON.parse(JSON.stringify(project.screens)),
      arrows: JSON.parse(JSON.stringify(project.arrows)),
    };
    project = { ...project, versions: [version, ...project.versions] };
    updateSnapshot();
  },

  restoreVersion(versionId: string) {
    const version = project.versions.find((v) => v.id === versionId);
    if (!version) return;
    pushUndo();
    project = {
      ...project,
      screens: JSON.parse(JSON.stringify(version.screens)),
      arrows: JSON.parse(JSON.stringify(version.arrows)),
    };
    activeScreenId = project.screens[0]?.id ?? activeScreenId;
    selectedElementIds = new Set();
    updateSnapshot();
  },

  // --- Project I/O ---

  loadProject(p: Project) {
    project = p;
    activeScreenId = p.screens[0]?.id ?? '';
    selectedElementIds = new Set();
    activeTool = 'select';
    undoStack.length = 0;
    redoStack.length = 0;
    updateSnapshot();
  },

  resetProject() {
    project = createDefaultProject();
    activeScreenId = project.screens[0].id;
    selectedElementIds = new Set();
    activeTool = 'select';
    undoStack.length = 0;
    redoStack.length = 0;
    updateSnapshot();
  },
};

export type StoreActions = typeof actions;

export function useProjectStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // Backward-compat: single selectedElementId for components that need it
  const selectedElementId =
    state.selectedElementIds.size === 1
      ? [...state.selectedElementIds][0]
      : null;
  return { ...state, ...actions, selectedElementId };
}
