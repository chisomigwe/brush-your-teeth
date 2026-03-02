import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import {
  getTodayRecord,
  getStreakInfo,
  checkAndUnlockAchievements,
} from "../../src/services/storageService";
import { DailyRecord, StreakInfo, RoutineStepType, TimeOfDay } from "../../src/types";
import { getTimeOfDay } from "../../src/utils/dateUtils";
import {
  FULL_ROUTINE_STEPS,
  STEP_TYPE_METADATA,
} from "../../src/constants/routines";

function getStepStatus(
  record: DailyRecord | null,
  timeSlot: TimeOfDay,
  stepType: RoutineStepType
): boolean {
  if (!record) return false;

  // Check V2 sessions first
  if (record.sessions) {
    const session = record.sessions.find((s) => s.timeSlot === timeSlot);
    if (session) {
      return session.steps.some(
        (s) => s.stepType === stepType && s.verified
      );
    }
  }

  // Fall back to legacy fields
  if (stepType === "brush") {
    return timeSlot === "morning"
      ? record.morningBrush?.verified || false
      : record.eveningBrush?.verified || false;
  }
  if (stepType === "floss") {
    return timeSlot === "morning"
      ? record.morningFloss?.verified || false
      : record.eveningFloss?.verified || false;
  }
  return false;
}

export default function HomeScreen() {
  const router = useRouter();
  const [record, setRecord] = useState<DailyRecord | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timeOfDay = getTimeOfDay();

  const loadData = useCallback(async () => {
    const [todayRecord, streak] = await Promise.all([
      getTodayRecord(),
      getStreakInfo(),
    ]);
    setRecord(todayRecord);
    setStreakInfo(streak);
    await checkAndUnlockAchievements();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const morningComplete = FULL_ROUTINE_STEPS.every(
    (step) => getStepStatus(record, "morning", step.type)
  );
  const eveningComplete = FULL_ROUTINE_STEPS.every(
    (step) => getStepStatus(record, "evening", step.type)
  );
  const allDone = morningComplete && eveningComplete;

  const currentSessionComplete =
    timeOfDay === "morning" ? morningComplete : eveningComplete;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FAFFFE" }}
      contentContainerStyle={{ padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Streak Display */}
      <View
        style={{
          alignItems: "center",
          marginBottom: 32,
          paddingTop: 20,
        }}
      >
        <Text style={{ fontSize: 64, fontWeight: "800", color: "#0F172A" }}>
          {streakInfo?.currentStreak || 0}
        </Text>
        <Text style={{ fontSize: 16, color: "#64748B", fontWeight: "600" }}>
          day streak
        </Text>
        {(streakInfo?.longestStreak || 0) > 0 && (
          <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
            Best: {streakInfo?.longestStreak} days
          </Text>
        )}
      </View>

      {/* Today's Status */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16,
        }}
      >
        Today's Progress
      </Text>

      {/* Morning Section */}
      <View
        style={{
          backgroundColor: morningComplete ? "#D1FAE5" : "#F1F5F9",
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 12,
          }}
        >
          Morning {morningComplete ? "✅" : ""}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {FULL_ROUTINE_STEPS.map((step) => (
            <StatusPill
              key={`morning_${step.type}`}
              label={step.label}
              done={getStepStatus(record, "morning", step.type)}
              icon={STEP_TYPE_METADATA[step.type].icon}
            />
          ))}
        </View>
      </View>

      {/* Evening Section */}
      <View
        style={{
          backgroundColor: eveningComplete ? "#D1FAE5" : "#F1F5F9",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: "#0F172A",
            marginBottom: 12,
          }}
        >
          Evening {eveningComplete ? "✅" : ""}
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {FULL_ROUTINE_STEPS.map((step) => (
            <StatusPill
              key={`evening_${step.type}`}
              label={step.label}
              done={getStepStatus(record, "evening", step.type)}
              icon={STEP_TYPE_METADATA[step.type].icon}
            />
          ))}
        </View>
      </View>

      {/* Verify Button */}
      {!currentSessionComplete && (
        <TouchableOpacity
          onPress={() => router.push("/verify")}
          style={{
            backgroundColor: "#34D399",
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: "center",
            shadowColor: "#34D399",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
            Verify {timeOfDay === "morning" ? "Morning" : "Evening"} Routine
          </Text>
        </TouchableOpacity>
      )}

      {allDone && (
        <View
          style={{
            alignItems: "center",
            padding: 24,
            backgroundColor: "#D1FAE5",
            borderRadius: 16,
          }}
        >
          <Text style={{ fontSize: 48 }}>🎉</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#059669",
              marginTop: 8,
            }}
          >
            All done for today!
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#64748B",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            Your teeth thank you. See you tomorrow!
          </Text>
        </View>
      )}

      {/* Quick Stats */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-around",
          marginTop: 24,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          gap: 12,
        }}
      >
        <StatBox
          label="Total Days"
          value={streakInfo?.totalDaysCompleted || 0}
        />
        <StatBox
          label="Brush"
          value={streakInfo?.totalBrushSessions || 0}
        />
        <StatBox
          label="Floss"
          value={streakInfo?.totalFlossSessions || 0}
        />
        <StatBox
          label="Tongue"
          value={streakInfo?.totalTongueScrapes || 0}
        />
        <StatBox
          label="Mouthwash"
          value={streakInfo?.totalMouthwashSessions || 0}
        />
      </View>
    </ScrollView>
  );
}

function StatusPill({
  label,
  done,
  icon,
}: {
  label: string;
  done: boolean;
  icon: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: done ? "#34D399" : "#CBD5E1",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        minWidth: "45%",
        justifyContent: "center",
        flexGrow: 1,
        flexBasis: "45%",
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text>
      <Text
        style={{
          color: done ? "#FFFFFF" : "#475569",
          fontWeight: "600",
          fontSize: 13,
        }}
      >
        {label} {done ? "✓" : ""}
      </Text>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "center", minWidth: 60 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#0F172A" }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: "#94A3B8" }}>{label}</Text>
    </View>
  );
}
