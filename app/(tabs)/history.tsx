import { useCallback, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { getAllRecords } from "../../src/services/storageService";
import { DailyRecord, RoutineStepType, TimeOfDay } from "../../src/types";
import { getLast30Days, formatDate, getToday } from "../../src/utils/dateUtils";
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

export default function HistoryScreen() {
  const [records, setRecords] = useState<Record<string, DailyRecord>>({});

  useFocusEffect(
    useCallback(() => {
      getAllRecords().then(setRecords);
    }, [])
  );

  const last30 = getLast30Days();
  const today = getToday();

  // Weekly summary
  const thisWeekDays = last30.slice(-7);
  const completedThisWeek = thisWeekDays.filter((date) => {
    const r = records[date];
    return (
      r &&
      (r.morningBrush?.verified || r.eveningBrush?.verified) &&
      (r.morningFloss?.verified || r.eveningFloss?.verified)
    );
  }).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FAFFFE" }}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Weekly Summary */}
      <View
        style={{
          backgroundColor: "#F1F5F9",
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
            marginBottom: 8,
          }}
        >
          This Week
        </Text>
        <Text style={{ fontSize: 32, fontWeight: "800", color: "#34D399" }}>
          {completedThisWeek}/7
        </Text>
        <Text style={{ fontSize: 14, color: "#64748B" }}>days completed</Text>
      </View>

      {/* Calendar Grid */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16,
        }}
      >
        Last 30 Days
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "flex-start",
        }}
      >
        {last30.map((date) => {
          const r = records[date];
          const hasBrush =
            r?.morningBrush?.verified || r?.eveningBrush?.verified;
          const hasFloss =
            r?.morningFloss?.verified || r?.eveningFloss?.verified;
          const complete = hasBrush && hasFloss;
          const partial = hasBrush || hasFloss;
          const isToday = date === today;

          let bgColor = "#E2E8F0"; // empty
          if (complete) bgColor = "#34D399"; // complete
          else if (partial) bgColor = "#A7F3D0"; // partial

          return (
            <View
              key={date}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: bgColor,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: isToday ? 2 : 0,
                borderColor: "#0F172A",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: complete ? "#FFFFFF" : "#475569",
                }}
              >
                {new Date(date + "T00:00:00").getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 16,
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        }}
      >
        <LegendDot color="#34D399" label="Complete" />
        <LegendDot color="#A7F3D0" label="Partial" />
        <LegendDot color="#E2E8F0" label="Missed" />
      </View>

      {/* Recent Days Detail */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#0F172A",
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        Recent Days
      </Text>

      {last30
        .slice(-7)
        .reverse()
        .map((date) => {
          const r = records[date] || null;
          return (
            <View
              key={date}
              style={{
                backgroundColor: "#F1F5F9",
                borderRadius: 12,
                padding: 16,
                marginBottom: 8,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#0F172A",
                  flex: 1,
                }}
              >
                {date === today ? "Today" : formatDate(date)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <MiniStatus label="AM" record={r} timeSlot="morning" />
                <MiniStatus label="PM" record={r} timeSlot="evening" />
              </View>
            </View>
          );
        })}
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: 12, color: "#64748B" }}>{label}</Text>
    </View>
  );
}

function MiniStatus({
  label,
  record,
  timeSlot,
}: {
  label: string;
  record: DailyRecord | null;
  timeSlot: TimeOfDay;
}) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 10, color: "#94A3B8", marginBottom: 2 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", gap: 2 }}>
        {FULL_ROUTINE_STEPS.map((step) => (
          <Text key={step.type} style={{ fontSize: 12 }}>
            {getStepStatus(record, timeSlot, step.type)
              ? STEP_TYPE_METADATA[step.type].icon
              : "⬜"}
          </Text>
        ))}
      </View>
    </View>
  );
}
