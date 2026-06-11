import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useSettings } from "@/hooks/useSettings";
import type { CategorySummary } from "@/types";

const PALETTE = ["#16a34a", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#ef4444", "#f97316", "#eab308", "#14b8a6", "#64748b"];

export function SpendDonut({ summaries }: { summaries: CategorySummary[] }) {
  const { money } = useSettings();
  const data = summaries
    .filter((s) => s.actual > 0)
    .map((s, i) => ({
      name: s.category.name,
      value: s.actual,
      color: s.category.color ?? PALETTE[i % PALETTE.length],
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No spending yet this month.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [money(Number(value)), String(name)]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
