import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { Button } from '../design/Button'
import { t } from '../i18n/ru'
import { ErrorScreen } from './ErrorBoundary'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <ErrorScreen
      title={t.errors.notFoundTitle}
      text={t.errors.notFoundText}
      action={
        <Button variant="primary" size="lg" onClick={() => navigate('/')}>
          {t.deck.toHome}
        </Button>
      }
    />
  )
}

export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />
  console.error(error)
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
