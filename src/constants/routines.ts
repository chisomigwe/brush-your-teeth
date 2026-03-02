import {
  RoutineStepDefinition,
  RoutineStepType,
  BrushingQuadrant,
} from "../types";

export const STEP_TYPE_METADATA: Record<
  RoutineStepType,
  { icon: string; defaultLabel: string; defaultDuration: number | null }
> = {
  brush: { icon: "🪥", defaultLabel: "Brush Teeth", defaultDuration: 120 },
  floss: { icon: "🧵", defaultLabel: "Floss", defaultDuration: null },
  tongue_scrape: {
    icon: "👅",
    defaultLabel: "Scrape Tongue",
    defaultDuration: null,
  },
  mouthwash: { icon: "💧", defaultLabel: "Mouthwash", defaultDuration: null },
  custom: { icon: "✨", defaultLabel: "Custom Step", defaultDuration: null },
};

export const DEFAULT_ROUTINE_STEPS: Omit<RoutineStepDefinition, "id">[] = [
  {
    type: "floss",
    label: "Floss",
    durationSeconds: null,
    hasQuadrantCoaching: false,
    order: 0,
  },
  {
    type: "brush",
    label: "Brush Teeth",
    durationSeconds: 120,
    hasQuadrantCoaching: true,
    order: 1,
  },
];

export const FULL_ROUTINE_STEPS: Omit<RoutineStepDefinition, "id">[] = [
  {
    type: "floss",
    label: "Floss",
    durationSeconds: null,
    hasQuadrantCoaching: false,
    order: 0,
  },
  {
    type: "brush",
    label: "Brush Teeth",
    durationSeconds: 120,
    hasQuadrantCoaching: true,
    order: 1,
  },
  {
    type: "tongue_scrape",
    label: "Scrape Tongue",
    durationSeconds: null,
    hasQuadrantCoaching: false,
    order: 2,
  },
  {
    type: "mouthwash",
    label: "Mouthwash",
    durationSeconds: null,
    hasQuadrantCoaching: false,
    order: 3,
  },
];

export const QUADRANT_SEQUENCE: {
  quadrant: BrushingQuadrant;
  label: string;
}[] = [
  { quadrant: "top_right", label: "Top Right" },
  { quadrant: "top_left", label: "Top Left" },
  { quadrant: "bottom_left", label: "Bottom Left" },
  { quadrant: "bottom_right", label: "Bottom Right" },
];
