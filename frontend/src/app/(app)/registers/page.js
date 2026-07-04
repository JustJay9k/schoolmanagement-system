'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import registerStyles from './registers.module.css'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import { useToast } from '@/components/ToastProvider'
import {
    canManageManagementWorkspace,
    formatRoleLabel,
} from '@/lib/userAccess'

const createEmptyTrackSchedule = labelPrefix => [
    {
        label: `${labelPrefix} 1`,
        registration_enabled: true,
        start_time: '',
        end_time: '',
    },
]

export default function RegistersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const [scheduleByTrack, setScheduleByTrack] = useState(null)
    const [defaultScheduleByTrack, setDefaultScheduleByTrack] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useState(null)

    const managementMode = canManageManagementWorkspace(user)

    const loadSchedule = async () => {
        if (!managementMode) {
            setLoading(false)
            return
        }

        setLoading(true)

        try {
            const response = await axios.get('/api/management/register-schedule')

            setScheduleByTrack(response.data?.scheduleByTrack ?? null)
            setDefaultScheduleByTrack(response.data?.defaultScheduleByTrack ?? null)
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load register settings right now.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user) {
            return
        }

        loadSchedule()
    }, [managementMode, user])

    const updatePeriod = (track, index, field, value) => {
        setScheduleByTrack(current => ({
            ...current,
            [track]: (current?.[track] ?? []).map((period, periodIndex) =>
                periodIndex === index ? { ...period, [field]: value } : period,
            ),
        }))
    }

    const addPeriod = track => {
        setScheduleByTrack(current => ({
            ...current,
            [track]: [
                ...(current?.[track] ?? []),
                {
                    label: track === 'primary' ? 'Block period' : 'Period',
                    registration_enabled: false,
                    start_time: '',
                    end_time: '',
                },
            ],
        }))
    }

    const removePeriod = (track, index) => {
        setScheduleByTrack(current => {
            const periods = current?.[track] ?? []

            return {
                ...current,
                [track]:
                    periods.length === 1
                        ? periods
                        : periods.filter((_, periodIndex) => periodIndex !== index),
            }
        })
    }

    const resetToDefault = () => {
        setScheduleByTrack(
            defaultScheduleByTrack ?? {
                primary: createEmptyTrackSchedule('Primary period'),
                secondary: createEmptyTrackSchedule('Secondary period'),
            },
        )
    }

    const saveSchedule = async () => {
        setSaving(true)

        try {
            const response = await axios.put('/api/management/register-schedule', {
                schedule_by_track: scheduleByTrack,
            })

            setScheduleByTrack(response.data?.scheduleByTrack ?? scheduleByTrack)
            setLoadError(null)
            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Register schedule updated successfully.',
            })
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.errors?.schedule_by_track?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to update the register schedule.',
            })
        } finally {
            setSaving(false)
        }
    }

    const summaryCards = useMemo(() => {
        const primaryPeriods = scheduleByTrack?.primary ?? []
        const secondaryPeriods = scheduleByTrack?.secondary ?? []

        return [
            ['Primary periods', primaryPeriods.length],
            [
                'Primary register windows',
                primaryPeriods.filter(period => period.registration_enabled).length,
            ],
            ['Secondary periods', secondaryPeriods.length],
            [
                'Secondary register windows',
                secondaryPeriods.filter(period => period.registration_enabled).length,
            ],
        ]
    }, [scheduleByTrack])

    if (!user) {
        return null
    }

    return (
        <WorkspacePageShell
            eyebrow="Register Centre"
            title="Attendance register workflows"
            description={
                managementMode
                    ? 'Head teachers can control how many periods each track has and decide exactly which periods should appear as live registration windows on the teacher dashboard.'
                    : 'Open the live teacher register, review attendance reporting, and manage register-related work without relying on demo dashboard data.'
            }
            actions={
                <>
                    <Link href="/dashboard" className={workspaceStyles.button}>
                        Open live register
                    </Link>
                    <Link
                        href="/attendance-reports"
                        className={workspaceStyles.secondaryButton}>
                        View reports
                    </Link>
                </>
            }>
            {managementMode ? (
                <section className={registerStyles.stack}>
                    {loadError ? (
                        <article className={workspaceStyles.fullPanel}>
                            <p
                                className={`${managementStyles.notice} ${managementStyles.dangerText}`}>
                                {loadError}
                            </p>
                        </article>
                    ) : null}

                    <section className={managementStyles.statsGrid}>
                        {summaryCards.map(([label, value]) => (
                            <article key={label} className={workspaceStyles.statCard}>
                                <p className={workspaceStyles.statLabel}>{label}</p>
                                <p className={workspaceStyles.statValue}>{value}</p>
                            </article>
                        ))}
                    </section>

                    <section className={workspaceStyles.panelGrid}>
                        <article className={workspaceStyles.fullPanel}>
                            <div className={workspaceStyles.panelHeader}>
                                <div>
                                    <p className={workspaceStyles.panelEyebrow}>
                                        Management
                                    </p>
                                    <h2 className={workspaceStyles.panelTitle}>
                                        Daily registration schedule
                                    </h2>
                                </div>
                            </div>

                            {loading || !scheduleByTrack ? (
                                <p className={managementStyles.muted}>
                                    Loading register configuration...
                                </p>
                            ) : (
                                <div className={registerStyles.trackGrid}>
                                    {[
                                        ['primary', 'Primary section'],
                                        ['secondary', 'Secondary section'],
                                    ].map(([track, label]) => (
                                        <article
                                            key={track}
                                            className={registerStyles.trackPanel}>
                                            <div className={registerStyles.trackHeader}>
                                                <div>
                                                    <p className={workspaceStyles.panelEyebrow}>
                                                        {label}
                                                    </p>
                                                    <h3 className={registerStyles.trackTitle}>
                                                        {label} periods
                                                    </h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addPeriod(track)}
                                                    className={
                                                        managementStyles.secondaryButton
                                                    }>
                                                    Add period
                                                </button>
                                            </div>

                                            <div className={registerStyles.periodGrid}>
                                                {(scheduleByTrack?.[track] ?? []).map(
                                                    (period, index) => (
                                                        <div
                                                            key={`${track}-${index}`}
                                                            className={
                                                                registerStyles.periodCard
                                                            }>
                                                            <div
                                                                className={
                                                                    registerStyles.periodCardHeader
                                                                }>
                                                                <span
                                                                    className={
                                                                        workspaceStyles.badge
                                                                    }>
                                                                    Period {index + 1}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removePeriod(track, index)
                                                                    }
                                                                    disabled={
                                                                        (scheduleByTrack?.[
                                                                            track
                                                                        ] ?? []).length === 1
                                                                    }
                                                                    className={
                                                                        managementStyles.dangerButton
                                                                    }>
                                                                    Remove
                                                                </button>
                                                            </div>

                                                            <label
                                                                className={managementStyles.field}>
                                                                <span
                                                                    className={
                                                                        managementStyles.fieldLabel
                                                                    }>
                                                                    Period label
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    value={period.label}
                                                                    onChange={event =>
                                                                        updatePeriod(
                                                                            track,
                                                                            index,
                                                                            'label',
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    className={
                                                                        registerStyles.periodInput
                                                                    }
                                                                />
                                                            </label>

                                                            <div
                                                                className={
                                                                    registerStyles.timeGrid
                                                                }>
                                                                <label
                                                                    className={
                                                                        managementStyles.field
                                                                    }>
                                                                    <span
                                                                        className={
                                                                            managementStyles.fieldLabel
                                                                        }>
                                                                        Start time
                                                                    </span>
                                                                    <input
                                                                        type="time"
                                                                        value={
                                                                            period.start_time ??
                                                                            ''
                                                                        }
                                                                        onChange={event =>
                                                                            updatePeriod(
                                                                                track,
                                                                                index,
                                                                                'start_time',
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        className={
                                                                            registerStyles.periodInput
                                                                        }
                                                                    />
                                                                </label>

                                                                <label
                                                                    className={
                                                                        managementStyles.field
                                                                    }>
                                                                    <span
                                                                        className={
                                                                            managementStyles.fieldLabel
                                                                        }>
                                                                        End time
                                                                    </span>
                                                                    <input
                                                                        type="time"
                                                                        value={
                                                                            period.end_time ??
                                                                            ''
                                                                        }
                                                                        onChange={event =>
                                                                            updatePeriod(
                                                                                track,
                                                                                index,
                                                                                'end_time',
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        className={
                                                                            registerStyles.periodInput
                                                                        }
                                                                    />
                                                                </label>
                                                            </div>

                                                            <label
                                                                className={
                                                                    registerStyles.toggleRow
                                                                }>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(
                                                                        period.registration_enabled,
                                                                    )}
                                                                    onChange={event =>
                                                                        updatePeriod(
                                                                            track,
                                                                            index,
                                                                            'registration_enabled',
                                                                            event.target.checked,
                                                                        )
                                                                    }
                                                                    className={
                                                                        registerStyles.toggleInput
                                                                    }
                                                                />
                                                                <span>
                                                                    <strong>
                                                                        Use this period
                                                                        for attendance
                                                                        registration
                                                                    </strong>
                                                                    <small>
                                                                        Enabled
                                                                        periods
                                                                        appear as
                                                                        register
                                                                        columns on
                                                                        teacher
                                                                        dashboards.
                                                                    </small>
                                                                </span>
                                                            </label>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}

                            <div className={managementStyles.actions}>
                                <button
                                    type="button"
                                    onClick={saveSchedule}
                                    disabled={loading || saving || !scheduleByTrack}
                                    className={workspaceStyles.button}>
                                    {saving ? 'Saving...' : 'Save register schedule'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetToDefault}
                                    disabled={loading || saving || !defaultScheduleByTrack}
                                    className={managementStyles.secondaryButton}>
                                    Reset to defaults
                                </button>
                                <button
                                    type="button"
                                    onClick={loadSchedule}
                                    disabled={loading || saving}
                                    className={managementStyles.secondaryButton}>
                                    Refresh
                                </button>
                            </div>
                        </article>

                    </section>
                </section>
            ) : (
                <section className={workspaceStyles.panelGrid}>
                    <article className={workspaceStyles.panel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Register Entry
                                </p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    Capture attendance in the dashboard
                                </h2>
                            </div>
                        </div>

                        <div className={workspaceStyles.list}>
                            <div className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Teachers</strong>
                                    <p>
                                        Use the main dashboard to mark attendance and
                                        add quick student notes for the assigned class.
                                    </p>
                                </div>
                            </div>

                            <div className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Head teachers</strong>
                                    <p>
                                        This account is signed in as{' '}
                                        {formatRoleLabel(user?.role)}. Head teacher
                                        accounts can configure daily register
                                        periods here.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className={workspaceStyles.panel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Related Pages
                                </p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    Where register work now lives
                                </h2>
                            </div>
                        </div>

                        <div className={workspaceStyles.list}>
                            <Link href="/dashboard" className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Dashboard</strong>
                                    <p>
                                        Live teacher register entry and learner
                                        profile view.
                                    </p>
                                </div>
                            </Link>

                            <Link
                                href="/attendance-reports"
                                className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Attendance Reports</strong>
                                    <p>
                                        Attendance reporting workspace and export
                                        destination.
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </article>
                </section>
            )}
        </WorkspacePageShell>
    )
}
