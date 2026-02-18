export default function ProgressTracker({ value = 0, label, color = 'install' }) {
  const colorMap = {
    install: { bar: 'bg-install', bg: 'bg-install-bg', text: 'text-install' },
    primary: { bar: 'bg-primary', bg: 'bg-primary-bg', text: 'text-primary' },
    success: { bar: 'bg-success', bg: 'bg-success-bg', text: 'text-success' },
  };
  const c = colorMap[color] || colorMap.install;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {label && <span className="text-sm font-medium text-gray-600">{label}</span>}
        <span className={`text-sm font-bold ${c.text}`}>{value}%</span>
      </div>
      <div className={`h-2 ${c.bg} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${c.bar} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
