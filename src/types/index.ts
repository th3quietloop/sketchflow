export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export type ScreenStateType = 'default' | 'empty' | 'error' | 'loading';

export type ElementType =
  | 'container'
  | 'heading'
  | 'body'
  | 'cta'
  | 'textfield'
  | 'image'
  | 'card'
  | 'topnav'
  | 'tabbar'
  | 'bottomsheet'
  | 'list';

export type SemanticTag =
  | 'primary-cta'
  | 'destructive-action'
  | 'trust-signal'
  | 'social-proof'
  | 'hero-section'
  | 'utility-nav'
  | 'none';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  annotation: string;
  semanticTag: SemanticTag;
  screenState: ScreenStateType;
}

export interface FlowArrow {
  id: string;
  fromScreenId: string;
  toScreenId: string;
  trigger: string;
}

export interface Screen {
  id: string;
  name: string;
  userGoal: string;
  elements: CanvasElement[];
  activeState: ScreenStateType;
  // Position on the flow canvas
  flowX: number;
  flowY: number;
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  screens: Screen[];
  arrows: FlowArrow[];
}

export interface Project {
  id: string;
  name: string;
  goal: string;
  device: DeviceType;
  screens: Screen[];
  arrows: FlowArrow[];
  versions: VersionSnapshot[];
}

export const DEVICE_DIMENSIONS: Record<DeviceType, { width: number; height: number }> = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

export const ELEMENT_DEFAULTS: Record<ElementType, { width: number; height: number; label: string }> = {
  container: { width: 335, height: 200, label: 'Container' },
  heading: { width: 200, height: 36, label: 'Heading' },
  body: { width: 300, height: 60, label: 'Body Text' },
  cta: { width: 200, height: 48, label: 'Button' },
  textfield: { width: 300, height: 44, label: 'Text Field' },
  image: { width: 300, height: 200, label: 'Image' },
  card: { width: 300, height: 160, label: 'Card' },
  topnav: { width: 375, height: 56, label: 'Top Nav' },
  tabbar: { width: 375, height: 56, label: 'Tab Bar' },
  bottomsheet: { width: 375, height: 300, label: 'Bottom Sheet' },
  list: { width: 300, height: 240, label: 'List' },
};

export const TOOL_GROUPS: { label: string; tools: { type: ElementType; label: string; icon: string }[] }[] = [
  {
    label: 'Layout',
    tools: [
      { type: 'container', label: 'Container', icon: '▢' },
      { type: 'card', label: 'Card', icon: '▤' },
    ],
  },
  {
    label: 'Text',
    tools: [
      { type: 'heading', label: 'Heading', icon: 'H' },
      { type: 'body', label: 'Body', icon: 'T' },
    ],
  },
  {
    label: 'Actions',
    tools: [
      { type: 'cta', label: 'CTA / Button', icon: '⊡' },
      { type: 'textfield', label: 'Text Field', icon: '⊟' },
    ],
  },
  {
    label: 'Media',
    tools: [
      { type: 'image', label: 'Image', icon: '⊞' },
    ],
  },
  {
    label: 'Navigation',
    tools: [
      { type: 'topnav', label: 'Top Nav', icon: '☰' },
      { type: 'tabbar', label: 'Tab Bar', icon: '⋯' },
    ],
  },
  {
    label: 'Overlay',
    tools: [
      { type: 'bottomsheet', label: 'Bottom Sheet', icon: '⊥' },
    ],
  },
  {
    label: 'Content',
    tools: [
      { type: 'list', label: 'List / Feed', icon: '☷' },
    ],
  },
];
