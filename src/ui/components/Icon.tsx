import styles from './Icon.module.css';

export type IconName =
  | 'menu'
  | 'bell'
  | 'dashboard'
  | 'history'
  | 'settings'
  | 'plus'
  | 'warning'
  | 'close'
  | 'arrow-right'
  | 'food'
  | 'car'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'info';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

function svgPath(name: IconName): string {
  switch (name) {
    case 'menu':
      return 'M4 6h16M4 12h16M4 18h16';
    case 'bell':
      return 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0';
    case 'dashboard':
      return 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z';
    case 'history':
      return 'M12 6v6l4 2M22 12a10 10 0 11-20 0 10 10 0 0120 0z';
    case 'settings':
      return 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z';
    case 'plus':
      return 'M12 5v14M5 12h14';
    case 'warning':
      return 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01';
    case 'close':
      return 'M18 6L6 18M6 6l12 12';
    case 'arrow-right':
      return 'M5 12h14M12 5l7 7-7 7';
    case 'food':
      return 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3';
    case 'car':
      return 'M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M7 17v3M17 17v3M7 13h.01M17 13h.01';
    case 'entertainment':
      return 'M18 4l4 4M14 8l8-8M4 20l16-8M4 20l4-8m-4 8l8-4M3 9l5 5M8 3v2M16 3v2M3 3h18v18H3V3z';
    case 'shopping':
      return 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0';
    case 'health':
      return 'M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z';
    case 'info':
      return 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01';
    default:
      return '';
  }
}

export function Icon({ name, size = 24, className = '' }: IconProps) {
  const path = svgPath(name);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles.icon} ${className}`}
    >
      <path d={path} />
    </svg>
  );
}
