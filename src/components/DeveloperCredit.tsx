'use client';
import Image from 'next/image';

interface Props {
  tone?: 'dark' | 'light';
  className?: string;
}

// Developer credit for תחום ניהו״ג under Military Rabbinate HQ.
export function DeveloperCredit({ tone = 'dark', className = '' }: Props) {
  const muted = tone === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const strong = tone === 'dark' ? 'text-slate-200' : 'text-slate-700';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/nihoag.png"
        alt="תחום ניהו״ג"
        width={36}
        height={36}
        className="rounded-full bg-white shrink-0 shadow-sm"
      />
      <div className={`min-w-0 leading-snug text-[11px] ${muted}`}>
        <div className={`font-semibold ${strong}`}>פותח ע״י תחום ניהו״ג</div>
        <div className="opacity-80 truncate">מטה הרבנות הצבאית</div>
      </div>
    </div>
  );
}
