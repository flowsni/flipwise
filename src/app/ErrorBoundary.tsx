import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../design/Button'
import { LogoMark } from '../design/Logo'
import { t } from '../i18n/ru'

export function ErrorScreen({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark size={72} className="opacity-90" />
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-ink-2">{text}</p>
      {action}
    </main>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Flipwise crashed', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorScreen
          title={t.errors.title}
          text={t.errors.text}
          action={
            <Button variant="primary" size="lg" onClick={() => window.location.reload()}>
              {t.errors.reload}
            </Button>
          }
        />
      )
    }
    return this.props.children
  }
}
