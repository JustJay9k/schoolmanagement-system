'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'
import { useTheme } from '@/components/ThemeProvider'

const SunIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.themeIcon}>
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
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
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.themeIcon}>
        <path
            d="M18 15.5A7.5 7.5 0 0 1 8.5 6a8 8 0 1 0 9.5 9.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
    </svg>
)

const settingsNotes = [
    {
        title: 'Notifications',
        detail: 'Alert routing, digest timing, and escalation recipients can live here next.',
        meta: 'Ready for wiring',
    },
    {
        title: 'Roles and permissions',
        detail: 'Staff access presets and approval gates can be attached to this screen.',
        meta: 'Ready for wiring',
    },
    {
        title: 'Integrations',
        detail: 'MIS, payment provider, and messaging connections can surface from this page.',
        meta: 'Ready for wiring',
    },
]

export default function SettingsPage() {
    const { theme, setTheme, accent, setAccent, accentThemes } = useTheme()
    const activeAccent = accentThemes.find(option => option.id === accent)

    return (
        <WorkspacePageShell
            eyebrow="Workspace Settings"
            title="Preferences and system controls"
            description="Appearance controls now live in settings, with corrected dark mode surfaces and a selectable accent palette for buttons, highlights, and other interactive elements."
        >
            <section className={styles.panelGrid}>
                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Appearance</p>
                            <h2 className={styles.panelTitle}>Theme mode</h2>
                        </div>
                        <span className={styles.badge}>
                            {theme === 'dark' ? 'Dark enabled' : 'Light enabled'}
                        </span>
                    </div>

                    <div className={styles.themeSwitch} role="group" aria-label="Theme selector">
                        <button
                            type="button"
                            onClick={() => setTheme('light')}
                            aria-pressed={theme === 'light'}
                            className={`${styles.themeButton} ${
                                theme === 'light' ? styles.themeButtonActive : ''
                            }`}>
                            <SunIcon />
                            <span>Light</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            aria-pressed={theme === 'dark'}
                            className={`${styles.themeButton} ${
                                theme === 'dark' ? styles.themeButtonActive : ''
                            }`}>
                            <MoonIcon />
                            <span>Dark</span>
                        </button>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Theme color</p>
                            <h2 className={styles.panelTitle}>Accent palette</h2>
                        </div>
                        <span className={styles.badge}>{activeAccent?.label ?? 'Teal'} selected</span>
                    </div>

                    <div className={styles.paletteGrid} role="group" aria-label="Accent palette selector">
                        {accentThemes.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setAccent(option.id)}
                                aria-pressed={accent === option.id}
                                className={`${styles.paletteButton} ${
                                    accent === option.id ? styles.paletteButtonActive : ''
                                }`}>
                                <div
                                    className={styles.paletteSwatch}
                                    style={{
                                        background: `linear-gradient(135deg, ${option.accent} 0%, ${option.accentStrong} 100%)`,
                                    }}
                                />
                                <div className={styles.paletteMeta}>
                                    <strong>{option.label}</strong>
                                    <span>Applies to buttons, highlights, and active states.</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Workspace</p>
                            <h2 className={styles.panelTitle}>Settings modules</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        {settingsNotes.map(item => (
                            <div key={item.title} className={styles.listItem}>
                                <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.detail}</p>
                                </div>
                                <span className={styles.badge}>{item.meta}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
