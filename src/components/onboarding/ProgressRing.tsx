import { type FC } from 'react';

interface ProgressRingProps {
  completed: number;
  total: number;
  size?: number;
}

const ProgressRing: FC<ProgressRingProps> = ({ completed, total, size = 56 }) => {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(1, Math.max(0, completed / total)) : 0;
  const offset = circumference * (1 - pct);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${completed} de ${total} passos concluídos`}
      className="shrink-0"
    >
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--border)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--brand)" strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 600ms ease' }}
      />
      <text
        x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        className="fill-fg-token text-xs font-semibold"
      >
        {completed}/{total}
      </text>
    </svg>
  );
};

export default ProgressRing;
