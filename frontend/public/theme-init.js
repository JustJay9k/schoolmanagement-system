(() => {
    try {
        const accentOptions = ['teal', 'blue', 'indigo', 'rose', 'amber', 'emerald']
        const publicPrefixes = [
            '/forgot-password',
            '/login',
            '/password-reset',
            '/register',
            '/verify-email',
        ]
        const pathname = window.location.pathname
        const usesPublicTheme = pathname === '/' || publicPrefixes.some(prefix =>
            pathname === prefix || pathname.startsWith(`${prefix}/`),
        )
        const userId = localStorage.getItem('pcms-user-id')
        const themeKey = usesPublicTheme
            ? 'pcms-theme-public'
            : userId
                ? `pcms-theme-${userId}`
                : null
        const storedTheme = themeKey ? localStorage.getItem(themeKey) : null
        const accentKey = !usesPublicTheme && userId ? `pcms-accent-${userId}` : null
        const storedAccent = accentKey ? localStorage.getItem(accentKey) : null
        const theme = storedTheme === 'dark' || storedTheme === 'light'
            ? storedTheme
            : window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
        const accent = accentOptions.includes(storedAccent)
            ? storedAccent
            : 'teal'

        document.documentElement.dataset.theme = theme
        document.documentElement.dataset.accent = usesPublicTheme ? 'teal' : accent
        document.documentElement.style.colorScheme = theme
    } catch (error) {}
})();
