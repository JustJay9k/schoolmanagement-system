import { Manrope, Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import '@/app/global.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/ToastProvider'

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
            <body className="font-[var(--font-body)] antialiased text-[var(--ink)]">
                <Script
                    id="theme-init"
                    src="/theme-init.js"
                    strategy="beforeInteractive"
                />
                <ThemeProvider>
                    <ToastProvider>{children}</ToastProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}

export const metadata = {
    title: 'Masambiro Class Management System (MCMS)',
    description:
        'MCMS workspace for attendance, discipline, timetables, and finance.',
    icons: {
        icon: '/images/mcms-logo.png',
        shortcut: '/images/mcms-logo.png',
        apple: '/images/mcms-logo.png',
    },
}

export default RootLayout
