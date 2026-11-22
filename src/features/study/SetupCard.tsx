import { motion } from 'motion/react'
import type { ReactNode } from 'react'

/** The card of a round's settings (Learn, Test): title, fields, a submit button. */
export function SetupCard({
  title,
  onSubmit,
  children,
}: {
  title: string
  onSubmit: () => void
  children: ReactNode
}) {
  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="raised mx-auto flex max-w-lg flex-col gap-6 rounded-[1.75rem] p-6"
    >
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {children}
    </motion.form>
  )
}
