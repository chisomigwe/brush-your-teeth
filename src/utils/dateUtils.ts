export function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

export function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(getDaysAgo(i));
  }
  return days;
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

export function getTimeOfDay(): "morning" | "evening" {
  const hour = new Date().getHours();
  return hour < 14 ? "morning" : "evening";
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

export function calculateStreak(
  records: Record<string, { morningComplete: boolean; eveningComplete: boolean }>
): number {
  let streak = 0;
  const today = getToday();

  for (let i = 0; i < 366; i++) {
    const date = getDaysAgo(i);
    const record = records[date];

    if (i === 0 && date === today) {
      // Today: count as part of streak if any verification done
      if (record && (record.morningComplete || record.eveningComplete)) {
        streak++;
      } else {
        // Today not yet complete, check yesterday
        continue;
      }
    } else {
      // Past days: must have both morning and evening
      if (record && record.morningComplete && record.eveningComplete) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
}
