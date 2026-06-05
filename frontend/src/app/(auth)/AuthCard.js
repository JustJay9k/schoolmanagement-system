const AuthCard = ({ logo, children }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 xl:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--accent-rgb),0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_28%)]" />

        <div className="relative w-full max-w-2xl rounded-[36px] border border-[var(--line)] bg-[var(--surface-card)] p-6 shadow-[0_32px_80px_var(--shadow-strong)] backdrop-blur sm:p-8 xl:p-10">
            <div className="mx-auto w-full max-w-xl">
                <div className="mb-8 flex items-center gap-4">
                    <div className="rounded-3xl bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] p-3 text-[var(--accent-contrast)]">
                        {logo}
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                            Phunziro Class Management System (PCMS)
                        </p>
                        <h1 className="font-[var(--font-display)] text-2xl text-[var(--ink)]">
                            Secure staff access
                        </h1>
                    </div>
                </div>

                <div className="rounded-[30px] border border-[var(--line)] bg-[var(--surface-raised)] p-7 shadow-[0_18px_50px_var(--shadow-soft)] sm:p-9">
                    {children}
                </div>
            </div>
        </div>
    </div>
)

export default AuthCard
