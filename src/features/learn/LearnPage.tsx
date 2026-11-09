import { useNavigate, useParams } from 'react-router'
import { Button } from '../../design/Button'

/** Placeholder until this study mode lands. */
export function LearnPage() {
  const { deckId } = useParams()
  const navigate = useNavigate()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-ink-2">Скоро здесь будет этот режим.</p>
      <Button variant="primary" onClick={() => navigate(`/deck/${deckId}`)}>
        К набору
      </Button>
    </main>
  )
}
