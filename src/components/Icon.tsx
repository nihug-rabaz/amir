import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps) {
  const { size = 18, ...rest } = props;
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest } as SVGProps<SVGSVGElement>;
}

export const IconHome     = (p: IconProps) => <svg {...base(p)}><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z"/></svg>;
export const IconBuilding = (p: IconProps) => <svg {...base(p)}><path d="M4 22h16M4 2h16v20M9 6h2M9 10h2M9 14h2M13 6h2M13 10h2M13 14h2M9 22v-4h6v4"/></svg>;
export const IconBoxes    = (p: IconProps) => <svg {...base(p)}><path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>;
export const IconAlert    = (p: IconProps) => <svg {...base(p)}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>;
export const IconScale    = (p: IconProps) => <svg {...base(p)}><path d="M12 3v18M7 21h10M3 7l4 10a2 2 0 0 1-4 0L7 7M17 7l4 10a2 2 0 0 1-4 0L21 7"/></svg>;
export const IconUsers    = (p: IconProps) => <svg {...base(p)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
export const IconChart    = (p: IconProps) => <svg {...base(p)}><path d="M3 3v18h18M7 16V9M12 16V5M17 16v-4"/></svg>;
export const IconShield   = (p: IconProps) => <svg {...base(p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>;
export const IconSearch   = (p: IconProps) => <svg {...base(p)}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
export const IconPlus     = (p: IconProps) => <svg {...base(p)}><path d="M12 5v14M5 12h14"/></svg>;
export const IconEdit     = (p: IconProps) => <svg {...base(p)}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>;
export const IconEye      = (p: IconProps) => <svg {...base(p)}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
export const IconDownload = (p: IconProps) => <svg {...base(p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
export const IconBack     = (p: IconProps) => <svg {...base(p)}><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
export const IconCheck    = (p: IconProps) => <svg {...base(p)}><path d="M20 6 9 17l-5-5"/></svg>;
export const IconX        = (p: IconProps) => <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12"/></svg>;
export const IconLogout   = (p: IconProps) => <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
export const IconHistory  = (p: IconProps) => <svg {...base(p)}><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><path d="M12 7v5l4 2"/></svg>;
export const IconBookmark = (p: IconProps) => <svg {...base(p)}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
export const IconCog      = (p: IconProps) => <svg {...base(p)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
export const IconBook     = (p: IconProps) => <svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
export const IconStar     = (p: IconProps) => <svg {...base(p)} fill="currentColor" strokeWidth={0}><path d="M12 2 15 9l8 .9-6 5.4 2 8.7-7-4-7 4 2-8.7-6-5.4L9 9z"/></svg>;
export const IconScroll   = (p: IconProps) => <svg {...base(p)}><path d="M19 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14M19 6v12M19 6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2"/><path d="M8 9h6M8 13h6"/></svg>;
export const IconMenu     = (p: IconProps) => <svg {...base(p)}><path d="M3 12h18M3 6h18M3 18h18"/></svg>;
