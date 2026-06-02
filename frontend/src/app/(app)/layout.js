'use client'

import { useAuth } from '@/hooks/auth'
import Navigation from '@/app/(app)/Navigation'
import Loading from '@/app/(app)/Loading'

const AppLayout = ({ children }) => {
    const { user } = useAuth({ middleware: 'auth' })

    if (!user) {
        return <Loading />
    }

    return (
        <div className="min-h-screen text-[var(--ink)]">
            <Navigation user={user} />

            <main className="pb-12 lg:pl-[19rem]">{children}</main>
        </div>
    )
}

export default AppLayout
