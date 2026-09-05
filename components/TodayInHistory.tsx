import { moments } from "@/data/moments";
import { timeline } from "@/data/timeline";

function monthDay(date: string) { return date.slice(5, 10); }

export function TodayInHistory() {
  const today = new Date();
  const key = `${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  const exactTimeline = timeline.find(item => monthDay(item.date) === key);
  const exactMoment = moments.find(item => monthDay(item.date) === key);
  const item = exactTimeline ?? exactMoment;

  if (!item) {
    const sorted = [...timeline].sort((a, b) => monthDay(a.date).localeCompare(monthDay(b.date)));
    const next = sorted.find(event => monthDay(event.date) >= key) ?? sorted[0];
    return (
      <div className="history-today-card">
        <span className="eyebrow">Next date in the Vault</span>
        <strong>{next.date.slice(5)}</strong>
        <h3>{next.title}</h3>
        <p>{next.summary}</p>
      </div>
    );
  }

  const summary = "summary" in item ? item.summary : "";
  return (
    <div className="history-today-card">
      <span className="eyebrow">Today in Raiders history</span>
      <strong>{"year" in item ? item.year : item.date.slice(0, 4)}</strong>
      <h3>{item.title}</h3>
      <p>{summary}</p>
    </div>
  );
}
