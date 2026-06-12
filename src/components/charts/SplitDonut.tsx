import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useSettings } from "@/hooks/useSettings";

/**
 * Generic two-or-more slice donut (e.g. EMI vs Non-EMI). Purely presentational —
 * callers pass already-derived slice values. Optional `centerLabel` is rendered
 * over the donut hole.
 */
export function SplitDonut({
  slices,
  centerLabel,
}: {
  slices: { name: string; value: number; color: string }[];
  centerLabel?: string;
}) {
  const { money } = useSettings();
  const data = slices.filter((s) => s.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  }

  return (
    <div className="relative">
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
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}
