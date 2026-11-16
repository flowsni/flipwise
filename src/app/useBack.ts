import { useNavigate } from 'react-router'

/**
 * «Назад» as the system does it: one step back in history if the app has a previous entry
 * (React Router keeps its index in `history.state.idx`), otherwise to `fallback` without
 * adding an entry.
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate()
  return () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
