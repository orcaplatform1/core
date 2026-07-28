// Haftalık reset noktası Pazartesi 00:00 (points/leaderboard/weekly-challenge cron'larıyla aynı gün).
export function getMondayWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}
