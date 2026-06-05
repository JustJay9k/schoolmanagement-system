'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/auth'
import Navigation from '@/app/(app)/Navigation'
import Loading from '@/app/(app)/Loading'

const AppLayout = ({ children }) => {
    const { user } = useAuth({ middleware: 'auth' })
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    useEffect(() => {
        const storedValue = localStorage.getItem('beacon-sidebar-collapsed')

        setSidebarCollapsed(storedValue === 'true')
    }, [])

    useEffect(() => {
        const handleToggleSidebar = () => {
            setSidebarCollapsed(current => !current)
        }

        window.addEventListener('beacon-toggle-sidebar', handleToggleSidebar)

        return () => {
            window.removeEventListener('beacon-toggle-sidebar', handleToggleSidebar)
        }
    }, [])

    useEffect(() => {
        document.body.dataset.sidebarCollapsed = sidebarCollapsed ? 'true' : 'false'
        localStorage.setItem('beacon-sidebar-collapsed', String(sidebarCollapsed))
    }, [sidebarCollapsed])

    if (!user) {
        return <Loading />
    }

    return (
        <div className="min-h-screen text-[var(--ink)]">
            <Navigation
                user={user}
                sidebarCollapsed={sidebarCollapsed}
            />

            <main className="appShellMain pb-12">{children}</main>
        </div>
    )
}

export default AppLayout
