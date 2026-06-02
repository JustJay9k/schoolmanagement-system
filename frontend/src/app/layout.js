import { Manrope, Space_Grotesk } from 'next/font/google'
import '@/app/global.css'

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
            className={`${bodyFont.variable} ${displayFont.variable}`}>
            <body className="font-[var(--font-body)] antialiased text-[var(--ink)]">
                {children}
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
