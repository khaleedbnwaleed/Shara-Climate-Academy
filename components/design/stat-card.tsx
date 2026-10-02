import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type StatTone = 'forest' | 'gold' | 'terracotta' | 'sky'

interface StatCardProps {
  label: string
  value: string
  description?: string
  icon: LucideIcon
  tone?: StatTone
  className?: string
}

const toneStyles: Record<StatTone, string> = {
  forest: 'bg-[#edf7ef] text-[#133e2f]',
  gold: 'bg-[#fff3d9] text-[#684a00]',
  terracotta: 'bg-[#fff0ea] text-[#7a3e2e]',
  sky: 'bg-[#eaf6ff] text-[#153d5e]',
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'forest',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] transition-transform duration-200 hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}
