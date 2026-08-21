(() => {
    try {
        const accentOptions = ['teal', 'blue', 'indigo', 'rose', 'amber', 'emerald']
        const storedTheme = localStorage.getItem('pcms-theme')
        const storedAccent = localStorage.getItem('pcms-accent')
        const theme = storedTheme === 'dark' || storedTheme === 'light'
            ? storedTheme
            : window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
        const accent = accentOptions.includes(storedAccent)
            ? storedAccent
            : 'teal'

        document.documentElement.dataset.theme = theme
        document.documentElement.dataset.accent = accent
        document.documentElement.style.colorScheme = theme
    } catch (error) {}
})();
