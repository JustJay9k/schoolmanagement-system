'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const storageKey = 'beacon-theme'

const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light')

    useEffect(() => {
        const storedTheme = localStorage.getItem(storageKey)
        const resolvedTheme =
            storedTheme === 'light' || storedTheme === 'dark'
                ? storedTheme
                : getSystemTheme()

        setTheme(resolvedTheme)
    }, [])

    useEffect(() => {
        const root = document.documentElement

        root.dataset.theme = theme
        root.style.colorScheme = theme
        localStorage.setItem(storageKey, theme)
    }, [theme])

    const value = useMemo(
        () => ({ theme, setTheme }),
        [theme],
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
