interface Props {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function MD3Chip({ label, selected = false, onClick, icon, className = '' }: Props) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 h-8 px-3
        rounded-[var(--md-shape-sm)] text-sm font-medium
        transition-all duration-150
        ${selected
          ? 'bg-secondary-container text-on-secondary-container'
          : 'border border-outline text-on-surface-variant bg-transparent'
        }
        active:brightness-95
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0 -ml-0.5">{icon}</span>}
      {label}
    </button>
  );
}
