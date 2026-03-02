import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getSettings } from "./storageService";
import { parseTime } from "../utils/dateUtils";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("brushing-reminders", {
      name: "Brushing Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  return true;
}

export async function scheduleReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await getSettings();
  if (!settings.notificationsEnabled) return;

  const morning = parseTime(settings.morningTime);
  const evening = parseTime(settings.eveningTime);

  // Morning reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to brush! 🪥",
      body: "Good morning! Don't forget to brush and floss.",
      data: { timeOfDay: "morning" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morning.hours,
      minute: morning.minutes,
    },
  });

  // Evening reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Bedtime brush! 🌙",
      body: "Don't go to bed without brushing and flossing!",
      data: { timeOfDay: "evening" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: evening.hours,
      minute: evening.minutes,
    },
  });
}

export async function sendPersistentReminder(
  timeOfDay: "morning" | "evening"
): Promise<void> {
  const settings = await getSettings();

  await Notifications.scheduleNotificationAsync({
    content: {
      title:
        timeOfDay === "morning"
          ? "Still waiting... 🪥"
          : "You haven't brushed yet! 🦷",
      body: "You won't stop getting these until you brush AND floss. Open the app to verify!",
      data: { timeOfDay, persistent: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: settings.reminderIntervalMinutes * 60,
      repeats: false,
    },
  });
}

export async function clearReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
