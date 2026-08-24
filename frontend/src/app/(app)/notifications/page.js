'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import styles from './notifications.module.css'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import { isManagementUser } from '@/lib/userAccess'
import Link from 'next/link'
import useSWR, { useSWRConfig } from 'swr'
import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import { useToast } from '@/components/ToastProvider'

const fetcher = url => axios.get(url).then(response => response.data)

const MAX_ATTACHMENTS = 5

const FILE_ACCEPT =
    '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx'

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

const formatFileSize = sizeInKb => {
    const size = Number(sizeInKb ?? 0)

    if (size >= 1024) {
        return `${(size / 1024).toFixed(1)} MB`
    }

    return `${Math.max(size, 1)} KB`
}

const createDraft = () => ({
    title: '',
    body: '',
    files: [],
})

const extractErrorMessage = error => {
    const errors = error?.response?.data?.errors

    if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0]

        if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey][0]) {
            return errors[firstKey][0]
        }
    }

    return error?.response?.data?.message ?? null
}

export default function NotificationsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { mutate } = useSWRConfig()
    const { showToast } = useToast()

    const canManageAnnouncements = isManagementUser(user)
    const [activeTab, setActiveTab] = useState('inbox')

    // Inbox state.
    const [status, setStatus] = useState(null)
    const [workingId, setWorkingId] = useState(null)

    // Announcement composer state.
    const [draft, setDraft] = useState(createDraft)
    const [publishing, setPublishing] = useState(false)
    const [announcementPendingDelete, setAnnouncementPendingDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const { data, isLoading } = useSWR(user ? '/api/notifications' : null, fetcher)
    const announcementsResponse = useSWR(
        canManageAnnouncements ? '/api/management/announcements' : null,
        fetcher,
    )

    const notifications = data?.notifications ?? []
    const summary = data?.summary ?? {
        total: notifications.length,
        unread: notifications.filter(item => !item.read_at).length,
        read: notifications.filter(item => item.read_at).length,
    }

    const announcements = announcementsResponse.data?.announcements ?? []
    const announcementStats = {
        posts: announcements.length,
        deliveries: announcements.reduce(
            (total, item) => total + Number(item.recipients_count ?? 0),
            0,
        ),
        files: announcements.reduce(
            (total, item) => total + (item.attachments?.length ?? 0),
            0,
        ),
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

    const updateDraft = (field, value) => {
        setDraft(current => ({
            ...current,
            [field]: value,
        }))
    }

    const addFiles = event => {
        const selected = Array.from(event.target.files ?? [])

        setDraft(current => ({
            ...current,
            files: [...current.files, ...selected].slice(0, MAX_ATTACHMENTS),
        }))
        event.target.value = ''
    }

    const removeFile = index => {
        setDraft(current => ({
            ...current,
            files: current.files.filter((_, position) => position !== index),
        }))
    }

    const publishAnnouncement = async event => {
        event.preventDefault()

        if (!draft.title.trim()) {
            return
        }

        setPublishing(true)

        const formData = new FormData()
        formData.append('title', draft.title.trim())
        formData.append('body', draft.body.trim())
        draft.files.forEach(file => formData.append('attachments[]', file))

        try {
            const response = await axios.post(
                '/api/management/announcements',
                formData,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Announcement published successfully.',
            })
            setDraft(createDraft())
            await Promise.all([
                mutate('/api/management/announcements'),
                mutate('/api/notifications'),
            ])
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    extractErrorMessage(error) ??
                    'Unable to publish this announcement right now.',
            })
        } finally {
            setPublishing(false)
        }
    }

    const deleteAnnouncement = async () => {
        if (!announcementPendingDelete) {
            return
        }

        setDeleting(true)

        try {
            const response = await axios.delete(
                `/api/management/announcements/${announcementPendingDelete.id}`,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ?? 'Announcement removed successfully.',
            })
            setAnnouncementPendingDelete(null)
            await mutate('/api/management/announcements')
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    extractErrorMessage(error) ??
                    'Unable to remove this announcement right now.',
            })
        } finally {
            setDeleting(false)
        }
    }

    const heroDescription = canManageAnnouncements
        ? 'Review alerts sent to your account, then switch to the announcements tab to post updates - plain text or supported with documents and pictures - to every guardian of your school.'
        : 'Review new alerts, revisit older messages, and keep a complete history of the notices and announcements sent to your account.'

    return (
        <WorkspacePageShell
            eyebrow="Workspace"
            title="Notifications and announcements"
            description={heroDescription}
            actions={
                summary.unread > 0 &&
                (!canManageAnnouncements || activeTab === 'inbox') ? (
                    <button
                        type="button"
                        onClick={markAllRead}
                        disabled={workingId === 'all'}
                        className={workspaceStyles.secondaryButton}>
                        {workingId === 'all' ? 'Updating...' : 'Mark all as read'}
                    </button>
                ) : null
            }>
            {canManageAnnouncements ? (
                <div className={styles.tabSwitch} role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'inbox'}
                        onClick={() => setActiveTab('inbox')}
                        className={`${styles.tabButton} ${
                            activeTab === 'inbox' ? styles.tabButtonActive : ''
                        }`}>
                        My notifications ({summary.unread} unread)
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'announcements'}
                        onClick={() => setActiveTab('announcements')}
                        className={`${styles.tabButton} ${
                            activeTab === 'announcements'
                                ? styles.tabButtonActive
                                : ''
                        }`}>
                        Guardian announcements
                    </button>
                </div>
            ) : null}

            {activeTab === 'inbox' || !canManageAnnouncements ? (
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
                        <p
                            className={`${styles.status} ${
                                status.type === 'error' ? styles.statusError : ''
                            }`}>
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

                                        {notification.attachments?.length ? (
                                            <div className={styles.attachmentList}>
                                                <span className={styles.attachmentLabel}>
                                                    Attachments
                                                </span>
                                                {notification.attachments.map(attachment => (
                                                    <a
                                                        key={attachment.id}
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={attachment.name}
                                                        className={styles.attachmentChip}>
                                                        <strong>
                                                            {attachment.is_image ? 'Image' : 'File'}
                                                        </strong>
                                                        <span>{attachment.name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : null}

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
            ) : (
                <section className={styles.stack}>
                    <div className={styles.summaryGrid}>
                        {[
                            ['Published posts', announcementStats.posts],
                            ['Guardian deliveries', announcementStats.deliveries],
                            ['Files shared', announcementStats.files],
                        ].map(([label, value]) => (
                            <article key={label} className={styles.summaryCard}>
                                <p className={styles.summaryLabel}>{label}</p>
                                <p className={styles.summaryValue}>{value}</p>
                            </article>
                        ))}
                    </div>

                    <article className={workspaceStyles.fullPanel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>New post</p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    Publish an announcement to guardians
                                </h2>
                            </div>
                        </div>

                        <form className={styles.composeGrid} onSubmit={publishAnnouncement}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Title
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    value={draft.title}
                                    onChange={event =>
                                        updateDraft('title', event.target.value)
                                    }
                                    placeholder="e.g. Mid-term parents meeting"
                                    maxLength={180}
                                    required
                                    disabled={publishing}
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Message</span>
                                <textarea
                                    value={draft.body}
                                    onChange={event =>
                                        updateDraft('body', event.target.value)
                                    }
                                    className={managementStyles.textarea}
                                    placeholder="Write the details guardians should know. You can also attach documents or pictures below."
                                    maxLength={5000}
                                    disabled={publishing}
                                />
                                <span className={managementStyles.fieldHint}>
                                    Text is optional as long as you attach at least one file.
                                </span>
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Documents and pictures
                                </span>
                                <Input
                                    type="file"
                                    multiple
                                    accept={FILE_ACCEPT}
                                    onChange={addFiles}
                                    disabled={
                                        publishing ||
                                        draft.files.length >= MAX_ATTACHMENTS
                                    }
                                />
                                <span className={managementStyles.fieldHint}>
                                    Up to {MAX_ATTACHMENTS} files, 10MB each. Images (jpg, png,
                                    gif, webp) and documents (pdf, doc(x), xls(x), csv, txt,
                                    ppt(x)).
                                </span>
                            </label>

                            {draft.files.length > 0 ? (
                                <div className={styles.attachmentList}>
                                    {draft.files.map((file, index) => (
                                        <span
                                            key={`${file.name}-${index}`}
                                            title={file.name}
                                            className={styles.attachmentChip}>
                                            <strong>
                                                {file.type.startsWith('image/')
                                                    ? 'Image'
                                                    : 'File'}
                                            </strong>
                                            <span>{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                disabled={publishing}
                                                className={styles.fileChipRemove}>
                                                Remove
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : null}

                            <p className={styles.metaNote}>
                                Delivered instantly to the notification inbox of every active
                                guardian of{' '}
                                {user?.school?.name ?? 'your school'}.
                            </p>

                            <div className={styles.actionsRow}>
                                <button
                                    type="submit"
                                    disabled={publishing}
                                    className={workspaceStyles.button}>
                                    {publishing
                                        ? 'Publishing...'
                                        : 'Publish to guardians'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDraft(createDraft())}
                                    disabled={publishing}
                                    className={workspaceStyles.secondaryButton}>
                                    Clear
                                </button>
                            </div>
                        </form>
                    </article>

                    <article className={workspaceStyles.fullPanel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>Post history</p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    Announcements sent to guardians
                                </h2>
                            </div>
                        </div>

                        <div className={styles.notificationList}>
                            {announcementsResponse.isLoading ? (
                                <p className={styles.status}>Loading announcements...</p>
                            ) : announcements.length === 0 ? (
                                <p className={styles.status}>
                                    You have not published any announcements yet. Use the
                                    composer above to send your first post.
                                </p>
                            ) : (
                                announcements.map(announcement => (
                                    <article
                                        key={announcement.id}
                                        className={styles.notificationCard}>
                                        <div className={styles.notificationHeader}>
                                            <div>
                                                <h3 className={styles.notificationTitle}>
                                                    {announcement.title}
                                                </h3>
                                                <p className={styles.notificationMeta}>
                                                    Published{' '}
                                                    {formatDate(announcement.created_at)}
                                                    {announcement.author_name
                                                        ? ` by ${announcement.author_name}`
                                                        : ''}
                                                </p>
                                            </div>

                                            <div className={styles.badgeRow}>
                                                <span className={styles.badge}>
                                                    Sent to {announcement.recipients_count}{' '}
                                                    guardian
                                                    {announcement.recipients_count === 1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            </div>
                                        </div>

                                        {announcement.body ? (
                                            <p className={styles.notificationBody}>
                                                {announcement.body}
                                            </p>
                                        ) : (
                                            <p className={styles.notificationBody}>
                                                No message body - see the attached files.
                                            </p>
                                        )}

                                        {announcement.attachments?.length ? (
                                            <div className={styles.attachmentList}>
                                                <span className={styles.attachmentLabel}>
                                                    Attachments
                                                </span>
                                                {announcement.attachments.map(attachment => (
                                                    <a
                                                        key={attachment.id}
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={attachment.name}
                                                        className={styles.attachmentChip}>
                                                        <strong>
                                                            {attachment.is_image
                                                                ? 'Image'
                                                                : 'File'}
                                                        </strong>
                                                        <span>{attachment.name}</span>
                                                        <small>
                                                            {formatFileSize(
                                                                attachment.size_in_kb,
                                                            )}
                                                        </small>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : null}

                                        <div className={styles.actionsRow}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAnnouncementPendingDelete(
                                                        announcement,
                                                    )
                                                }
                                                disabled={deleting}
                                                className={styles.dangerTextButton}>
                                                Delete post
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </article>

                    <ConfirmDialog
                        open={Boolean(announcementPendingDelete)}
                        eyebrow="Remove announcement"
                        title="Delete this announcement?"
                        message={`"${announcementPendingDelete?.title ?? ''}" will be removed along with its attachments. Guardians keep the copy in their inbox as a plain message.`}
                        confirmLabel="Delete announcement"
                        busyLabel="Deleting..."
                        tone="danger"
                        busy={deleting}
                        onClose={() => setAnnouncementPendingDelete(null)}
                        onConfirm={deleteAnnouncement}
                    />
                </section>
            )}
        </WorkspacePageShell>
    )
}
