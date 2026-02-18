import Badge from './Badge';

const STATUS_CONFIG = {
  suggested: { label: 'Suggéré', variant: 'warning', color: 'bg-amber-400' },
  validated: { label: 'Vérifié', variant: 'success', color: 'bg-emerald-400' },
  invalid: { label: 'Invalide', variant: 'error', color: 'bg-red-400' },
  manually_verified: { label: 'Confirmé', variant: 'info', color: 'bg-blue-400' },
};

export default function EmailStatusBadge({ status, compact = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.suggested;

  if (compact) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full shrink-0 ${config.color}`}
        title={config.label}
      />
    );
  }

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
