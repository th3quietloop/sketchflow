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

const STORAGE_KEY = 'sketchflow-projects';
const ACTIVE_KEY = 'sketchflow-active-project';
const UNDO_LIMIT = 50;
const SAVE_DEBOUNCE_MS = 800;

// ─── Multi-project localStorage persistence ─────────────────

interface ProjectIndex {
  id: string;
  name: string;
  updatedAt: number;
}

function loadProjectList(): ProjectIndex[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectIndex[];
  } catch {
    return [];
  }
}

function saveProjectList(list: ProjectIndex[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/** Ensure all required fields exist with safe defaults */
function sanitizeProject(raw: Record<string, unknown>): Project {
  return {
    id: (raw.id as string) || uuid(),
    name: (raw.name as string) || 'Untitled Project',
    goal: (raw.goal as string) || '',
    device: ['mobile', 'tablet', 'desktop'].includes(raw.device as string)
      ? (raw.device as Project['device'])
      : 'mobile',
    screens: Array.isArray(raw.screens) && raw.screens.length > 0
      ? (raw.screens as Screen[]).map((s) => ({
          ...s,
          elements: Array.isArray(s.elements) ? s.elements : [],
          activeState: s.activeState || 'default',
          flowX: typeof s.flowX === 'number' ? s.flowX : 0,
          flowY: typeof s.flowY === 'number' ? s.flowY : 0,
          userGoal: s.userGoal || '',
        }))
      : [createDefaultScreen()],
    arrows: Array.isArray(raw.arrows) ? (raw.arrows as FlowArrow[]) : [],
    versions: Array.isArray(raw.versions) ? (raw.versions as VersionSnapshot[]) : [],
  };
}

function loadProjectById(id: string): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`sketchflow-p-${id}`);
    if (!raw) return null;
    return sanitizeProject(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveProjectData(p: Project) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`sketchflow-p-${p.id}`, JSON.stringify(p));
    // Update the index
    const list = loadProjectList();
    const idx = list.findIndex((item) => item.id === p.id);
    const entry: ProjectIndex = { id: p.id, name: p.name, updatedAt: Date.now() };
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    saveProjectList(list);
    localStorage.setItem(ACTIVE_KEY, p.id);
  } catch {}
}

function deleteProjectData(id: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`sketchflow-p-${id}`);
    const list = loadProjectList().filter((item) => item.id !== id);
    saveProjectList(list);
  } catch {}
}

// Migrate from old single-project format if needed
function migrateOldStorage(): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const old = localStorage.getItem('sketchflow-project');
    if (!old) return null;
    const p = sanitizeProject(JSON.parse(old));
    saveProjectData(p);
    localStorage.removeItem('sketchflow-project');
    return p;
  } catch {
    return null;
  }
}

