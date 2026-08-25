'use client'

import { usePathname } from 'next/navigation'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

const ThemeContext = createContext(null)
const defaultAccent = 'teal'

const publicThemeKey = 'pcms-theme-public'
const userIdKey = 'pcms-user-id'

export const accentThemes = [
    { id: 'teal', label: 'Teal', accent: '#0f766e', accentStrong: '#0b5d57' },
    { id: 'blue', label: 'Blue', accent: '#2563eb', accentStrong: '#1d4ed8' },
    { id: 'indigo', label: 'Indigo', accent: '#4f46e5', accentStrong: '#4338ca' },
    { id: 'rose', label: 'Rose', accent: '#be185d', accentStrong: '#9d174d' },
    { id: 'amber', label: 'Amber', accent: '#b45309', accentStrong: '#92400e' },
    { id: 'emerald', label: 'Emerald', accent: '#047857', accentStrong: '#065f46' },
]

const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const userThemeKey = userId => `pcms-theme-${userId}`
const userAccentKey = userId => `pcms-accent-${userId}`
const accentIds = new Set(accentThemes.map(theme => theme.id))

const readStoredTheme = key => {
    if (typeof window === 'undefined') {
        return null
    }

    const stored = localStorage.getItem(key)

    return stored === 'light' || stored === 'dark' ? stored : null
}

const readStoredAccent = key => {
    if (typeof window === 'undefined') {
        return null
    }

    const stored = localStorage.getItem(key)

    return accentIds.has(stored) ? stored : null
}

const resolveUserId = () => {
    if (typeof window === 'undefined') {
        return null
    }

    return localStorage.getItem(userIdKey) || null
}

const publicRoutePrefixes = [
    '/forgot-password',
    '/login',
    '/password-reset',
    '/register',
    '/verify-email',
]

const isPublicThemeRoute = pathname =>
    !pathname ||
    pathname === '/' ||
    publicRoutePrefixes.some(
        prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )

export const ThemeProvider = ({ children }) => {
    const pathname = usePathname()
    const usesPublicTheme = isPublicThemeRoute(pathname)
    const [userId, setUserId] = useState(resolveUserId)
    const [theme, setThemeState] = useState(() => {
        if (typeof window === 'undefined') {
            return 'light'
        }

        const path = window.location.pathname

        if (!isPublicThemeRoute(path)) {
            const uid = localStorage.getItem(userIdKey) || null

            if (!uid) {
                return getSystemTheme()
            }

            return readStoredTheme(userThemeKey(uid)) ?? getSystemTheme()
        }

        return readStoredTheme(publicThemeKey) ?? getSystemTheme()
    })

    const [accent, setAccentState] = useState(() => {
        if (typeof window === 'undefined') {
            return defaultAccent
        }

        const path = window.location.pathname

        if (isPublicThemeRoute(path)) {
            return defaultAccent
        }

        const uid = localStorage.getItem(userIdKey) || null

        return uid ? readStoredAccent(userAccentKey(uid)) ?? defaultAccent : defaultAccent
    })

    useEffect(() => {
        const interval = setInterval(() => {
            const currentId = localStorage.getItem(userIdKey) || null

            setUserId(prev => {
                if (prev !== currentId) {
                    return currentId
                }

                return prev
            })
        }, 500)

        return () => clearInterval(interval)
    }, [])

    const activeThemeKey = usesPublicTheme
        ? publicThemeKey
        : userId
          ? userThemeKey(userId)
          : null
    const activeAccentKey =
        !usesPublicTheme && userId ? userAccentKey(userId) : null

    useEffect(() => {
        if (!activeThemeKey) {
            setThemeState(getSystemTheme())
            return
        }

        setThemeState(readStoredTheme(activeThemeKey) ?? getSystemTheme())
    }, [activeThemeKey])

    useEffect(() => {
        if (!activeAccentKey) {
            setAccentState(defaultAccent)
            return
        }

        setAccentState(readStoredAccent(activeAccentKey) ?? defaultAccent)
    }, [activeAccentKey])

    const setTheme = useCallback(
        nextTheme => {
            const resolvedTheme =
                typeof nextTheme === 'function' ? nextTheme(theme) : nextTheme

            if (resolvedTheme !== 'light' && resolvedTheme !== 'dark') {
                return
            }

            setThemeState(resolvedTheme)

            if (activeThemeKey) {
                localStorage.setItem(activeThemeKey, resolvedTheme)
            }
        },
        [activeThemeKey, theme],
    )

    const setAccent = useCallback(
        nextAccent => {
            const resolvedAccent =
                typeof nextAccent === 'function' ? nextAccent(accent) : nextAccent

            if (!accentIds.has(resolvedAccent)) {
                return
            }

            setAccentState(resolvedAccent)

            if (activeAccentKey) {
                localStorage.setItem(activeAccentKey, resolvedAccent)
            }
        },
        [accent, activeAccentKey],
    )

    useEffect(() => {
        const root = document.documentElement

        root.dataset.theme = theme
        root.style.colorScheme = theme
    }, [theme])

    useEffect(() => {
        const root = document.documentElement

        root.dataset.accent = accent
    }, [accent])

    const value = useMemo(
        () => ({
            theme,
            setTheme,
            accent,
            setAccent,
            accentThemes,
        }),
        [accent, setAccent, setTheme, theme],
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
