import type { ReactNode } from 'react';

interface Props {
  variant?: 'filled' | 'elevated' | 'outlined';
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}

const variants = {
  filled: 'bg-surface-container-high',
  elevated: 'bg-surface shadow-md',
  outlined: 'bg-surface border border-outline-variant',
};

export function MD3Card({ variant = 'outlined', children, onClick, className = '', selected }: Props) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`
        rounded-[var(--md-shape-md)] p-4 text-left w-full
        transition-all duration-150
        ${variants[variant]}
        ${onClick ? 'active:brightness-97 cursor-pointer' : ''}
        ${selected ? 'border-2 border-primary bg-primary-container' : ''}
        ${className}
      `}
    >
      {children}
    </Tag>
  );
}
