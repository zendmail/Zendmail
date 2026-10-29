/** Global shopping occasions (no single culture or region is assumed), so Autopilot can time seasonal campaigns. */

export type Occasion = { key: "black-friday" | "holiday-gifts" | "new-year" | "summer-sale"; label: string; date: Date; templateKeys: string[] };

/** Friday after the fourth Thursday of November. */
export function blackFriday(year: number): Date {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const firstThursday = 1 + ((4 - nov1.getUTCDay() + 7) % 7);
  return new Date(Date.UTC(year, 10, firstThursday + 21 + 1));
}

const DAY = 86_400_000;

/** The next occasion starting within `windowDays` (default 45), or null. */
export function upcomingOccasion(now: Date, windowDays = 45): Occasion | null {
  const y = now.getUTCFullYear();
  const candidates: Occasion[] = [];
  for (const year of [y, y + 1]) {
    candidates.push(
      { key: "black-friday", label: "Black Friday", date: blackFriday(year), templateKeys: ["pro-black-friday-countdown", "seasonal-black-friday"] },
      { key: "holiday-gifts", label: "Holiday gift season", date: new Date(Date.UTC(year, 11, 1)), templateKeys: ["pro-celebration-gifting", "seasonal-holiday-gifts"] },
      { key: "new-year", label: "New Year", date: new Date(Date.UTC(year, 11, 28)), templateKeys: ["seasonal-new-year"] },
      { key: "summer-sale", label: "Summer sale", date: new Date(Date.UTC(year, 5, 15)), templateKeys: ["pro-mega-sale-flash", "seasonal-summer-sale"] },
    );
  }
  return (
    candidates
      .filter((o) => o.date.getTime() >= now.getTime() - DAY && o.date.getTime() - now.getTime() <= windowDays * DAY)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null
  );
}
