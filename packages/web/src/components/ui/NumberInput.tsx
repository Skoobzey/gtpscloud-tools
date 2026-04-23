'use client';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function NumberInput({ className = '', ...props }: Props) {
  return (
    <input
      type="number"
      {...props}
      className={`
        w-full bg-[#0f1a15] border border-[#274137] rounded-xl px-3 py-2 text-sm text-[#e8fff5]
        placeholder:text-[#7a998b] focus:outline-none focus:border-[#4ade80] focus:ring-2 focus:ring-[#34d399]/20 transition-colors
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${className}
      `}
    />
  );
}
