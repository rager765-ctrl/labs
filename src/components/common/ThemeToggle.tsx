import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('attendance_theme', nextTheme);
    setTheme(nextTheme);
  };

  return (
    <section className="card" aria-label="Appearance settings" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ width: '38px', height: '38px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--color-brand-100)', color: 'var(--color-brand-700)' }}>
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </span>
        <div>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-ink-900)' }}>Appearance</h2>
          <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-ink-500)' }}>{isDark ? 'Dark mode is on' : 'Light mode is on'}</p>
        </div>
      </div>
      <button type="button" className="theme-toggle" role="switch" aria-checked={isDark} aria-label="Dark mode" onClick={toggleTheme}>
        <span className="theme-toggle__thumb" />
      </button>
    </section>
  );
};
