import Link from 'next/link'
import ApplicationLogo from '@/components/ApplicationLogo'

const footerNav = [
    {
        heading: 'Product',
        links: [
            { label: 'Home', href: '#hero' },
            { label: 'About', href: '#about' },
            { label: 'Pricing', href: '#pricing' },
        ],
    },
    {
        heading: 'Company',
        links: [
            { label: 'Contact', href: '#contact' },
            { label: 'Privacy Policy', href: '#' },
            { label: 'Terms of Service', href: '#' },
        ],
    },
    {
        heading: 'Resources',
        links: [
            { label: 'Documentation', href: '#' },
            { label: 'Support', href: '#' },
            { label: 'Status', href: '#' },
        ],
    },
]

const socialIcons = [
    {
        label: 'X / Twitter',
        href: '#',
        path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    },
    {
        label: 'Facebook',
        href: '#',
        path: 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z',
    },
    {
        label: 'LinkedIn',
        href: '#',
        path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    },
]

const LandingFooter = () => {
    const year = new Date().getFullYear()

    return (
        <footer className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--surface-card)]/60 backdrop-blur-lg">
            {/* decorative glow */}
            <div className="absolute -bottom-32 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full bg-[rgba(var(--accent-rgb),0.08)] blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
                {/* ── Top grid ── */}
                <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    {/* Brand column */}
                    <div className="max-w-xs space-y-5">
                        <Link
                            href="/"
                            className="group inline-flex items-center gap-2.5"
                            aria-label="PCMS Home">
                            <ApplicationLogo className="h-10 w-10 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" />
                            <span className="font-[var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]">
                                PCMS
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed text-[var(--muted)]">
                            Phunziro Class Management System — unifying attendance,
                            discipline, timetables, and finance into one fast,
                            headless platform for K-12 schools.
                        </p>

                        {/* Social icons */}
                        <div className="flex items-center gap-3 pt-1">
                            {socialIcons.map(social => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--muted)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:shadow-[0_4px_16px_var(--shadow-soft)]">
                                    <svg
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true">
                                        <path d={social.path} />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {footerNav.map(group => (
                        <div key={group.heading}>
                            <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink)]">
                                {group.heading}
                            </h4>
                            <ul className="mt-5 space-y-3">
                                {group.links.map(link => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="text-sm text-[var(--muted)] transition-colors duration-200 hover:text-[var(--accent)]">
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* ── Divider ── */}
                <div className="mt-14 h-px w-full bg-[var(--line)]" />

                {/* ── Bottom bar ── */}
                <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-xs text-[var(--muted)]">
                        &copy; {year} Phunziro Class Management System. All rights
                        reserved.
                    </p>
                    <div className="flex items-center gap-5">
                        <a
                            href="#"
                            className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]">
                            Privacy
                        </a>
                        <span className="text-[var(--line)]">·</span>
                        <a
                            href="#"
                            className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]">
                            Terms
                        </a>
                        <span className="text-[var(--line)]">·</span>
                        <a
                            href="#"
                            className="text-xs text-[var(--muted)] transition-colors hover:text-[var(--accent)]">
                            Cookies
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default LandingFooter
