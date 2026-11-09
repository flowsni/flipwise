import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import { SettingsSheet } from '../features/settings/SettingsSheet'

interface SettingsApi {
  open: (section?: 'ai') => void
}

const Ctx = createContext<SettingsApi>({ open: () => {} })

export function useSettingsSheet() {
  return useContext(Ctx)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; section?: 'ai' }>({ open: false })
  const api = useMemo(() => ({ open: (section?: 'ai') => setState({ open: true, section }) }), [])
  return (
    <Ctx.Provider value={api}>
      {children}
      <SettingsSheet
        open={state.open}
        focusSection={state.section}
        onClose={() => setState({ open: false })}
      />
    </Ctx.Provider>
  )
}
