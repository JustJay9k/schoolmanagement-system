'use client'

import Link from 'next/link'
import ThemeToggleButton from '@/components/ThemeToggleButton'
import { useAuth } from '@/hooks/auth'

const linkClassName =
    'rounded-full border border-[var(--line)] bg-[var(--surface-card-soft)] px-4 py-2 text-sm font-semibold text-[var(--ink)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]'

const LoginLinks = () => {
    const { user } = useAuth({ middleware: 'guest' })

    return (
        <div className="fixed right-4 top-4 z-30 flex items-center gap-2 sm:gap-3">
            <ThemeToggleButton />

            {user ? (
                <Link href="/dashboard" className={linkClassName}>
                    Open workspace
                </Link>
            ) : (
                <>
                    <Link href="/login" className={linkClassName}>
                        Login
                    </Link>

                    {/* Register link removed per request */}
                </>
            )}
        </div>
    )
}

export default LoginLinks
