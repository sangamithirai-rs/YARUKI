import { toggleTheme, useIsDark } from '../lib/theme'

/**
 * Header button that switches between the light and dark themes.
 * The choice is remembered, and can also be set to follow the device in
 * Settings.
 */
export default function ThemeToggle() {
  const isDark = useIsDark()
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  )
}
