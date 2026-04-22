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
        w-full bg-[#0a0a0a] border border-[#27272a] rounded-lg px-3 py-2 text-sm text-white
        focus:outline-none focus:border-[#22c55e] transition-colors
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${className}
      `}
    />
  );
}
