import { getScoreTier } from '../services/compatibilityService';

const colorMap = {
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    ring: 'stroke-emerald-500',
    track: 'stroke-emerald-100',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    ring: 'stroke-blue-500',
    track: 'stroke-blue-100',
  },
  orange: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    ring: 'stroke-amber-500',
    track: 'stroke-amber-100',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-500',
    ring: 'stroke-gray-400',
    track: 'stroke-gray-100',
  },
};

/**
 * CompatibilityBadge
 * - Default: 48x48 ring with "60%" + "Match" label below
 * - inline: colored pill "Match 60%" (for mobile card header)
 */
export default function CompatibilityBadge({ score, inline = false }) {
  if (score === null || score === undefined) return null;

  const { label, color } = getScoreTier(score);
  const c = colorMap[color];

  // Inline pill mode for mobile
  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${c.bg} ${c.border} border rounded-full px-2.5 py-1 ${c.text}`}
        title={label}
      >
        <span className="text-[11px] font-semibold">Match {score}%</span>
      </span>
    );
  }

  // Ring badge (desktop column)
  const size = 48;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center" title={label}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className={c.track}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={c.ring}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-bold ${c.text}`}
          style={{ fontSize: 12 }}
        >
          {score}%
        </span>
      </div>
      <span className={`text-[10px] font-medium ${c.text} mt-0.5`}>Match</span>
    </div>
  );
}
