'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import styles from './settings.module.css'
import { useTheme } from '@/components/ThemeProvider'
import { useAuth } from '@/hooks/auth'
import Button from '@/components/Button'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import { formatRoleLabel } from '@/lib/userAccess'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useSWRConfig } from 'swr'

const SunIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={workspaceStyles.themeIcon}>
        <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
            d="M12 4.5V3M12 21v-1.5M19.5 12H21M3 12h1.5M17.2 6.8 18.3 5.7M5.7 18.3 6.8 17.2M17.2 17.2l1.1 1.1M5.7 5.7 6.8 6.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        />
    </svg>
)

const MoonIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={workspaceStyles.themeIcon}>
        <path
            d="M18 15.5A7.5 7.5 0 0 1 8.5 6a8 8 0 1 0 9.5 9.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
        />
    </svg>
)

export default function SettingsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { theme, setTheme, accent, setAccent, accentThemes } = useTheme()
    const { mutate } = useSWRConfig()
    const activeAccent = accentThemes.find(option => option.id === accent)
    const [selectedFile, setSelectedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [formErrors, setFormErrors] = useState({})
    const [status, setStatus] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null)
            return undefined
        }

        const objectUrl = URL.createObjectURL(selectedFile)
        setPreviewUrl(objectUrl)

        return () => {
            URL.revokeObjectURL(objectUrl)
        }
    }, [selectedFile])

    const avatarLetters = useMemo(
        () =>
            (user?.name ?? 'U')
                .split(' ')
                .slice(0, 2)
                .map(part => part[0])
                .join(''),
        [user?.name],
    )

    const currentAvatar = previewUrl || user?.profile_photo_url || null

    const submitProfilePhoto = async event => {
        event.preventDefault()
        setSaving(true)
        setFormErrors({})
        setStatus(null)

        try {
            const payload = new FormData()

            if (selectedFile) {
                payload.append('profile_photo', selectedFile)
            }

            await axios.post('/api/settings/profile', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            await mutate('/api/user')
            setSelectedFile(null)
            setStatus({
                type: 'success',
                message: 'Profile photo updated successfully.',
            })
        } catch (error) {
            setFormErrors(error?.response?.data?.errors ?? {})
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update your profile photo right now.',
            })
        } finally {
            setSaving(false)
        }
    }

    const removeProfilePhoto = async () => {
        setSaving(true)
        setFormErrors({})
        setStatus(null)

        try {
            const payload = new FormData()
            payload.append('remove_profile_photo', '1')

            await axios.post('/api/settings/profile', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            await mutate('/api/user')
            setSelectedFile(null)
            setPreviewUrl(null)
            setStatus({
                type: 'success',
                message: 'Profile photo removed successfully.',
            })
        } catch (error) {
            setFormErrors(error?.response?.data?.errors ?? {})
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to remove your profile photo right now.',
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <WorkspacePageShell
            eyebrow="Personal Settings"
            title="Profile and appearance"
            description="Manage your own account-facing preferences here. System-wide administration is kept separate so profile photo, theme, and personal presentation stay in one place."
        >
            <section className={workspaceStyles.panelGrid}>
                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Account</p>
                            <h2 className={workspaceStyles.panelTitle}>Personal profile</h2>
                        </div>
                        <span className={workspaceStyles.badge}>{formatRoleLabel(user?.role)}</span>
                    </div>

                    <div className={styles.profileGrid}>
                        <div className={styles.profileHeader}>
                            <div className={styles.avatarWrap}>
                                {currentAvatar ? (
                                    <Image
                                        src={currentAvatar}
                                        alt={`${user?.name ?? 'User'} profile`}
                                        className={styles.avatar}
                                        fill
                                        sizes="88px"
                                        unoptimized
                                    />
                                ) : (
                                    <div className={styles.avatarFallback}>{avatarLetters}</div>
                                )}
                            </div>

                            <div className={styles.profileMeta}>
                                <p className={styles.profileName}>{user?.name}</p>
                                <p className={styles.profileRole}>{user?.email}</p>
                                <p className={styles.profileSchool}>
                                    {user?.school?.name ?? user?.school_name ?? 'School not assigned'}
                                </p>
                            </div>
                        </div>

                        {status ? (
                            <p
                                className={`${styles.status} ${
                                    status.type === 'error' ? styles.statusError : ''
                                }`}>
                                {status.message}
                            </p>
                        ) : null}

                        <form onSubmit={submitProfilePhoto} className={styles.profileCard}>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className={styles.fileInput}
                                onChange={event =>
                                    setSelectedFile(event.target.files?.[0] ?? null)
                                }
                            />
                            <InputError messages={formErrors.profile_photo} />

                            <div className={styles.uploadActions}>
                                <Button disabled={saving || !selectedFile}>
                                    {saving ? 'Saving...' : 'Upload profile photo'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={removeProfilePhoto}
                                    disabled={saving || (!user?.profile_photo_url && !previewUrl)}
                                    className={workspaceStyles.secondaryButton}>
                                    Remove photo
                                </button>
                            </div>
                        </form>

                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryCard}>
                                <p className={styles.summaryLabel}>Role</p>
                                <p className={styles.summaryValue}>{formatRoleLabel(user?.role)}</p>
                            </div>
                            <div className={styles.summaryCard}>
                                <p className={styles.summaryLabel}>School</p>
                                <p className={styles.summaryValue}>
                                    {user?.school?.name ?? user?.school_name ?? 'Not assigned'}
                                </p>
                            </div>
                            <div className={styles.summaryCard}>
                                <p className={styles.summaryLabel}>Email status</p>
                                <p className={styles.summaryValue}>
                                    {user?.email_verified_at ? 'Verified' : 'Pending verification'}
                                </p>
                            </div>
                        </div>
                    </div>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Appearance</p>
                            <h2 className={workspaceStyles.panelTitle}>Theme mode</h2>
                        </div>
                        <span className={workspaceStyles.badge}>
                            {theme === 'dark' ? 'Dark enabled' : 'Light enabled'}
                        </span>
                    </div>

                    <div className={workspaceStyles.themeSwitch} role="group" aria-label="Theme selector">
                        <button
                            type="button"
                            onClick={() => setTheme('light')}
                            aria-pressed={theme === 'light'}
                            className={`${workspaceStyles.themeButton} ${
                                theme === 'light' ? workspaceStyles.themeButtonActive : ''
                            }`}>
                            <SunIcon />
                            <span>Light</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            aria-pressed={theme === 'dark'}
                            className={`${workspaceStyles.themeButton} ${
                                theme === 'dark' ? workspaceStyles.themeButtonActive : ''
                            }`}>
                            <MoonIcon />
                            <span>Dark</span>
                        </button>
                    </div>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Theme color</p>
                            <h2 className={workspaceStyles.panelTitle}>Accent palette</h2>
                        </div>
                        <span className={workspaceStyles.badge}>
                            {activeAccent?.label ?? 'Teal'} selected
                        </span>
                    </div>

                    <div
                        className={workspaceStyles.paletteGrid}
                        role="group"
                        aria-label="Accent palette selector">
                        {accentThemes.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setAccent(option.id)}
                                aria-pressed={accent === option.id}
                                className={`${workspaceStyles.paletteButton} ${
                                    accent === option.id
                                        ? workspaceStyles.paletteButtonActive
                                        : ''
                                }`}>
                                <div
                                    className={workspaceStyles.paletteSwatch}
                                    style={{
                                        background: `linear-gradient(135deg, ${option.accent} 0%, ${option.accentStrong} 100%)`,
                                    }}
                                />
                                <div className={workspaceStyles.paletteMeta}>
                                    <strong>{option.label}</strong>
                                    <span>
                                        Applies to buttons, highlights, and active
                                        states.
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </article>

            </section>
        </WorkspacePageShell>
    )
}
