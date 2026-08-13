'use client';
import Image from 'next/image';

interface Props {
  size?: number;
  className?: string;
  priority?: boolean;
  variant?: 'icon' | 'full';
}

const FULL_RATIO = 682 / 1024;

// Shared brand mark: square icon in chrome, full wordmark on login.
export function BrandMark({ size = 44, className = '', priority = false, variant = 'icon' }: Props) {
  if (variant === 'full') {
    const width = size;
    const height = Math.round(size * FULL_RATIO);
    return (
      <span
        className={`relative inline-grid place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,42,68,0.16)] ${className}`}
        style={{ width, height }}
      >
        <Image
          src="/brand/mark.png"
          alt="אמי״ר"
          width={width}
          height={height}
          priority={priority}
          className="object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-grid place-items-center overflow-hidden rounded-xl bg-white shadow-[0_6px_16px_rgba(15,42,68,0.16)] ring-1 ring-slate-200/80 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/mark-icon.png"
        alt="אמי״ר"
        width={size}
        height={size}
        priority={priority}
        className="object-contain p-[6%]"
      />
    </span>
  );
}
