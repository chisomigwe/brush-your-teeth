import { useEffect, useState, useCallback } from "react";
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
import { DailyRecord, StreakInfo } from "../../src/types";
import { getTimeOfDay } from "../../src/utils/dateUtils";

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

  const morningBrushDone = record?.morningBrush?.verified || false;
  const morningFlossDone = record?.morningFloss?.verified || false;
  const eveningBrushDone = record?.eveningBrush?.verified || false;
  const eveningFlossDone = record?.eveningFloss?.verified || false;

  const morningComplete = morningBrushDone && morningFlossDone;
  const eveningComplete = eveningBrushDone && eveningFlossDone;
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
            justifyContent: "space-between",
          }}
        >
          <StatusPill
            label="Floss"
            done={morningFlossDone}
            icon="🧵"
          />
          <StatusPill
            label="Brush"
            done={morningBrushDone}
            icon="🪥"
          />
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
            justifyContent: "space-between",
          }}
        >
          <StatusPill
            label="Floss"
            done={eveningFlossDone}
            icon="🧵"
          />
          <StatusPill
            label="Brush"
            done={eveningBrushDone}
            icon="🪥"
          />
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
          justifyContent: "space-around",
          marginTop: 24,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        }}
      >
        <StatBox
          label="Total Days"
          value={streakInfo?.totalDaysCompleted || 0}
        />
        <StatBox
          label="Brush Sessions"
          value={streakInfo?.totalBrushSessions || 0}
        />
        <StatBox
          label="Floss Sessions"
          value={streakInfo?.totalFlossSessions || 0}
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        minWidth: 120,
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text>
      <Text
        style={{
          color: done ? "#FFFFFF" : "#475569",
          fontWeight: "600",
          fontSize: 14,
        }}
      >
        {label} {done ? "✓" : ""}
      </Text>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#0F172A" }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: "#94A3B8" }}>{label}</Text>
    </View>
  );
}
