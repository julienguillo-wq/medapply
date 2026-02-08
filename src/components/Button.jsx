export default function Button({ children, variant = 'primary', size = 'medium', icon, onClick, disabled, fullWidth, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2.5 font-semibold transition-all duration-200';

  const variants = {
    primary: 'bg-primary hover:bg-primary-light text-white shadow-[0_4px_14px_rgba(0,102,255,0.25)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.35)]',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  };

  const sizes = {
    small: 'px-4 py-2.5 text-[13px] rounded-[10px] min-h-[44px]',
    medium: 'px-5 md:px-6 py-3 md:py-3.5 text-sm rounded-xl min-h-[44px]',
    large: 'px-7 md:px-8 py-4 md:py-[18px] text-[15px] rounded-[14px] min-h-[48px]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
