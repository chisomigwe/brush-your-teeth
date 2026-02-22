import { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { getUnlockedAchievements } from "../../src/services/storageService";
import { ACHIEVEMENTS } from "../../src/constants/achievements";
import { Achievement } from "../../src/types";

export default function AchievementsScreen() {
  const [unlocked, setUnlocked] = useState<Achievement[]>([]);

  useFocusEffect(
    useCallback(() => {
      getUnlockedAchievements().then(setUnlocked);
    }, [])
  );

  const unlockedIds = new Set(unlocked.map((a) => a.id));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FAFFFE" }}
      contentContainerStyle={{ padding: 20 }}
    >
      <Text
        style={{
          fontSize: 14,
          color: "#64748B",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        {unlocked.length} of {ACHIEVEMENTS.length} badges earned
      </Text>

      <View style={{ gap: 12 }}>
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const unlockedData = unlocked.find((a) => a.id === achievement.id);

          return (
            <View
              key={achievement.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isUnlocked ? "#D1FAE5" : "#F1F5F9",
                borderRadius: 16,
                padding: 16,
                opacity: isUnlocked ? 1 : 0.5,
              }}
            >
              <Text style={{ fontSize: 36, marginRight: 16 }}>
                {isUnlocked ? achievement.icon : "🔒"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#0F172A",
                  }}
                >
                  {achievement.title}
                </Text>
                <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  {achievement.description}
                </Text>
                {unlockedData?.unlockedAt && (
                  <Text
                    style={{ fontSize: 11, color: "#34D399", marginTop: 4 }}
                  >
                    Earned{" "}
                    {new Date(unlockedData.unlockedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              {isUnlocked && (
                <Text style={{ fontSize: 24, color: "#34D399" }}>✓</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
