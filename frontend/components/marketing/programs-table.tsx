import { cn } from "@/lib/utils";
import type { ProgramsTableRowData } from "@/lib/marketing/site-content-types";

const LEVEL_COLOR_BY_EMOJI: Record<string, string> = {
  "🟢": "bg-success/12 text-success",
  "🔵": "bg-primary/12 text-primary",
  "🟣": "bg-purple/12 text-purple",
  "🟠": "bg-warning/12 text-warning",
  "⭐": "bg-[#D9A441]/12 text-[#D9A441]",
};

function levelColorClass(level: string) {
  const emoji = level.trim().slice(0, 2).trim();
  return LEVEL_COLOR_BY_EMOJI[emoji] ?? "bg-secondary text-muted-foreground";
}

export function ProgramsTable({
  title,
  items,
}: {
  title: string;
  items: ProgramsTableRowData[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-black/10 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Seviye</th>
                <th className="px-5 py-3 font-medium">Program</th>
                <th className="px-5 py-3 font-medium">Süre</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={`${item.title}-${i}`}
                  className={cn("border-b border-border last:border-b-0", "hover:bg-black/5")}
                >
                  <td className="px-5 py-3.5 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                        levelColorClass(item.level)
                      )}
                    >
                      {item.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 align-middle font-medium text-foreground">{item.title}</td>
                  <td className="px-5 py-3.5 align-middle text-muted-foreground whitespace-nowrap">{item.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
