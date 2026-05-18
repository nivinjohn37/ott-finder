import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cinema-navy flex items-center justify-center text-cinema-muted mb-4">
        {icon}
      </div>
      <h3 className="font-heading font-semibold text-lg text-cinema-text mb-2">{title}</h3>
      <p className="text-cinema-muted font-body text-sm max-w-xs">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
