import { cn } from '@/lib/utils'
import { STATUS_LABELS, type DatabaseStatus } from '@/lib/databases'

const TONE: Record<DatabaseStatus, { pill: string; dot: string }> = {
  active: {
    pill: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300',
    dot: 'bg-success-500',
  },
  crawling: {
    pill: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    dot: 'animate-pulse bg-brand-500',
  },
  pending: {
    pill: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    dot: 'animate-pulse bg-brand-500',
  },
  failed: {
    pill: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300',
    dot: 'bg-error-500',
  },
  inactive: {
    pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
  },
}

export function StatusBadge({ status, className }: { status: DatabaseStatus; className?: string }) {
  const tone = TONE[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        tone.pill,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', tone.dot)} />
      {STATUS_LABELS[status]}
    </span>
  )
}
