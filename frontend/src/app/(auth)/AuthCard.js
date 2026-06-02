const AuthCard = ({ logo, children }) => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.12),transparent_28%)]" />

        <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-[rgba(255,252,246,0.78)] shadow-[0_32px_80px_rgba(18,50,57,0.14)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
            <div className="hidden border-r border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,50,57,0.98),rgba(14,89,83,0.94))] p-10 text-white xl:flex xl:flex-col xl:justify-between">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="rounded-3xl bg-white/12 p-4 text-white">
                            {logo}
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.32em] text-white/70">
                                Beacon School OS
                            </p>
                            <h1 className="font-[var(--font-display)] text-3xl">
                                Daily operations without the paper chase
                            </h1>
                        </div>
                    </div>

                    <p className="max-w-md text-sm text-white/76">
                        Built for teachers who need to capture attendance in
                        seconds and school leaders who need live visibility into
                        compliance, discipline, timetables, and balances.
                    </p>
                </div>

                <div className="grid gap-4">
                    {[
                        'AM/PM and period-based registration in one system',
                        'Student profiles with attendance and conduct context',
                        'Leadership dashboards for timetable and fee oversight',
                    ].map(item => (
                        <div
                            key={item}
                            className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white/86">
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 sm:p-10">
                <div className="mx-auto w-full max-w-md">
                    <div className="mb-8 flex items-center gap-4 xl:hidden">
                        <div className="rounded-3xl bg-[var(--ink)] p-3 text-white">
                            {logo}
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                                Beacon School OS
                            </p>
                            <h1 className="font-[var(--font-display)] text-2xl text-[var(--ink)]">
                                Secure staff access
                            </h1>
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-[var(--line)] bg-white/76 p-6 shadow-[0_18px_50px_rgba(18,50,57,0.08)] sm:p-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    </div>
)

export default AuthCard
