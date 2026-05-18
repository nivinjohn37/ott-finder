import type { OttAvailability } from '@/types'
import { getPlatformColor } from '@/types'

interface Props {
  platform: OttAvailability
  size?: 'sm' | 'md'
}

export function PlatformBadge({ platform, size = 'md' }: Props) {
  const color = getPlatformColor(platform.platformName)
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'

  const inner = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-body font-medium ${sizeClass}`}
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {platform.displayName}
      {platform.availableUntil && (
        <span className="opacity-60">
          · {new Date(platform.availableUntil).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </span>
  )

  if (platform.deepLink) {
    return (
      <a
        href={platform.deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {inner}
      </a>
    )
  }
  return inner
}
