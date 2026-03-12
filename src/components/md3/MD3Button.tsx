import type { ReactNode } from 'react';

interface Props {
  variant?: 'filled' | 'outlined' | 'tonal' | 'text';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
}

const variants = {
  filled: 'bg-primary text-on-primary active:brightness-90',
  outlined: 'border border-outline text-primary active:bg-primary/8',
  tonal: 'bg-secondary-container text-on-secondary-container active:brightness-95',
  text: 'text-primary active:bg-primary/8',
};

export function MD3Button({
  variant = 'filled',
  children,
  onClick,
  disabled = false,
  icon,
  className = '',
  type = 'button',
  fullWidth = false,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        h-10 px-6 rounded-full
        text-sm font-medium tracking-wide
        transition-all duration-150
        disabled:opacity-40 disabled:pointer-events-none
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
