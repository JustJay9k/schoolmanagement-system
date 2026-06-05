import { Manrope, Space_Grotesk } from 'next/font/google'
import '@/app/global.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const bodyFont = Manrope({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-body',
})

const displayFont = Space_Grotesk({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-display',
})

const RootLayout = ({ children }) => {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${bodyFont.variable} ${displayFont.variable}`}>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(() => {
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
                        })();`,
                    }}
                />
            </head>
            <body className="font-[var(--font-body)] antialiased text-[var(--ink)]">
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    )
}

export const metadata = {
    title: 'Phunziro Class Management System (PCMS)',
    description:
        'PCMS workspace for attendance, discipline, timetables, and finance.',
}

export default RootLayout
