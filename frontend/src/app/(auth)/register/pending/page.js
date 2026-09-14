import Link from 'next/link'

export const metadata = {
    title: 'Account request sent - PCMS',
}

export default function PendingTeacherApprovalPage() {
    return (
        <div className="grid gap-5">
            <div className="grid gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                    Request sent
                </p>
                <h2 className="font-[var(--font-display)] text-2xl text-[var(--ink)]">
                    Your account has been created
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                    Your teacher account request has been sent. Your head
                    teacher must accept it before you can sign in.
                </p>
            </div>

            <div className="rounded-2xl border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-medium text-[var(--status-info-ink)]">
                If you try to sign in before approval, PCMS will remind you that
                your request is still waiting for confirmation.
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-[0.8rem] border border-transparent bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-3.5 py-2 text-[0.84rem] font-semibold text-[var(--accent-contrast)] shadow-[0_8px_20px_var(--shadow-strong)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-strong)]">
                    Back to sign in
                </Link>
                <Link
                    href="/register"
                    className="text-sm font-semibold text-[var(--muted)] underline transition hover:text-[var(--ink)]">
                    Create another account
                </Link>
            </div>
        </div>
    )
}
