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
        <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
            <Navigation user={user} />

            <main className="pb-12 lg:pl-[17.25rem]">{children}</main>
        </div>
    )
}

export default AppLayout
