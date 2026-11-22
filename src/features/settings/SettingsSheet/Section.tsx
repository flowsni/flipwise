import type { ReactNode } from 'react'

export function Section({
  title,
  children,
  id,
}: {
  title: string
  children: ReactNode
  id?: string
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h3 id={id} className="text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}
