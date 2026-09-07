'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import axios from '@/lib/axios'
import {
    canManageManagementWorkspace,
    formatRoleLabel,
} from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'
import styles from './repository.module.css'

const termPills = [
    { value: 'all', label: 'All terms' },
    { value: 'first', label: 'First Term' },
    { value: 'second', label: 'Second Term' },
    { value: 'third', label: 'Third Term' },
]

const formatAverage = value => (value !== null && value !== undefined ? `${value}%` : '—')

export default function RepositoryPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [students, setStudents] = useState([])
    const [classesByTrack, setClassesByTrack] = useState({})
    const [tracks, setTracks] = useState({})
    const [termLabels, setTermLabels] = useState({})
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [termFilter, setTermFilter] = useState('all')
    const [trackFilter, setTrackFilter] = useState('')
    const [classFilter, setClassFilter] = useState('')
    const [expanded, setExpanded] = useState({})

    const loadRepository = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/management/repository-records')

            setStudents(response.data?.students ?? [])
            setTracks(response.data?.tracks ?? {})
            setClassesByTrack(response.data?.classesByTrack ?? {})
            setTermLabels(response.data?.termLabels ?? {})
            setStats(response.data?.stats ?? null)
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load the grade repository.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageManagementWorkspace(user)) {
            return
        }

        loadRepository()
    }, [user])

    const availableClasses = useMemo(
        () =>
            trackFilter
                ? classesByTrack[trackFilter] ?? []
                : Object.values(classesByTrack).flat(),
        [trackFilter, classesByTrack],
    )

    const visibleStudents = useMemo(() => {
        return students.filter(student => {
            if (trackFilter && student.school_track !== trackFilter) {
                return false
            }

            if (classFilter && student.class_name !== classFilter) {
                return false
            }

            if (termFilter !== 'all') {
                const termAverage = student.term_averages?.[termFilter]

                if (termAverage === null || termAverage === undefined) {
                    return false
                }
            }

            return true
        })
    }, [students, trackFilter, classFilter, termFilter])

    const groups = useMemo(() => {
        const grouped = {}

        for (const student of visibleStudents) {
            const key = `${student.school_track}::${student.class_name}`
            const label = `${student.school_track_label ?? student.school_track} • ${student.class_name}`

            ;(grouped[key] ??= { label, students: [] }).students.push(student)
        }

        return Object.values(grouped).sort((a, b) =>
            a.label.localeCompare(b.label),
        )
    }, [visibleStudents])

    const toggleExpanded = studentId => {
        setExpanded(current => ({
            ...current,
            [studentId]: !current[studentId],
        }))
    }

    if (!user) {
        return null
    }

    if (!canManageManagementWorkspace(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Repository"
                title="Grade repository access required"
                description={`This account is signed in as ${formatRoleLabel(
                    user?.role,
                )}. Only head teacher accounts can browse the grade repository.`}
            >
                <article className={workspaceStyles.panel}>
                    <p className={styles.repoMessage}>
                        The repository keeps every learner&apos;s grades even
                        after promotion, so the school can always review
                        previous performance.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Records archive"
            title="Grade repository"
            description="Browse every saved learner grade across all terms and classes. Grades stay in the repository after learners are promoted to a new class."
            actions={
                <button
                    type="button"
                    onClick={loadRepository}
                    disabled={loading}
                    className={workspaceStyles.secondaryButton}
                >
                    Refresh
                </button>
            }
        >
            <section className={workspaceStyles.statGrid}>
                {[
                    ['Learners on record', stats?.total_students ?? 0],
                    ['Saved grade records', stats?.total_records ?? 0],
                    [
                        'Class groups in view',
                        groups.length,
                    ],
                ].map(([label, value]) => (
                    <article
                        key={label}
                        className={workspaceStyles.statCard}
                    >
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={styles.toolbarPanel}>
                <div className={styles.toolbarRow}>
                    <div className={managementStyles.field}>
                        <span className={managementStyles.fieldLabel}>Track</span>
                        <select
                            value={trackFilter}
                            onChange={event => {
                                setTrackFilter(event.target.value)
                                setClassFilter('')
                            }}
                            className={managementStyles.select}
                        >
                            <option value="">All tracks</option>
                            {Object.entries(tracks).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={managementStyles.field}>
                        <span className={managementStyles.fieldLabel}>Class</span>
                        <select
                            value={classFilter}
                            onChange={event =>
                                setClassFilter(event.target.value)
                            }
                            disabled={!trackFilter}
                            className={managementStyles.select}
                        >
                            <option value="">All classes</option>
                            {availableClasses.map(className => (
                                <option key={className} value={className}>
                                    {className}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.termPillRow} role="group" aria-label="Filter by term">
                    {termPills.map(pill => (
                        <button
                            key={pill.value}
                            type="button"
                            onClick={() => setTermFilter(pill.value)}
                            className={`${styles.termPill} ${
                                termFilter === pill.value
                                    ? styles.termPillActive
                                    : ''
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </section>

            {loadError ? (
                <div className={`${styles.statusBar} ${styles.statusError}`}>
                    {loadError}
                </div>
            ) : null}

            {loading ? (
                <p className={styles.repoMessage}>
                    Loading the grade repository...
                </p>
            ) : groups.length === 0 ? (
                <p className={styles.repoMessage}>
                    No saved grades match the current filters.
                </p>
            ) : (
                groups.map(group => (
                    <section
                        key={group.label}
                        className={styles.classBlock}
                    >
                        <div className={styles.classHeader}>
                            <h2>{group.label}</h2>
                            <span className={styles.classCount}>
                                {group.students.length}{' '}
                                {group.students.length === 1
                                    ? 'learner'
                                    : 'learners'}
                            </span>
                        </div>

                        <div className={styles.tableWrap}>
                            <table className={workspaceStyles.table}>
                                <thead>
                                    <tr>
                                        <th />
                                        <th>Learner</th>
                                        <th>First term</th>
                                        <th>Second term</th>
                                        <th>Third term</th>
                                        <th>Overall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.students.map(student => (
                                        <Fragment key={student.id}>
                                            <tr
                                                className={
                                                    styles.studentRow
                                                }
                                                onClick={() =>
                                                    toggleExpanded(student.id)
                                                }
                                            >
                                                <td>
                                                    <button
                                                        type="button"
                                                        aria-expanded={Boolean(
                                                            expanded[student.id],
                                                        )}
                                                        aria-label={`${
                                                            expanded[student.id]
                                                                ? 'Hide'
                                                                : 'Show'
                                                        } ${student.full_name} grade detail`}
                                                        onClick={event => {
                                                            event.stopPropagation()
                                                            toggleExpanded(
                                                                student.id,
                                                            )
                                                        }}
                                                        className={
                                                            styles.expandButton
                                                        }
                                                    >
                                                        {expanded[student.id]
                                                            ? '−'
                                                            : '+'}
                                                    </button>
                                                </td>
                                                <td>
                                                    <strong>
                                                        {student.full_name}
                                                    </strong>
                                                    <span
                                                        className={
                                                            styles.studentMeta
                                                        }
                                                    >
                                                        {student.sex ??
                                                            '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatAverage(
                                                        student.term_averages
                                                            ?.first,
                                                    )}
                                                </td>
                                                <td>
                                                    {formatAverage(
                                                        student.term_averages
                                                            ?.second,
                                                    )}
                                                </td>
                                                <td>
                                                    {formatAverage(
                                                        student.term_averages
                                                            ?.third,
                                                    )}
                                                </td>
                                                <td className={styles.overall}>
                                                    {formatAverage(
                                                        student.overall_average,
                                                    )}
                                                </td>
                                            </tr>

                                            {expanded[student.id] ? (
                                                <tr className={styles.detailRow}>
                                                    <td colSpan="6">
                                                        <div
                                                            className={
                                                                styles.detailInner
                                                            }
                                                        >
                                                            {student.periods
                                                                .length === 0 ? (
                                                                <p
                                                                    className={
                                                                        styles.detailEmpty
                                                                    }
                                                                >
                                                                    No saved
                                                                    grade
                                                                    records for
                                                                    this learner.
                                                                </p>
                                                            ) : (
                                                                student.periods.map(
                                                                    period => (
                                                                        <article
                                                                            key={
                                                                                period.id
                                                                            }
                                                                            className={
                                                                                styles.periodCard
                                                                            }
                                                                        >
                                                                            <div
                                                                                className={
                                                                                    styles.periodHeader
                                                                                }
                                                                            >
                                                                                <div>
                                                                                    <p>
                                                                                        {
                                                                                            period.term_label
                                                                                        }
                                                                                    </p>
                                                                                    <h3>
                                                                                        {
                                                                                            period.assessment_period_name
                                                                                        }
                                                                                    </h3>
                                                                                </div>
                                                                                <span
                                                                                    className={`${
                                                                                        styles.statusChip
                                                                                    } ${
                                                                                        period.status ===
                                                                                        'approved'
                                                                                            ? styles.statusApproved
                                                                                            : period.status ===
                                                                                                'submitted'
                                                                                              ? styles.statusSubmitted
                                                                                              : styles.statusDraft
                                                                                    }`}
                                                                                >
                                                                                    {
                                                                                        period.status
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <div
                                                                                className={
                                                                                    styles.subjectChipList
                                                                                }
                                                                            >
                                                                                {(
                                                                                    period.subject_grades ??
                                                                                    []
                                                                                ).map(subject => (
                                                                                    <span
                                                                                        key={
                                                                                            subject.subject_id
                                                                                        }
                                                                                        className={
                                                                                            styles.subjectChip
                                                                                        }
                                                                                    >
                                                                                        <span>
                                                                                            {
                                                                                                subject.subject_name
                                                                                            }
                                                                                        </span>
                                                                                        <strong>
                                                                                            {
                                                                                                subject.grade
                                                                                            }
                                                                                        </strong>
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                            {period.comment ? (
                                                                                <p
                                                                                    className={
                                                                                        styles.periodComment
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        period.comment
                                                                                    }
                                                                                </p>
                                                                            ) : null}
                                                                        </article>
                                                                    ),
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))
            )}
        </WorkspacePageShell>
    )
}