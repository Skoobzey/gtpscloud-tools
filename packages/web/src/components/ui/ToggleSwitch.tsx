'use client';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  onLabel?: string;
  offLabel?: string;
  showStateLabel?: boolean;
  disabled?: boolean;
  className?: string;
};

export function ToggleSwitch({ checked, onChange, label, onLabel = 'Enabled', offLabel = 'Disabled', showStateLabel = true, disabled = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        aria-label={label ?? 'Toggle'}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[#34d399]/30 disabled:opacity-60 disabled:cursor-not-allowed ${checked ? 'bg-[#1a3a2e] border-[#2e6a53]' : 'bg-[#111c17] border-[#29453a]'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${checked ? 'translate-x-6 bg-[#4ade80]' : 'translate-x-1 bg-[#7f9f92]'}`}
        />
      </button>
      {showStateLabel && (
        <span className={`text-xs font-medium ${checked ? 'text-[#8ff2c5]' : 'text-[#8ea79d]'}`}>
          {checked ? onLabel : offLabel}
        </span>
      )}
    </div>
  );
}
