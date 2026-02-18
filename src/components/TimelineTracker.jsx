import { Icon } from './Icons';

export default function TimelineTracker({ steps, onToggle, onDateChange, onNotesChange }) {
  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="flex flex-col gap-6">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.id || i} className="relative">
              {/* Dot */}
              <div className={`absolute -left-8 top-1 w-[30px] h-[30px] rounded-full flex items-center justify-center z-10 ${
                step.done
                  ? step.result === 'refused' ? 'bg-error text-white' : 'bg-install text-white'
                  : step.active ? 'bg-install-bg text-install border-2 border-install' : 'bg-gray-100 text-gray-400'
              }`}>
                {step.done ? (
                  step.result === 'refused' ? <Icon.X size={14} /> : <Icon.Check size={14} />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>

              <div className={`pb-${isLast ? '0' : '0'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${step.done ? 'text-gray-800' : step.active ? 'text-install' : 'text-gray-400'}`}>
                    {step.emoji} {step.label}
                  </span>
                  {step.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      step.done ? 'bg-install-bg text-install' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {step.badge}
                    </span>
                  )}
                </div>
                {step.hint && <div className="text-xs text-gray-400 mb-2">{step.hint}</div>}

                {(step.active || step.done) && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <button
                      onClick={() => onToggle(step.id || i)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        step.done
                          ? 'bg-install-bg text-install hover:bg-install-bg/80'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {step.done ? 'Complété' : 'Marquer comme fait'}
                    </button>
                    <input
                      type="date"
                      value={step.date || ''}
                      onChange={(e) => onDateChange?.(step.id || i, e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-install focus:outline-none transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Notes..."
                      value={step.notes || ''}
                      onChange={(e) => onNotesChange?.(step.id || i, e.target.value)}
                      className="flex-1 min-w-[120px] px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-install focus:outline-none transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