function loadFromStorage(): Project | null {
  if (typeof window === 'undefined') return null;
  // Try new format first
  const activeId = localStorage.getItem(ACTIVE_KEY);
  if (activeId) {
    const p = loadProjectById(activeId);
    if (p) return p;
  }
  // Try loading most recent from index
  const list = loadProjectList();
  if (list.length > 0) {
    const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
    const p = loadProjectById(sorted[0].id);
    if (p) return p;
  }
  // Try migrating old format
  return migrateOldStorage();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savedTimer: ReturnType<typeof setTimeout> | null = null;
function saveToStorage(p: Project) {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  if (savedTimer) clearTimeout(savedTimer);
  saveStatus = 'saving';
  saveTimer = setTimeout(() => {
    saveProjectData(p);
    saveStatus = 'saved';
    snapshot = buildSnapshot();
    emit();
    // Reset to idle after 2s
    savedTimer = setTimeout(() => {
      saveStatus = 'idle';
      snapshot = buildSnapshot();
      emit();
    }, 2000);
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
let selectedArrowId: string | null = null;
let activeScreenId: string = project.screens[0]?.id ?? '';
let activeTool: ElementType | 'select' | 'arrow' = 'select';
let viewMode: 'screen' | 'flow' = 'screen';
let snapEnabled: boolean = true;
let clipboard: CanvasElement[] = [];
let saveStatus: 'idle' | 'saving' | 'saved' = 'idle';
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
  selectedArrowId: string | null;
  activeScreenId: string;
  activeTool: ToolType;
  viewMode: ViewModeType;
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  hasClipboard: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
}

let snapshot: StoreSnapshot = buildSnapshot();

function buildSnapshot(): StoreSnapshot {
  return {
    project: { ...project },
    selectedElementIds: new Set(selectedElementIds),
    selectedArrowId,
    activeScreenId,
    activeTool,
    viewMode,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    snapEnabled,
    hasClipboard: clipboard.length > 0,
    saveStatus,
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

  addElement(type: ElementType, x: number, y: number, keepTool?: boolean) {
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
    if (!keepTool) activeTool = 'select';
    updateSnapshot();
  },

  updateElement(elementId: string, updates: Partial<CanvasElement>) {
    // Clone updates to avoid mutating caller's object
    const u = { ...updates };
    if (u.x !== undefined) u.x = snap(u.x);
    if (u.y !== undefined) u.y = snap(u.y);

    // Push undo for property changes (not position/size — those use beginDrag)
    const isPropertyChange = u.label !== undefined || u.annotation !== undefined
      || u.semanticTag !== undefined || u.screenState !== undefined;
    if (isPropertyChange) pushUndo();

    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? {
              ...s,
              elements: s.elements.map((el) =>
                el.id === elementId ? { ...el, ...u } : el
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

  // --- Clipboard ---

  copySelected() {
    const screen = project.screens.find((s) => s.id === activeScreenId);
    if (!screen || selectedElementIds.size === 0) return;
    clipboard = screen.elements
      .filter((el) => selectedElementIds.has(el.id))
      .map((el) => JSON.parse(JSON.stringify(el)));
    updateSnapshot();
  },

  paste() {
    if (clipboard.length === 0) return;
    pushUndo();
    const newIds: string[] = [];
    const pasted = clipboard.map((el) => {
      const newId = uuid();
      newIds.push(newId);
      return { ...el, id: newId, x: el.x + 16, y: el.y + 16 };
    });
    // Update clipboard positions so subsequent pastes cascade
    clipboard = pasted.map((el) => JSON.parse(JSON.stringify(el)));

    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? { ...s, elements: [...s.elements, ...pasted] }
          : s
      ),
    };
    selectedElementIds = new Set(newIds);
    updateSnapshot();
  },

  // --- Z-Index / Layering ---

  bringToFront(elementId: string) {
    const screen = project.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const el = screen.elements.find((e) => e.id === elementId);
    if (!el) return;
    pushUndo();
    const others = screen.elements.filter((e) => e.id !== elementId);
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? { ...s, elements: [...others, el] }
          : s
      ),
    };
    updateSnapshot();
  },

  sendToBack(elementId: string) {
    const screen = project.screens.find((s) => s.id === activeScreenId);
    if (!screen) return;
    const el = screen.elements.find((e) => e.id === elementId);
    if (!el) return;
    pushUndo();
    const others = screen.elements.filter((e) => e.id !== elementId);
    project = {
      ...project,
      screens: project.screens.map((s) =>
        s.id === activeScreenId
          ? { ...s, elements: [el, ...others] }
          : s
      ),
    };
    updateSnapshot();
  },

  // --- Screen scaffolding ---

  scaffoldScreens(screenNames: string[], goal: string) {
    pushUndo();
    const screens: Screen[] = screenNames.map((name, i) => ({
      id: uuid(),
      name,
      userGoal: goal,
      elements: [],
      activeState: 'default' as ScreenStateType,
      flowX: i * 300,
      flowY: 0,
    }));
    project = { ...project, screens };
    activeScreenId = screens[0].id;
    selectedElementIds = new Set();
    updateSnapshot();
  },

  scaffoldScreensWithGoals(screenNames: string[], perScreenGoals: string[], fullGoal: string) {
    pushUndo();
    const screens: Screen[] = screenNames.map((name, i) => ({
      id: uuid(),
      name,
      userGoal: perScreenGoals[i] || fullGoal,
      elements: [],
      activeState: 'default' as ScreenStateType,
      flowX: i * 300,
      flowY: 0,
    }));
    project = { ...project, screens };
    activeScreenId = screens[0].id;
    selectedElementIds = new Set();
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

  selectArrow(arrowId: string | null) {
    selectedArrowId = arrowId;
    selectedElementIds = new Set();
    updateSnapshot();
  },

  deleteSelectedArrow() {
    if (!selectedArrowId) return;
    pushUndo();
    project = {
      ...project,
      arrows: project.arrows.filter((a) => a.id !== selectedArrowId),
    };
    selectedArrowId = null;
    updateSnapshot();
  },

  removeArrow(arrowId: string) {
    pushUndo();
    project = {
      ...project,
      arrows: project.arrows.filter((a) => a.id !== arrowId),
    };
    if (selectedArrowId === arrowId) selectedArrowId = null;
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
    selectedArrowId = null;
    activeTool = 'select';
    undoStack.length = 0;
    redoStack.length = 0;
    updateSnapshot();
  },

  resetProject() {
    project = createDefaultProject();
    activeScreenId = project.screens[0].id;
    selectedElementIds = new Set();
    selectedArrowId = null;
    activeTool = 'select';
    undoStack.length = 0;
    redoStack.length = 0;
    updateSnapshot();
  },

  // --- Multi-project ---

  getProjectList(): ProjectIndex[] {
    return loadProjectList();
  },

  switchProject(projectId: string) {
    // Save current project first
    saveProjectData(project);
    const p = loadProjectById(projectId);
    if (!p) return;
    project = p;
    activeScreenId = p.screens[0]?.id ?? '';
    selectedElementIds = new Set();
    selectedArrowId = null;
    activeTool = 'select';
    viewMode = 'screen';
    undoStack.length = 0;
    redoStack.length = 0;
    localStorage.setItem(ACTIVE_KEY, projectId);
    updateSnapshot();
  },

  createNewProject() {
    // Save current project first
    saveProjectData(project);
    project = createDefaultProject();
    activeScreenId = project.screens[0].id;
    selectedElementIds = new Set();
    selectedArrowId = null;
    activeTool = 'select';
    viewMode = 'screen';
    undoStack.length = 0;
    redoStack.length = 0;
    saveProjectData(project);
    updateSnapshot();
  },

  deleteProject(projectId: string) {
    if (projectId === project.id) return; // Can't delete active project
    deleteProjectData(projectId);
    updateSnapshot();
  },

  exportProjectJSON(): string {
    return JSON.stringify(project, null, 2);
  },

  importProjectJSON(json: string) {
    try {
      const raw = JSON.parse(json);
      if (!raw || !Array.isArray(raw.screens) || raw.screens.length === 0) {
        throw new Error('Invalid project');
      }
      // Ensure required fields exist with defaults
      const p: Project = {
        id: uuid(),
        name: raw.name || 'Imported Project',
        goal: raw.goal || '',
        device: ['mobile', 'tablet', 'desktop'].includes(raw.device) ? raw.device : 'mobile',
        screens: raw.screens.map((s: Record<string, unknown>) => ({
          id: (s.id as string) || uuid(),
          name: (s.name as string) || 'Screen',
          userGoal: (s.userGoal as string) || '',
          elements: Array.isArray(s.elements) ? s.elements : [],
          activeState: (s.activeState as string) || 'default',
          flowX: typeof s.flowX === 'number' ? s.flowX : 0,
          flowY: typeof s.flowY === 'number' ? s.flowY : 0,
        })),
        arrows: Array.isArray(raw.arrows) ? raw.arrows : [],
        versions: Array.isArray(raw.versions) ? raw.versions : [],
      };
      project = p;
      activeScreenId = p.screens[0]?.id ?? '';
      selectedElementIds = new Set();
      selectedArrowId = null;
      activeTool = 'select';
      viewMode = 'screen';
      undoStack.length = 0;
      redoStack.length = 0;
      saveProjectData(project);
      updateSnapshot();
    } catch {
      // Invalid JSON — silently fail
    }
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
