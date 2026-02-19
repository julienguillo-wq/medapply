export default function FormField({ label, error, hint, children, required }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', error, className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors outline-none ${
        error
          ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-200'
          : 'border-gray-200 focus:border-install focus:ring-1 focus:ring-install/20'
      } ${className}`}
    />
  );
}

export function Select({ value, onChange, options, placeholder, error, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors outline-none appearance-none bg-white ${
        error
          ? 'border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-200'
          : 'border-gray-200 focus:border-install focus:ring-1 focus:ring-install/20'
      } ${!value ? 'text-gray-400' : 'text-gray-900'} ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        if (opt === '---') return <option key="sep" disabled>──────────</option>;
        const val = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : opt;
        return <option key={val} value={val}>{label}</option>;
      })}
    </select>
  );
}
