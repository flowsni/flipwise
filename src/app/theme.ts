import { useEffect } from 'react'
import { useMediaQuery } from '../design/useMediaQuery'
import { useSetting } from '../lib/storage'

export type ThemeSetting = 'system' | 'light' | 'dark'

export function useThemeSetting() {
  return useSetting<ThemeSetting>('theme', 'system')
}

/** Applies the theme to <html data-theme> and the browser chrome colour. */
export function useApplyTheme() {
  const [theme] = useThemeSetting()
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.content = dark ? '#1A1124' : '#FBF6F1'
      meta.removeAttribute('media')
    }
  }, [dark])
}
