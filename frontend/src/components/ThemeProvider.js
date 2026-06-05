'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const themeStorageKey = 'pcms-theme'
const accentStorageKey = 'pcms-accent'
const defaultAccent = 'teal'

export const accentThemes = [
    { id: 'teal', label: 'Teal', accent: '#0f766e', accentStrong: '#0b5d57' },
    { id: 'blue', label: 'Blue', accent: '#2563eb', accentStrong: '#1d4ed8' },
    { id: 'indigo', label: 'Indigo', accent: '#4f46e5', accentStrong: '#4338ca' },
    { id: 'rose', label: 'Rose', accent: '#be185d', accentStrong: '#9d174d' },
    { id: 'amber', label: 'Amber', accent: '#b45309', accentStrong: '#92400e' },
    { id: 'emerald', label: 'Emerald', accent: '#047857', accentStrong: '#065f46' },
]

const accentIds = new Set(accentThemes.map(theme => theme.id))

const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light')
    const [accent, setAccent] = useState(defaultAccent)

    useEffect(() => {
        const storedTheme = localStorage.getItem(themeStorageKey)
        const storedAccent = localStorage.getItem(accentStorageKey)
        const resolvedTheme =
            storedTheme === 'light' || storedTheme === 'dark'
                ? storedTheme
                : getSystemTheme()
        const resolvedAccent = accentIds.has(storedAccent) ? storedAccent : defaultAccent

        setTheme(resolvedTheme)
        setAccent(resolvedAccent)
    }, [])

    useEffect(() => {
        const root = document.documentElement

        root.dataset.theme = theme
        root.style.colorScheme = theme
        localStorage.setItem(themeStorageKey, theme)
    }, [theme])

    useEffect(() => {
        const root = document.documentElement

        root.dataset.accent = accent
        localStorage.setItem(accentStorageKey, accent)
    }, [accent])

    const value = useMemo(
        () => ({ theme, setTheme, accent, setAccent, accentThemes }),
        [accent, theme],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }

    return context
}
