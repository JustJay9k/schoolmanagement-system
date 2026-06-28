'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import styles from './notifications.module.css'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import Link from 'next/link'
import useSWR, { useSWRConfig } from 'swr'
import { useState } from 'react'

const fetcher = url => axios.get(url).then(response => response.data)

const formatDate = value => {
    if (!value) {
        return 'Unknown time'
    }

    return new Date(value).toLocaleString()
}

const levelClassMap = {
    info: styles.badge,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
}

export default function NotificationsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { mutate } = useSWRConfig()
    const [status, setStatus] = useState(null)
    const [workingId, setWorkingId] = useState(null)

    const { data, isLoading } = useSWR(user ? '/api/notifications' : null, fetcher)

    const notifications = data?.notifications ?? []
    const summary = data?.summary ?? {
        total: notifications.length,
        unread: notifications.filter(item => !item.read_at).length,
        read: notifications.filter(item => item.read_at).length,
    }

    const refreshNotifications = async () => {
        await mutate('/api/notifications')
    }

    const markAllRead = async () => {
        setWorkingId('all')
        setStatus(null)

        try {
            await axios.patch('/api/notifications/read-all')
            await refreshNotifications()
            setStatus({
                type: 'success',
                message: 'All notifications marked as read.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update notifications right now.',
            })
        } finally {
            setWorkingId(null)
        }
    }

    const markRead = async notificationId => {
        setWorkingId(notificationId)
        setStatus(null)

        try {
            await axios.patch(`/api/notifications/${notificationId}/read`)
            await refreshNotifications()
        } catch (error) {
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update this notification right now.',
            })
        } finally {
            setWorkingId(null)
        }
    }

    return (
        <WorkspacePageShell
            eyebrow="Workspace"
            title="Notifications and announcements"
            description="Review new alerts, revisit older messages, and keep a complete history of the notices and announcements sent to your account."
            actions={
                summary.unread > 0 ? (
                    <button
                        type="button"
                        onClick={markAllRead}
                        disabled={workingId === 'all'}
                        className={workspaceStyles.secondaryButton}>
                        {workingId === 'all' ? 'Updating...' : 'Mark all as read'}
                    </button>
                ) : null
            }>
            <section className={styles.stack}>
                <div className={styles.summaryGrid}>
                    {[
                        ['Total notifications', summary.total ?? 0],
                        ['Unread', summary.unread ?? 0],
                        ['Read history', summary.read ?? 0],
                    ].map(([label, value]) => (
                        <article key={label} className={styles.summaryCard}>
                            <p className={styles.summaryLabel}>{label}</p>
                            <p className={styles.summaryValue}>{value}</p>
                        </article>
                    ))}
                </div>

                {status ? (
                    <p className={`${styles.status} ${status.type === 'error' ? styles.statusError : ''}`}>
                        {status.message}
                    </p>
                ) : null}

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Activity feed</p>
                            <h2 className={workspaceStyles.panelTitle}>All received notifications</h2>
                        </div>
                    </div>

                    <div className={styles.notificationList}>
                        {isLoading ? (
                            <p className={styles.status}>Loading notifications...</p>
                        ) : notifications.length === 0 ? (
                            <p className={styles.status}>
                                No notifications have been sent to this account yet.
                            </p>
                        ) : (
                            notifications.map(notification => (
                                <article
                                    key={notification.id}
                                    className={`${styles.notificationCard} ${
                                        notification.read_at ? '' : styles.notificationUnread
                                    }`}>
                                    <div className={styles.notificationHeader}>
                                        <div>
                                            <h3 className={styles.notificationTitle}>
                                                {notification.title}
                                            </h3>
                                            <p className={styles.notificationMeta}>
                                                Received {formatDate(notification.created_at)}
                                            </p>
                                        </div>

                                        <div className={styles.badgeRow}>
                                            <span
                                                className={
                                                    levelClassMap[notification.level] ?? styles.badge
                                                }>
                                                {notification.level}
                                            </span>
                                            <span
                                                className={
                                                    notification.read_at
                                                        ? styles.badgeRead
                                                        : styles.badge
                                                }>
                                                {notification.read_at ? 'Read' : 'Unread'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className={styles.notificationBody}>
                                        {notification.message}
                                    </p>

                                    <div className={styles.actionsRow}>
                                        {!notification.read_at ? (
                                            <button
                                                type="button"
                                                onClick={() => markRead(notification.id)}
                                                disabled={workingId === notification.id}
                                                className={workspaceStyles.secondaryButton}>
                                                {workingId === notification.id
                                                    ? 'Saving...'
                                                    : 'Mark as read'}
                                            </button>
                                        ) : null}

                                        {notification.action_url ? (
                                            <Link
                                                href={notification.action_url}
                                                className={workspaceStyles.button}>
                                                Open related page
                                            </Link>
                                        ) : null}
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
