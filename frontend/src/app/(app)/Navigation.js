'use client'

import ApplicationLogo from '@/components/ApplicationLogo'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Register', href: '/dashboard#register-center' },
    { label: 'Students', href: '/dashboard#students' },
    { label: 'Discipline', href: '/dashboard#discipline' },
    { label: 'Timetable', href: '/dashboard#timetable' },
    { label: 'Finance', href: '/dashboard#finance' },
]

const linkClassName = active =>
    `flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active
            ? 'bg-[var(--ink)] text-white shadow-[0_18px_40px_rgba(18,50,57,0.18)]'
            : 'text-[var(--ink)] hover:bg-white/80'
    }`

const Navigation = ({ user }) => {
    const { logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    const Sidebar = (
        <aside className="flex h-full flex-col gap-8 rounded-[32px] border border-white/70 bg-[rgba(255,252,246,0.84)] p-5 shadow-[0_22px_60px_rgba(18,50,57,0.12)] backdrop-blur">
            <div className="flex items-center gap-3">
                <div className="rounded-3xl bg-[var(--ink)] p-3 text-white">
                    <ApplicationLogo className="h-9 w-9 fill-current" />
                </div>
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                        Beacon School OS
                    </p>
                    <p className="font-[var(--font-display)] text-xl text-[var(--ink)]">
                        Operations Hub
                    </p>
                </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,50,57,0.98),rgba(11,93,87,0.94))] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.26em] text-white/68">
                    Signed in
                </p>
                <p className="mt-3 text-lg font-semibold">{user?.name}</p>
                <p className="text-sm text-white/72">{user?.email}</p>
            </div>

            <nav className="space-y-2">
                {navItems.map(item => (
                    <a
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={linkClassName(
                            item.href === '/dashboard' &&
                                pathname === '/dashboard',
                        )}>
                        <span>{item.label}</span>
                        <span className="text-xs opacity-60">01</span>
                    </a>
                ))}
            </nav>

            <div className="mt-auto space-y-4">
                <div className="rounded-[28px] border border-[var(--line)] bg-white/72 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                        Today
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
                        2 classes complete, 4 period submissions pending.
                    </p>
                </div>

                <button
                    onClick={logout}
                    className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]">
                    Logout
                </button>
            </div>
        </aside>
    )

    return (
        <>
            <div className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(255,252,246,0.78)] px-4 py-4 backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="rounded-2xl bg-[var(--ink)] p-2.5 text-white">
                            <ApplicationLogo className="h-8 w-8 fill-current" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                Beacon School OS
                            </p>
                            <p className="font-[var(--font-display)] text-lg text-[var(--ink)]">
                                Workspace
                            </p>
                        </div>
                    </Link>

                    <button
                        onClick={() => setOpen(true)}
                        className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]">
                        Menu
                    </button>
                </div>
            </div>

            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[19rem] lg:p-4">
                {Sidebar}
            </div>

            {open && (
                <div className="fixed inset-0 z-40 bg-[rgba(18,50,57,0.42)] p-4 backdrop-blur-sm lg:hidden">
                    <div className="ml-auto h-full max-w-sm">
                        <div className="mb-3 flex justify-end">
                            <button
                                onClick={() => setOpen(false)}
                                className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]">
                                Close
                            </button>
                        </div>
                        {Sidebar}
                    </div>
                </div>
            )}
        </>
    )
}

export default Navigation
