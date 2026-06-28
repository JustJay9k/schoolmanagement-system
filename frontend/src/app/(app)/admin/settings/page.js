'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import adminStyles from '@/app/(app)/admin/admin-tools.module.css'
import { formatRoleLabel, isAdminUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'
import Link from 'next/link'

const systemModules = [
    {
        title: 'User access',
        detail: 'Manage staff accounts, roles, activation status, and school assignment rules.',
        href: '/admin/users',
        action: 'Open user accounts',
    },
    {
        title: 'School structure',
        detail: 'Maintain the primary and secondary class lists used during registration and teacher allocation.',
        href: '/admin/school-structure',
        action: 'Open school structure',
    },
    {
        title: 'Personal settings',
        detail: 'Profile photo, appearance preferences, and account-facing settings live in the personal settings area.',
        href: '/settings',
        action: 'Open personal settings',
    },
]

export default function AdminSystemSettingsPage() {
    const { user } = useAuth({ middleware: 'auth' })

    if (!user) {
        return null
    }

    if (!isAdminUser(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Administrator access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only administrator accounts can access system settings.`}
            >
                <article className={workspaceStyles.panel}>
                    <p className={adminStyles.message}>
                        Personal settings remain available from your standard settings page, but system-wide controls are restricted to administrators.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Administration"
            title="System settings"
            description="System-wide controls are separated from personal account preferences. Use this area for workspace-level administration, while profile and appearance live in personal settings."
        >
            <section className={workspaceStyles.panelGrid}>
                {systemModules.map(module => (
                    <article key={module.title} className={workspaceStyles.panel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>System module</p>
                                <h2 className={workspaceStyles.panelTitle}>{module.title}</h2>
                            </div>
                        </div>

                        <div className={workspaceStyles.list}>
                            <div className={workspaceStyles.listItem}>
                                <div>
                                    <strong>{module.title}</strong>
                                    <p>{module.detail}</p>
                                </div>
                            </div>
                        </div>

                        <div className={workspaceStyles.actions}>
                            <Link href={module.href} className={workspaceStyles.secondaryButton}>
                                {module.action}
                            </Link>
                        </div>
                    </article>
                ))}
            </section>
        </WorkspacePageShell>
    )
}
