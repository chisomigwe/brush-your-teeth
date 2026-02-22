import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DailyRecord,
  UserSettings,
  Achievement,
  StreakInfo,
} from "../types";
import { ACHIEVEMENTS, DEFAULT_SETTINGS } from "../constants/achievements";
import { getToday, getDaysAgo } from "../utils/dateUtils";

const KEYS = {
  RECORDS: "brush_records",
  SETTINGS: "brush_settings",
  ACHIEVEMENTS: "brush_achievements",
};

// --- Daily Records ---

export async function getAllRecords(): Promise<Record<string, DailyRecord>> {
  const data = await AsyncStorage.getItem(KEYS.RECORDS);
  return data ? JSON.parse(data) : {};
}

export async function getDailyRecord(
  date: string
): Promise<DailyRecord | null> {
  const records = await getAllRecords();
  return records[date] || null;
}

export async function saveDailyRecord(record: DailyRecord): Promise<void> {
  const records = await getAllRecords();
  records[record.date] = record;
  await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(records));
}

export async function getTodayRecord(): Promise<DailyRecord> {
  const today = getToday();
  const existing = await getDailyRecord(today);
  return existing || { date: today };
}

export async function markVerified(
  step: "brush" | "floss",
  timeOfDay: "morning" | "evening",
  confidence: "high" | "medium" | "low",
  photoUri?: string
): Promise<DailyRecord> {
  const record = await getTodayRecord();
  const verification = {
    verified: true,
    timestamp: new Date().toISOString(),
    confidence,
    photoUri,
  };

  const key =
    timeOfDay === "morning"
      ? step === "brush"
        ? "morningBrush"
        : "morningFloss"
      : step === "brush"
        ? "eveningBrush"
        : "eveningFloss";

  (record as any)[key] = verification;
  await saveDailyRecord(record);
  return record;
}

// --- Settings ---

export async function getSettings(): Promise<UserSettings> {
  const data = await AsyncStorage.getItem(KEYS.SETTINGS);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Streak & Stats ---

export async function getStreakInfo(): Promise<StreakInfo> {
  const records = await getAllRecords();
  const dates = Object.keys(records).sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let totalDaysCompleted = 0;
  let totalBrushSessions = 0;
  let totalFlossSessions = 0;

  // Calculate current streak
  for (let i = 0; i < 366; i++) {
    const date = getDaysAgo(i);
    const record = records[date];

    if (record) {
      const hasMorningBrush = record.morningBrush?.verified || false;
      const hasEveningBrush = record.eveningBrush?.verified || false;
      const hasMorningFloss = record.morningFloss?.verified || false;
      const hasEveningFloss = record.eveningFloss?.verified || false;

      if (hasMorningBrush) totalBrushSessions++;
      if (hasEveningBrush) totalBrushSessions++;
      if (hasMorningFloss) totalFlossSessions++;
      if (hasEveningFloss) totalFlossSessions++;

      const dayComplete =
        (hasMorningBrush || hasEveningBrush) &&
        (hasMorningFloss || hasEveningFloss);

      if (dayComplete) totalDaysCompleted++;

      if (i === 0) {
        // Today
        if (hasMorningBrush || hasEveningBrush) {
          currentStreak = 1;
        }
      } else {
        if (dayComplete) {
          if (currentStreak > 0 || i === 1) currentStreak++;
        } else if (currentStreak > 0) {
          break;
        }
      }
    } else if (i > 0 && currentStreak > 0) {
      break;
    }
  }

  // Calculate longest streak from all records
  const sortedDates = Object.keys(records).sort();
  for (const date of sortedDates) {
    const record = records[date];
    const hasBrush =
      record.morningBrush?.verified || record.eveningBrush?.verified;
    const hasFloss =
      record.morningFloss?.verified || record.eveningFloss?.verified;

    if (hasBrush && hasFloss) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalDaysCompleted,
    totalBrushSessions,
    totalFlossSessions,
  };
}

// --- Achievements ---

export async function getUnlockedAchievements(): Promise<Achievement[]> {
  const data = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
  return data ? JSON.parse(data) : [];
}

export async function checkAndUnlockAchievements(): Promise<Achievement[]> {
  const streakInfo = await getStreakInfo();
  const unlocked = await getUnlockedAchievements();
  const unlockedIds = new Set(unlocked.map((a) => a.id));
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.has(achievement.id)) continue;

    let qualifies = false;
    switch (achievement.type) {
      case "streak":
        qualifies = streakInfo.longestStreak >= achievement.requirement;
        break;
      case "total_brush":
        qualifies = streakInfo.totalBrushSessions >= achievement.requirement;
        break;
      case "total_floss":
        qualifies = streakInfo.totalFlossSessions >= achievement.requirement;
        break;
      case "total_days":
        qualifies = streakInfo.totalDaysCompleted >= achievement.requirement;
        break;
    }

    if (qualifies) {
      const unlockedAchievement = {
        ...achievement,
        unlockedAt: new Date().toISOString(),
      };
      newlyUnlocked.push(unlockedAchievement);
      unlocked.push(unlockedAchievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    await AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
  }

  return newlyUnlocked;
}

// --- Data Management ---

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.RECORDS,
    KEYS.SETTINGS,
    KEYS.ACHIEVEMENTS,
  ]);
}

export async function exportData(): Promise<string> {
  const records = await getAllRecords();
  const settings = await getSettings();
  const achievements = await getUnlockedAchievements();
  return JSON.stringify({ records, settings, achievements }, null, 2);
}
