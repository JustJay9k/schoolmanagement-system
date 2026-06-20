'use client'

import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import axios from '@/lib/axios'
import { canManageManagementWorkspace, formatRoleLabel, isTeacherUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const groupEntriesByDay = entries =>
    entries.reduce((groups, entry) => {
        if (!groups[entry.day_of_week]) {
            groups[entry.day_of_week] = []
        }

        groups[entry.day_of_week].push(entry)
        return groups
    }, {})

export default function TimetablesPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [timetables, setTimetables] = useState([])
    const [daysOfWeek, setDaysOfWeek] = useState({})
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState(null)

    const loadAssignedTimetables = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/teacher/timetables')

            setTimetables(response.data?.timetables ?? [])
            setDaysOfWeek(response.data?.daysOfWeek ?? {})
        } catch (error) {
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load assigned timetables.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !isTeacherUser(user)) {
            return
        }

        loadAssignedTimetables()
    }, [user])

    const totalPeriods = useMemo(
        () =>
            timetables.reduce(
                (count, timetable) => count + (timetable.entry_count ?? 0),
                0,
            ),
        [timetables],
    )
    const classLabel =
        user?.school_track === 'secondary' ? 'My form class' : 'My class'
    const classValue =
        user?.school_track === 'secondary'
            ? user?.assigned_class_name ?? 'Subject teacher only'
            : user?.assigned_class_name ?? 'Unassigned'

    if (!user) {
        return null
    }

    if (canManageManagementWorkspace(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Management"
                title="Timetables moved to Management"
                description="Head teacher timetable creation and editing now lives inside the dedicated management workspace.">
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Use the sidebar item at <strong>Management / Timetables</strong>{' '}
                        to create timetables, choose primary or secondary, and
                        assign each class timetable to a teacher.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    if (!isTeacherUser(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Teacher timetable view only"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only teacher accounts can view assigned class timetables here.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        System management stays with administrators, while timetable
                        publishing stays with management accounts.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Teacher workspace"
            title="My teaching timetable"
            description="This page shows your full form or class timetable where you are responsible for a class, plus any secondary subject periods allocated to you in other classes.">
            {status ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            status.type === 'error' ? managementStyles.dangerText : ''
                        }`}>
                        {status.message}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['Assigned timetables', timetables.length],
                    ['Total periods', totalPeriods],
                    [classLabel, classValue],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={workspaceStyles.panelGrid}>
                {loading ? (
                    <article className={workspaceStyles.fullPanel}>
                        <p className={managementStyles.muted}>Loading timetables...</p>
                    </article>
                ) : timetables.length ? (
                    timetables.map(timetable => {
                        const entriesByDay = groupEntriesByDay(timetable.entries ?? [])

                        return (
                            <article key={timetable.id} className={workspaceStyles.fullPanel}>
                                <div className={workspaceStyles.panelHeader}>
                                    <div>
                                        <p className={workspaceStyles.panelEyebrow}>
                                            {timetable.school_track_label}
                                        </p>
                                        <h2 className={workspaceStyles.panelTitle}>
                                            {timetable.title}
                                        </h2>
                                        <p className={managementStyles.cardMeta}>
                                            {timetable.class_name} · Published by{' '}
                                            {timetable.creator_name ?? 'System'}
                                        </p>
                                    </div>
                                    <span className={workspaceStyles.badge}>
                                        {timetable.entry_count} periods
                                    </span>
                                </div>

                                {timetable.notes ? (
                                    <p className={managementStyles.notice}>
                                        {timetable.notes}
                                    </p>
                                ) : null}

                                <div className={managementStyles.dayGrid}>
                                    {Object.entries(daysOfWeek).map(([dayValue, dayLabel]) => (
                                        <div
                                            key={`${timetable.id}-${dayValue}`}
                                            className={managementStyles.dayCard}>
                                            <h3>{dayLabel}</h3>
                                            {(entriesByDay[dayValue] ?? []).length ? (
                                                <div className={managementStyles.periodList}>
                                                    {entriesByDay[dayValue].map(entry => (
                                                        <div
                                                            key={entry.id}
                                                            className={managementStyles.periodItem}>
                                                            <strong>{entry.period_label}</strong>
                                                            <p>
                                                                {entry.subject?.name ??
                                                                    'Subject missing'}
                                                            </p>
                                                            <small>
                                                                {entry.start_time || '--:--'} -{' '}
                                                                {entry.end_time || '--:--'}
                                                                {entry.room
                                                                    ? ` · ${entry.room}`
                                                                    : ''}
                                                            </small>
                                                            {entry.notes ? (
                                                                <small>{entry.notes}</small>
                                                            ) : null}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className={managementStyles.muted}>
                                                    No periods saved.
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )
                    })
                ) : (
                    <article className={workspaceStyles.fullPanel}>
                        <p className={managementStyles.notice}>
                            No timetable has been assigned to your account yet.
                            Contact the head teacher if your class schedule should
                            already be available.
                        </p>
                    </article>
                )}
            </section>
        </WorkspacePageShell>
    )
}
