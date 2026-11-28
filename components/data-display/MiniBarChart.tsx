export default function MiniBarChart({
  values,
  width = 76,
  height = 28,
  color = "#2563eb",
  ariaLabel,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const gap = 3;
  const barW = Math.max(3, Math.floor((width - gap * (values.length - 1)) / values.length));
  const totalW = barW * values.length + gap * (values.length - 1);
  const startX = Math.max(0, (width - totalW) / 2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="block"
    >
      <title>{ariaLabel}</title>
      {values.map((v, i) => {
        const barH = Math.max(3, Math.round((Math.max(0, v) / max) * (height - 4)));
        const x = startX + i * (barW + gap);
        const y = height - barH - 1;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={1.5}
            fill={color}
            fillOpacity={i === values.length - 1 ? 0.95 : 0.45}
          />
        );
      })}
    </svg>
  );
}
