'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/auth'
import Navigation from '@/app/(app)/Navigation'
import Loading from '@/app/(app)/Loading'

const idleTimeoutMs = 10 * 60 * 1000
const activityEvents = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click',
]

const AppLayout = ({ children }) => {
    const { user, logout } = useAuth({ middleware: 'auth' })
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed(current => !current)
    }, [])

    useEffect(() => {
        const storedValue = localStorage.getItem('pcms-sidebar-collapsed')

        setSidebarCollapsed(storedValue === 'true')
    }, [])

    useEffect(() => {
        window.addEventListener('pcms-toggle-sidebar', toggleSidebar)

        return () => {
            window.removeEventListener('pcms-toggle-sidebar', toggleSidebar)
        }
    }, [toggleSidebar])

    useEffect(() => {
        document.body.dataset.sidebarCollapsed = sidebarCollapsed ? 'true' : 'false'
        localStorage.setItem('pcms-sidebar-collapsed', String(sidebarCollapsed))
    }, [sidebarCollapsed])

    useEffect(() => {
        if (!user?.id) {
            localStorage.removeItem('pcms-user-id')
            return
        }

        localStorage.setItem('pcms-user-id', String(user.id))
    }, [user?.id])

    useEffect(() => {
        if (!user) {
            return undefined
        }

        let timeoutId

        const scheduleLogout = () => {
            window.clearTimeout(timeoutId)
            timeoutId = window.setTimeout(() => {
                localStorage.removeItem('pcms-user-id')
                logout()
            }, idleTimeoutMs)
        }

        const handleActivity = () => {
            scheduleLogout()
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                scheduleLogout()
            }
        }

        scheduleLogout()
        activityEvents.forEach(eventName => {
            window.addEventListener(eventName, handleActivity, {
                passive: true,
            })
        })
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            window.clearTimeout(timeoutId)
            activityEvents.forEach(eventName => {
                window.removeEventListener(eventName, handleActivity)
            })
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            )
        }
    }, [logout, user])

    if (!user) {
        return <Loading />
    }

    return (
        <div className="min-h-screen text-[var(--ink)]">
            <Navigation
                user={user}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={toggleSidebar}
            />

            <main className="appShellMain pb-12">{children}</main>
        </div>
    )
}

export default AppLayout
