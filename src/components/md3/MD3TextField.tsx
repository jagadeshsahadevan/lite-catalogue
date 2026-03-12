import { useState, useId } from 'react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  error?: string;
  className?: string;
}

export function MD3TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  leadingIcon,
  error,
  className = '',
}: Props) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const hasValue = value.length > 0;
  const isNativePickerType = type === 'date' || type === 'time' || type === 'datetime-local';
  const floated = focused || hasValue || isNativePickerType;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          relative flex items-center rounded-[var(--md-shape-xs)]
          border transition-colors duration-150
          ${error
            ? 'border-error'
            : focused
              ? 'border-primary border-2'
              : 'border-outline'
          }
          ${disabled ? 'opacity-40' : ''}
        `}
      >
        {leadingIcon && (
          <span className="pl-3 text-on-surface-variant flex-shrink-0">{leadingIcon}</span>
        )}
        <div className="relative flex-1">
          <label
            htmlFor={id}
            className={`
              absolute left-3 transition-all duration-150 pointer-events-none
              ${floated
                ? '-top-2.5 text-xs px-1 bg-surface'
                : 'top-1/2 -translate-y-1/2 text-base'
              }
              ${error ? 'text-error' : focused ? 'text-primary' : 'text-on-surface-variant'}
            `}
          >
            {label}
          </label>
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? placeholder : ''}
            disabled={disabled}
            className="w-full px-3 py-4 bg-transparent text-on-surface text-base outline-none"
          />
        </div>
      </div>
      {error && (
        <p className="mt-1 ml-3 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
