export default function Badge({ children, variant = 'default', icon }) {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-success-bg text-emerald-700',
    warning: 'bg-warning-bg text-amber-700',
    error: 'bg-error-bg text-red-700',
    primary: 'bg-primary-bg text-primary',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold ${variants[variant]}`}>
      {icon}
      {children}
    </span>
  );
}
