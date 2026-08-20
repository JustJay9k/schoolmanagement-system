'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ApplicationLogo from '@/components/ApplicationLogo'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import { useAuth } from '@/hooks/auth'

const navItems = [
    { label: 'Home', href: '#hero' },
    { label: 'About', href: '#about' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Contact', href: '#contact' },
]

const LoginLinks = () => {
    const { user } = useAuth({ middleware: 'guest' })
    const [mobileOpen, setMobileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    /* close mobile menu on resize to desktop */
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 768) setMobileOpen(false)
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    return (
        <>
            <nav
                className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
                    scrolled
                        ? 'border-b border-[var(--line)] bg-[var(--surface-card-strong)]/80 shadow-[0_4px_24px_var(--shadow-soft)] backdrop-blur-xl'
                        : 'bg-transparent'
                }`}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    {/* ── Logo ── */}
                    <Link
                        href="/"
                        className="group flex items-center gap-2.5"
                        aria-label="PCMS Home">
                        <ApplicationLogo className="h-9 w-9 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" />
                        <span className="font-[var(--font-display)] text-lg font-bold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">
                            PCMS
                        </span>
                    </Link>

                    {/* ── Desktop nav links ── */}
                    <ul className="hidden items-center gap-1 md:flex">
                        {navItems.map(item => (
                            <li key={item.label}>
                                <a
                                    href={item.href}
                                    className="relative rounded-full px-4 py-2 text-sm font-medium text-[var(--muted)] transition-colors duration-200 hover:text-[var(--ink)] after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--accent)] after:transition-transform after:duration-300 hover:after:scale-x-100">
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    {/* ── Right cluster ── */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <ThemeToggleButton />

                        {!user && (
                            <Link
                                href="/login"
                                className="hidden rounded-full border border-[var(--line)] bg-[var(--surface-card-soft)] px-5 py-2 text-sm font-semibold text-[var(--ink)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] md:inline-flex">
                                Login
                            </Link>
                        )}

                        {/* ── Mobile hamburger ── */}
                        <button
                            onClick={() => setMobileOpen(prev => !prev)}
                            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-card-soft)] backdrop-blur transition hover:border-[var(--accent)] md:hidden"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileOpen}>
                            <span className="sr-only">Menu</span>
                            <span
                                className={`absolute h-[2px] w-4 rounded-full bg-[var(--ink)] transition-all duration-300 ${
                                    mobileOpen
                                        ? 'translate-y-0 rotate-45'
                                        : '-translate-y-[5px]'
                                }`}
                            />
                            <span
                                className={`absolute h-[2px] w-4 rounded-full bg-[var(--ink)] transition-all duration-300 ${
                                    mobileOpen ? 'opacity-0' : 'opacity-100'
                                }`}
                            />
                            <span
                                className={`absolute h-[2px] w-4 rounded-full bg-[var(--ink)] transition-all duration-300 ${
                                    mobileOpen
                                        ? 'translate-y-0 -rotate-45'
                                        : 'translate-y-[5px]'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* ── Mobile drawer ── */}
                <div
                    className={`overflow-hidden border-t border-[var(--line)] bg-[var(--surface-card-strong)]/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
                        mobileOpen
                            ? 'max-h-80 opacity-100'
                            : 'max-h-0 border-t-0 opacity-0'
                    }`}>
                    <ul className="flex flex-col gap-1 px-4 py-4">
                        {navItems.map(item => (
                            <li key={item.label}>
                                <a
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--surface-tint)] hover:text-[var(--ink)]">
                                    {item.label}
                                </a>
                            </li>
                        ))}

                        {!user && (
                            <li className="mt-2">
                                <Link
                                    href="/login"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-full bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-4 py-3 text-center text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_8px_24px_var(--shadow-strong)] transition hover:brightness-110">
                                    Login
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </nav>
        </>
    )
}

export default LoginLinks
