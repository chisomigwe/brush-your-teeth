// --- Legacy types (kept for backward compatibility) ---

export interface VerificationRecord {
  verified: boolean;
  timestamp: string;
  confidence: "high" | "medium" | "low";
  photoUri?: string;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  // Legacy fields (pre-v2)
  morningBrush?: VerificationRecord;
  eveningBrush?: VerificationRecord;
  morningFloss?: VerificationRecord;
  eveningFloss?: VerificationRecord;
  // V2 fields
  sessions?: SessionRecord[];
  dataVersion?: number; // 1 = legacy, 2 = session-based
}

export interface UserSettings {
  morningTime: string; // HH:mm
  eveningTime: string; // HH:mm
  notificationsEnabled: boolean;
  reminderIntervalMinutes: number;
  // V2 fields
  useSameRoutine: boolean;
  morningRoutineId: string | null;
  eveningRoutineId: string | null;
  aiCoachingEnabled: boolean;
  dataVersion: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDaysCompleted: number;
  totalBrushSessions: number;
  totalFlossSessions: number;
  totalTongueScrapes: number;
  totalMouthwashSessions: number;
  totalCompleteSessions: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type:
    | "streak"
    | "total_brush"
    | "total_floss"
    | "total_days"
    | "total_tongue_scrape"
    | "total_mouthwash"
    | "total_sessions";
  unlockedAt?: string;
}

export interface VisionResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  feedback: string;
}

export type VerificationStep =
  | "floss"
  | "brush"
  | "tongue_scrape"
  | "mouthwash"
  | "custom";
export type TimeOfDay = "morning" | "evening";

// --- Routine types ---

export type RoutineStepType =
  | "brush"
  | "floss"
  | "tongue_scrape"
  | "mouthwash"
  | "custom";

export interface RoutineStepDefinition {
  id: string;
  type: RoutineStepType;
  label: string;
  durationSeconds: number | null; // null = no timer (user taps Done)
  hasQuadrantCoaching: boolean;
  order: number;
}

export interface RoutineDefinition {
  id: string;
  name: string;
  timeSlot: "morning" | "evening";
  steps: RoutineStepDefinition[];
}

// --- Session types ---

export interface CoachingMessage {
  timestamp: string;
  message: string;
}

export interface SessionStepResult {
  stepId: string;
  stepType: RoutineStepType;
  stepLabel: string;
  verified: boolean;
  confidence: "high" | "medium" | "low";
  feedback: string;
  coachingMessages: CoachingMessage[];
  durationActualSeconds: number;
  completedAt: string;
  photoUri?: string;
}

export interface SessionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: "morning" | "evening";
  routineId: string;
  startedAt: string;
  completedAt?: string;
  steps: SessionStepResult[];
  overallVerified: boolean;
  summary?: string;
}

// --- AI coaching types ---

export interface FrameAnalysisResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  feedback: string;
  coachingTip?: string;
  activityDetected: boolean;
}

export interface FrameAnalysisContext {
  stepType: RoutineStepType;
  stepLabel: string;
  currentQuadrant?: BrushingQuadrant;
  elapsedSeconds: number;
  previousFeedback?: string;
  frameIndex: number;
}

export type BrushingQuadrant =
  | "top_right"
  | "top_left"
  | "bottom_left"
  | "bottom_right";
