import { Icon } from './Icons';

export default function TipCard({ children, variant = 'info' }) {
  const styles = {
    info: { bg: 'bg-install-bg/50', border: 'border-install/20', icon: 'text-install', IconComp: Icon.Info },
    warning: { bg: 'bg-warning-bg/50', border: 'border-warning/20', icon: 'text-warning', IconComp: Icon.AlertTriangle },
    success: { bg: 'bg-success-bg/50', border: 'border-success/20', icon: 'text-success', IconComp: Icon.Check },
  };
  const s = styles[variant] || styles.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${s.bg} ${s.border}`}>
      <div className={`mt-0.5 flex-shrink-0 ${s.icon}`}>
        <s.IconComp size={18} />
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}
