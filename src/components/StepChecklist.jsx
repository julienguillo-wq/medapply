import { Icon } from './Icons';

export default function StepChecklist({ items, onToggle, onDateChange, onNotesChange }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={item.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
          <button
            onClick={() => onToggle(item.id || i)}
            className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${
              item.checked
                ? 'bg-install border-install text-white'
                : 'border-gray-300 hover:border-install'
            }`}
          >
            {item.checked && <Icon.Check size={12} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {item.label}
            </div>
            {item.description && (
              <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
            )}
            {item.showDate && (
              <input
                type="date"
                value={item.date || ''}
                onChange={(e) => onDateChange?.(item.id || i, e.target.value)}
                className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-install focus:outline-none transition-colors"
              />
            )}
            {item.showNotes && (
              <input
                type="text"
                placeholder="Notes..."
                value={item.notes || ''}
                onChange={(e) => onNotesChange?.(item.id || i, e.target.value)}
                className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-install focus:outline-none transition-colors"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
