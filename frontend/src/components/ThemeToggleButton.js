'use client'

import { useTheme } from '@/components/ThemeProvider'

const SunIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <circle
            cx="12"
            cy="12"
            r="3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        />
        <path
            d="M12 4.5V3M12 21v-1.5M19.5 12H21M3 12h1.5M17.2 6.8 18.3 5.7M5.7 18.3 6.8 17.2M17.2 17.2l1.1 1.1M5.7 5.7 6.8 6.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
)

const MoonIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
            d="M18 15.5A7.5 7.5 0 0 1 8.5 6a8 8 0 1 0 9.5 9.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
    </svg>
)

const ThemeToggleButton = ({ className = '' }) => {
    const { theme, setTheme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className={`inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-card-soft)] px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-[0_10px_28px_var(--shadow-soft)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-strong)] ${className}`}>
            {isDark ? <SunIcon /> : <MoonIcon />}
            <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
    )
}

export default ThemeToggleButton
