import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
} from 'recharts';

/** Knowledge mastery radar (input values 0..1, rendered as percentages). */
const RadarChart = ({
  data,
  size = 300,
}: {
  data: { label: string; value: number }[];
  size?: number;
}) => {
  if (data.length < 3) return null;
  const rows = data.map((d) => ({
    label: d.label,
    value: Math.round(d.value * 100),
  }));
  return (
    <div
      role="img"
      aria-label="Knowledge mastery radar chart"
      style={{ width: '100%', maxWidth: size * 1.4, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar data={rows} outerRadius="68%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="hsl(var(--brand))"
            fill="hsl(var(--primary))"
            fillOpacity={0.55}
            strokeWidth={2}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChart;
