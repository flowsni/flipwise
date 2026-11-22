import type { ComponentProps, ReactNode } from 'react'
import { cx, StudyBar } from '@/design'

export function StudyShell({
  roomy,
  children,
  ...bar
}: ComponentProps<typeof StudyBar> & {
  roomy?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StudyBar {...bar} />
      <main
        className={cx(
          'mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-safe',
          roomy ? 'flex flex-col sm:pt-10' : 'sm:pt-8',
        )}
      >
        {children}
      </main>
    </div>
  )
}
