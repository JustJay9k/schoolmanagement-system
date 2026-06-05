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
                                const storedTheme = localStorage.getItem('beacon-theme')
                                const theme = storedTheme === 'dark' || storedTheme === 'light'
                                    ? storedTheme
                                    : window.matchMedia('(prefers-color-scheme: dark)').matches
                                        ? 'dark'
                                        : 'light'

                                document.documentElement.dataset.theme = theme
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
    title: 'Beacon School OS',
    description:
        'Operational school management workspace for attendance, discipline, timetables, and finance.',
}

export default RootLayout
