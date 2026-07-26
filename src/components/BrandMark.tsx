'use client';
import Image from 'next/image';

interface Props {
  size?: number;
  className?: string;
  priority?: boolean;
}

// Shared navy-gold brand emblem used on login and shell.
export function BrandMark({ size = 44, className = '', priority = false }: Props) {
  return (
    <span
      className={`relative inline-grid place-items-center overflow-hidden rounded-xl shadow-[0_6px_14px_rgba(212,175,55,0.25)] ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/mark.jpg"
        alt="אמי״ר"
        width={size}
        height={size}
        priority={priority}
        className="object-cover"
      />
    </span>
  );
}
