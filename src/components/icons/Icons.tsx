import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-down'
  | 'arrow-up'
  | 'check'
  | 'chevron-right'
  | 'close'
  | 'document'
  | 'external'
  | 'globe'
  | 'help'
  | 'info'
  | 'mail'
  | 'menu'
  | 'more'
  | 'plus'
  | 'projects'
  | 'refresh'
  | 'settings'
  | 'spark'
  | 'star'
  | 'template'
  | 'tool'
  | 'upload'
  | 'warning'
  | 'x'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName
  size?: number
}

const paths: Record<IconName, ReactNode> = {
  'arrow-down': <path d="M12 5v14m0 0 6-6m-6 6-6-6" />,
  'arrow-left': <path d="M19 12H5m6 6-6-6 6-6" />,
  'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6" />,
  'arrow-up': <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  'chevron-right': <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  document: <path d="M7 3h7l4 4v14H7zM14 3v5h5M10 12h5M10 16h5" />,
  external: <path d="M14 5h5v5M19 5l-8 8M17 13v5H5V6h5" />,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9a2.4 2.4 0 1 1 3.8 1.9c-.9.7-1.5 1.1-1.5 2.4M12 16.5h.01" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5M12 7.5h.01" /></>,
  mail: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m5 8 7 5 7-5" /></>,
  menu: <path d="M5 7h14M5 12h14M5 17h14" />,
  more: <><circle cx="6" cy="12" r=".7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r=".7" fill="currentColor" stroke="none" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  projects: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></>,
  refresh: <path d="M19 8a7.5 7.5 0 1 0 1 6M19 4v4h-4" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19 12 2-1-2-4-2 1a7 7 0 0 0-2-1l-.3-2h-5.4L9 7a7 7 0 0 0-2 1L5 7l-2 4 2 1a7 7 0 0 0 0 2l-2 1 2 4 2-1a7 7 0 0 0 2 1l.3 2h5.4L15 19a7 7 0 0 0 2-1l2 1 2-4-2-1a7 7 0 0 0 0-2Z" /></>,
  spark: <path d="m12 3 1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-2.5L12 3Z" />,
  star: <path d="m12 3 2.6 5.6 6.1.8-4.5 4.3 1.1 6.1-5.3-2.9-5.3 2.9 1.1-6.1-4.5-4.3 6.1-.8L12 3Z" />,
  template: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 9v11" /></>,
  tool: <><path d="m14.5 6.5 3-3 3 3-3 3M17.5 9.5 9 18a2.1 2.1 0 0 1-3 0 2.1 2.1 0 0 1 0-3l8.5-8.5M5 19l-1 1M8 16l-1-1" /></>,
  upload: <><path d="M12 16V4m0 0L8 8m4-4 4 4" /><path d="M5 14v4h14v-4" /></>,
  warning: <><path d="m12 4 8 15H4L12 4Z" /><path d="M12 9v4M12 16h.01" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
}

export function Icon({ name, size = 18, strokeWidth = 1.7, 'aria-hidden': ariaHidden = true, ...props }: IconProps) {
  return (
    <svg
      {...props}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
