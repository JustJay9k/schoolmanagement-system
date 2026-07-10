'use client'

import { usePathname } from 'next/navigation'

const AuthCard = ({ logo, children }) => {
    const pathname = usePathname()
    const isLoginPage = pathname === '/login'

    return (
        <div
            className={`relative flex min-h-screen items-center justify-center overflow-hidden px-3 py-4 sm:px-4 sm:py-5 xl:px-5 ${
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
                className={`relative w-full max-w-[35rem] rounded-[24px] border p-4 shadow-[0_18px_44px_var(--shadow-strong)] backdrop-blur sm:p-5 xl:p-6 ${
                    isLoginPage
                        ? 'border-white/20 bg-[var(--auth-hero-shell)]'
                        : 'border-[var(--line)] bg-[var(--surface-card)]'
                }`}>
                <div className="mx-auto w-full max-w-[30rem]">
                    <div className="mb-5 flex items-center gap-2.5">
                        <div className="rounded-[0.95rem] bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] p-2 text-[var(--accent-contrast)]">
                            {logo}
                        </div>
                        <div>
                            <p
                                className={`text-xs uppercase tracking-[0.28em] ${
                                    isLoginPage
                                        ? 'text-[var(--auth-hero-muted)]'
                                        : 'text-[var(--muted)]'
                                }`}>
                                Phunziro Class Management System (PCMS)
                            </p>
                            <h1
                                className={`font-[var(--font-display)] text-[1.3rem] ${
                                    isLoginPage
                                        ? 'text-[var(--auth-hero-ink)]'
                                        : 'text-[var(--ink)]'
                                }`}>
                                Secure staff access
                            </h1>
                        </div>
                    </div>

                    <div
                        className={`rounded-[20px] border p-4 shadow-[0_12px_28px_var(--shadow-soft)] backdrop-blur sm:p-5 ${
                            isLoginPage
                                ? 'border-white/12 bg-[var(--auth-hero-card)]'
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
