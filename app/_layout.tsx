import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import {
  requestPermissions,
  scheduleReminders,
} from "../src/services/notificationService";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      const granted = await requestPermissions();
      if (granted) {
        await scheduleReminders();
      }
    })();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FAFFFE" },
          headerTintColor: "#0F172A",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#FAFFFE" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="verify"
          options={{
            title: "Verify",
            presentation: "fullScreenModal",
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
