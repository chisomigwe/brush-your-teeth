export interface VerificationRecord {
  verified: boolean;
  timestamp: string;
  confidence: "high" | "medium" | "low";
  photoUri?: string;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  morningBrush?: VerificationRecord;
  eveningBrush?: VerificationRecord;
  morningFloss?: VerificationRecord;
  eveningFloss?: VerificationRecord;
}

export interface UserSettings {
  morningTime: string; // HH:mm
  eveningTime: string; // HH:mm
  notificationsEnabled: boolean;
  reminderIntervalMinutes: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalDaysCompleted: number;
  totalBrushSessions: number;
  totalFlossSessions: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: "streak" | "total_brush" | "total_floss" | "total_days";
  unlockedAt?: string;
}

export interface VisionResult {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  feedback: string;
}

export type VerificationStep = "floss" | "brush";
export type TimeOfDay = "morning" | "evening";
