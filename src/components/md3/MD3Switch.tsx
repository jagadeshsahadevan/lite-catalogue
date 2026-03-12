interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function MD3Switch({ checked, onChange, disabled = false }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex items-center w-[52px] h-[32px] rounded-full
        transition-colors duration-200 flex-shrink-0
        ${checked ? 'bg-primary' : 'bg-surface-variant'}
        ${checked ? '' : 'border-2 border-outline'}
        ${disabled ? 'opacity-40' : ''}
      `}
    >
      <span
        className={`
          absolute rounded-full bg-white shadow-md transition-all duration-200
          ${checked
            ? 'w-[24px] h-[24px] left-[24px]'
            : 'w-[16px] h-[16px] left-[6px]'
          }
        `}
        style={!checked ? { backgroundColor: 'var(--md-outline)' } : undefined}
      />
    </button>
  );
}
