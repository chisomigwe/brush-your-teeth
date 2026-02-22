import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  getSettings,
  saveSettings,
  clearAllData,
  exportData,
} from "../../src/services/storageService";
import { scheduleReminders } from "../../src/services/notificationService";
import { UserSettings } from "../../src/types";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      getSettings().then(setSettings);
    }, [])
  );

  const updateSetting = async (updates: Partial<UserSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveSettings(newSettings);
    await scheduleReminders();
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your records, streaks, and achievements. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            setSettings(null);
            getSettings().then(setSettings);
            Alert.alert("Done", "All data has been cleared.");
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    const data = await exportData();
    Alert.alert("Data Exported", `${data.length} characters of data exported to clipboard.`);
  };

  if (!settings) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#FAFFFE" }}
      contentContainerStyle={{ padding: 20 }}
    >
      {/* Schedule */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16,
        }}
      >
        Schedule
      </Text>

      <View
        style={{
          backgroundColor: "#F1F5F9",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 15, color: "#0F172A", fontWeight: "600" }}>
            Morning Time
          </Text>
          <TextInput
            value={settings.morningTime}
            onChangeText={(text) => updateSetting({ morningTime: text })}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 16,
              fontWeight: "600",
              color: "#0F172A",
              textAlign: "center",
              width: 80,
            }}
            placeholder="07:00"
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 15, color: "#0F172A", fontWeight: "600" }}>
            Evening Time
          </Text>
          <TextInput
            value={settings.eveningTime}
            onChangeText={(text) => updateSetting({ eveningTime: text })}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 16,
              fontWeight: "600",
              color: "#0F172A",
              textAlign: "center",
              width: 80,
            }}
            placeholder="21:00"
          />
        </View>
      </View>

      {/* Notifications */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16,
        }}
      >
        Notifications
      </Text>

      <View
        style={{
          backgroundColor: "#F1F5F9",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 15, color: "#0F172A", fontWeight: "600" }}>
            Enable Reminders
          </Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) =>
              updateSetting({ notificationsEnabled: value })
            }
            trackColor={{ false: "#CBD5E1", true: "#A7F3D0" }}
            thumbColor={settings.notificationsEnabled ? "#34D399" : "#94A3B8"}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 15, color: "#0F172A", fontWeight: "600" }}>
            Remind every (min)
          </Text>
          <TextInput
            value={String(settings.reminderIntervalMinutes)}
            onChangeText={(text) => {
              const num = parseInt(text) || 15;
              updateSetting({ reminderIntervalMinutes: Math.max(5, num) });
            }}
            keyboardType="number-pad"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 16,
              fontWeight: "600",
              color: "#0F172A",
              textAlign: "center",
              width: 60,
            }}
          />
        </View>
      </View>

      {/* Data */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16,
        }}
      >
        Data
      </Text>

      <View style={{ gap: 8, marginBottom: 40 }}>
        <TouchableOpacity
          onPress={handleExport}
          style={{
            backgroundColor: "#F1F5F9",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 15, color: "#0F172A", fontWeight: "600" }}>
            Export Data
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleClearData}
          style={{
            backgroundColor: "#FEE2E2",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 15, color: "#E11D48", fontWeight: "600" }}>
            Clear All Data
          </Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={{ alignItems: "center", paddingBottom: 40 }}>
        <Text style={{ fontSize: 13, color: "#94A3B8" }}>
          Brush Your Teeth v1.0.0
        </Text>
        <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>
          By Igwe Studios
        </Text>
      </View>
    </ScrollView>
  );
}
