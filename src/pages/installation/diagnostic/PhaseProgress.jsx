import { PHASE_NAMES } from './constants';

export default function PhaseProgress({ phase, totalPhases = 4 }) {
  const phaseNum = typeof phase === 'number' ? phase : totalPhases;
  const label = typeof phase === 'number' ? PHASE_NAMES[phase - 1] : 'Récapitulatif';

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {Array.from({ length: totalPhases }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < phaseNum - 1 ? 'bg-install' : i === phaseNum - 1 ? 'bg-install-light' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          {typeof phase === 'number' ? `Étape ${phase}/4` : 'Récapitulatif'} — {label}
        </span>
      </div>
    </div>
  );
}
