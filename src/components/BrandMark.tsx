'use client';
import Image from 'next/image';

interface Props {
  size?: number;
  className?: string;
  priority?: boolean;
}

// Shared light brand emblem (scroll + inventory) used on login and shell.
export function BrandMark({ size = 44, className = '', priority = false }: Props) {
  return (
    <span
      className={`relative inline-grid place-items-center overflow-hidden rounded-xl shadow-[0_6px_16px_rgba(23,58,94,0.18)] ring-1 ring-[#173a5e]/15 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/mark.png"
        alt="אמי״ר"
        width={size}
        height={size}
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}
