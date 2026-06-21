'use client'

import { usePathname } from 'next/navigation'

const AuthCard = ({ logo, children }) => {
    const pathname = usePathname()
    const isLoginPage = pathname === '/login'

    return (
        <div
            className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 xl:px-8 ${
                isLoginPage ? 'bg-slate-950' : ''
            }`}>
            {isLoginPage ? (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage:
                                "url('/images/Secondaryschool-Students-in-library.jpeg')",
                        }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,14,24,0.28),rgba(7,14,24,0.56)),radial-gradient(circle_at_top_left,rgba(var(--accent-rgb),0.22),transparent_30%)]" />
                </>
            ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--accent-rgb),0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_28%)]" />
            )}

            <div
                className={`relative w-full max-w-2xl rounded-[36px] border p-6 shadow-[0_32px_80px_var(--shadow-strong)] backdrop-blur sm:p-8 xl:p-10 ${
                    isLoginPage
                        ? 'border-white/30 bg-[rgba(255,252,246,0.18)]'
                        : 'border-[var(--line)] bg-[var(--surface-card)]'
                }`}>
                <div className="mx-auto w-full max-w-xl">
                    <div className="mb-8 flex items-center gap-4">
                        <div className="rounded-3xl bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] p-3 text-[var(--accent-contrast)]">
                            {logo}
                        </div>
                        <div>
                            <p
                                className={`text-xs uppercase tracking-[0.28em] ${
                                    isLoginPage
                                        ? 'text-white/80'
                                        : 'text-[var(--muted)]'
                                }`}>
                                Phunziro Class Management System (PCMS)
                            </p>
                            <h1
                                className={`font-[var(--font-display)] text-2xl ${
                                    isLoginPage
                                        ? 'text-white'
                                        : 'text-[var(--ink)]'
                                }`}>
                                Secure staff access
                            </h1>
                        </div>
                    </div>

                    <div
                        className={`rounded-[30px] border p-7 shadow-[0_18px_50px_var(--shadow-soft)] backdrop-blur sm:p-9 ${
                            isLoginPage
                                ? 'border-white/35 bg-[rgba(255,252,246,0.72)]'
                                : 'border-[var(--line)] bg-[var(--surface-raised)]'
                        }`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AuthCard
