import { useEffect } from 'react';

/**
 * Simple theme toggle that switches between the default light theme and the
 * `.theme-dark` class defined in `src/index.css`.
 *
 * The toggle persists the user's preference in `localStorage` so the choice is
 * retained across page reloads.
 */
export default function ThemeToggle() {
  const toggle = () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle('theme-dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // Initialise theme from saved preference
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('theme-dark');
    }
  }, []);

  return (
    <button
      onClick={toggle}
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
  );
}

