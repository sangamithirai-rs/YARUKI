import { toggleTheme } from '../lib/theme'

/**
 * Header button that switches between the light theme and the `.theme-dark`
 * class defined in `src/index.css`. The saved choice is applied at start-up
 * (see `initTheme` in `src/main.tsx`) and can also be changed in Settings.
 */
export default function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      style={{
        marginLeft: '1rem',
        padding: '0.4rem 0.8rem',
        background: 'var(--color-accent)',
        color: 'var(--color-text)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
      }}
    >
      Toggle Theme
    </button>
  )
}
