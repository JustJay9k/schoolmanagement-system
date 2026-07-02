'use client'

import { useEffect, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import Input from '@/components/Input'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import { canManageGradebook, formatRoleLabel } from '@/lib/userAccess'
import styles from './gradebook.module.css'

const createSubjectGradeMap = subjectGrades =>
    Object.fromEntries(
        (subjectGrades ?? []).map(subjectGrade => [
            String(subjectGrade.subject_id),
            subjectGrade.grade ?? '',
        ]),
    )

const createDrafts = students =>
    Object.fromEntries(
        students.map(student => [
            student.id,
            {
                subjectGrades: createSubjectGradeMap(
                    student.performance?.subject_grades ?? [],
                ),
                comment: student.performance?.comment ?? '',
            },
        ]),
    )

const getTrackSubjects = (options, schoolTrack) =>
    schoolTrack ? options?.subjectsByTrack?.[schoolTrack] ?? [] : []

export default function GradebookPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [filters, setFilters] = useState({
        school_track: '',
        class_name: '',
    })
    const [students, setStudents] = useState([])
    const [stats, setStats] = useState(null)
    const [scope, setScope] = useState(null)
    const [options, setOptions] = useState(null)
    const [drafts, setDrafts] = useState({})
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState(null)
    const [pageStatus, setPageStatus] = useState(null)

    const loadGradebook = async activeFilters => {
        setLoading(true)

        try {
            const response = await axios.get('/api/teacher/gradebook', {
                params: activeFilters,
            })

            const nextStudents = response.data?.students ?? []
            const nextScope = response.data?.scope ?? null

            setStudents(nextStudents)
            setStats(response.data?.stats ?? null)
            setScope(nextScope)
            setOptions(response.data?.options ?? null)
            setDrafts(createDrafts(nextStudents))
            setPageStatus(null)

            if (nextScope) {
                setFilters(current => {
                    const nextFilters = {
                        school_track:
                            nextScope.school_track ?? current.school_track,
                        class_name:
                            nextScope.class_name ?? current.class_name,
                    }

                    return current.school_track === nextFilters.school_track &&
                        current.class_name === nextFilters.class_name
                        ? current
                        : nextFilters
                })
            }
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load learner grade records right now.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageGradebook(user)) {
            return
        }

        loadGradebook(filters)
    }, [user, filters.school_track, filters.class_name])

    const activeTrack = scope?.school_track ?? filters.school_track
    const availableClasses = activeTrack
        ? options?.classesByTrack?.[activeTrack] ?? []
        : []

    const updateDraft = (studentId, field, value) => {
        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                [field]: value,
            },
        }))
    }

    const updateSubjectGradeDraft = (studentId, subjectId, value) => {
        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                subjectGrades: {
                    ...(current[studentId]?.subjectGrades ?? {}),
                    [String(subjectId)]: value,
                },
            },
        }))
    }

    const hasDraftChanged = student => {
        const draft = drafts[student.id]
        const trackSubjects = getTrackSubjects(options, student.school_track)

        if (!draft) {
            return false
        }

        const savedSubjectGrades = createSubjectGradeMap(
            student.performance?.subject_grades ?? [],
        )

        return (
            draft.comment !== (student.performance?.comment ?? '') ||
            trackSubjects.some(
                subject =>
                    (draft.subjectGrades?.[String(subject.id)] ?? '') !==
                    (savedSubjectGrades[String(subject.id)] ?? ''),
            )
        )
    }

    const savePerformance = async studentId => {
        const draft = drafts[studentId]
        const student = students.find(item => item.id === studentId)
        const trackSubjects = getTrackSubjects(options, student?.school_track)

        if (!student || !draft) {
            return
        }

        if (trackSubjects.length === 0) {
            setPageStatus({
                type: 'error',
                message: 'Enter a grade before saving this learner record.',
            })
            return
        }

        const subjectGradesPayload = trackSubjects.map(subject => ({
            subject_id: subject.id,
            grade: draft.subjectGrades?.[String(subject.id)]?.trim() ?? '',
        }))

        if (subjectGradesPayload.some(subjectGrade => subjectGrade.grade === '')) {
            setPageStatus({
                type: 'error',
                message:
                    'Enter a grade for every subject configured for this learner before saving.',
            })
            return
        }

        setSavingId(studentId)

        try {
            const response = await axios.put(
                `/api/teacher/gradebook/students/${studentId}/performance`,
                {
                    subject_grades: subjectGradesPayload,
                    comment: draft.comment,
                },
            )

            const updatedStudent = response.data?.student

            setStudents(current => {
                const nextStudents = current.map(student =>
                    student.id === studentId ? updatedStudent : student,
                )

                setStats(currentStats =>
                    currentStats
                        ? {
                              ...currentStats,
                              graded_students: nextStudents.filter(student =>
                                  Boolean(
                                      student.performance?.subject_grades?.length ||
                                          student.performance?.grade,
                                  ),
                              ).length,
                              pending_students: nextStudents.filter(
                                  student =>
                                      !student.performance?.subject_grades?.length &&
                                      !student.performance?.grade,
                              ).length,
                          }
                        : currentStats,
                )

                return nextStudents
            })
            setDrafts(current => ({
                ...current,
                [studentId]: {
                    subjectGrades: createSubjectGradeMap(
                        updatedStudent?.performance?.subject_grades ?? [],
                    ),
                    comment: updatedStudent?.performance?.comment ?? '',
                },
            }))
            setPageStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'Learner grade record saved successfully.',
            })
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save this learner grade record.',
            })
        } finally {
            setSavingId(null)
        }
    }

    const pageActions = (
        <button
            type="button"
            onClick={() => loadGradebook(filters)}
            className={workspaceStyles.secondaryButton}>
            Refresh list
        </button>
    )

    if (user && !canManageGradebook(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Academic Records"
                title="Learner gradebook"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only teacher and management accounts can upload learner grades and comments.`}>
                <div className={`${styles.statusBar} ${styles.statusError}`}>
                    This workspace is not available to the current role.
                </div>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Academic Records"
            title="Learner gradebook"
            description="Upload subject-by-subject grades and a teacher comment for each learner. Guardians linked to that learner will see the latest academic update in their dashboard."
            actions={pageActions}>
            <section className={styles.stack}>
                <section className={workspaceStyles.statGrid}>
                    {[
                        ['Students in view', stats?.total_students ?? 0],
                        ['Updated records', stats?.graded_students ?? 0],
                        ['Pending records', stats?.pending_students ?? 0],
                    ].map(([label, value]) => (
                        <article key={label} className={workspaceStyles.statCard}>
                            <p className={workspaceStyles.statLabel}>{label}</p>
                            <p className={workspaceStyles.statValue}>{value}</p>
                            <p className={workspaceStyles.statNote}>
                                {label === 'Students in view'
                                    ? 'The learner list is limited by your class or the selected filters.'
                                    : label === 'Updated records'
                                      ? 'These learners already have a saved subject-grade record from your account.'
                                      : 'These learners still need subject grades or a comment from your account.'}
                            </p>
                        </article>
                    ))}
                </section>

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Filters</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Gradebook scope
                            </h2>
                        </div>
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.filterGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    School track
                                </span>
                                <select
                                    value={filters.school_track}
                                    onChange={event =>
                                        setFilters(() => ({
                                            school_track: event.target.value,
                                            class_name: '',
                                        }))
                                    }
                                    disabled={Boolean(scope?.locked_track)}
                                    className={managementStyles.select}>
                                    <option value="">All visible tracks</option>
                                    {Object.entries(options?.schoolTracks ?? {}).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Class
                                </span>
                                <select
                                    value={filters.class_name}
                                    onChange={event =>
                                        setFilters(current => ({
                                            ...current,
                                            class_name: event.target.value,
                                        }))
                                    }
                                    disabled={
                                        Boolean(scope?.locked_class_name) ||
                                        activeTrack === ''
                                    }
                                    className={managementStyles.select}>
                                    <option value="">
                                        {activeTrack === ''
                                            ? 'Choose a track first'
                                            : 'All visible classes'}
                                    </option>
                                    {availableClasses.map(className => (
                                        <option key={className} value={className}>
                                            {className}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className={managementStyles.notice}>
                            {scope?.locked_class_name
                                ? `This account is locked to ${scope.locked_class_name}.`
                                : scope?.locked_track
                                  ? `This account can work within the ${scope.locked_track} section.`
                                  : 'Management accounts can switch between classes and school sections.'}
                        </div>
                    </div>
                </article>

                {pageStatus ? (
                    <div
                        className={`${styles.statusBar} ${
                            pageStatus.type === 'error' ? styles.statusError : ''
                        }`}>
                        {pageStatus.message}
                    </div>
                ) : null}

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Learner records
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Grades and comments
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>Learner</th>
                                    <th>Subject grades</th>
                                    <th>Comment</th>
                                    <th>Last update</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className={styles.emptyState}>
                                            Loading learner grade records...
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className={styles.emptyState}>
                                            No learners match the current scope.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map(student => {
                                        const draft = drafts[student.id] ?? {
                                            subjectGrades: {},
                                            comment: '',
                                        }
                                        const trackSubjects = getTrackSubjects(
                                            options,
                                            student.school_track,
                                        )

                                        return (
                                            <tr key={student.id}>
                                                <td>
                                                    <strong>{student.full_name}</strong>
                                                    <small className={styles.metaText}>
                                                        {student.school_track_label} ·{' '}
                                                        {student.class_name}
                                                    </small>
                                                    <small className={styles.metaText}>
                                                        Guardian:{' '}
                                                        {student.guardian_name ||
                                                            'Not recorded'}
                                                    </small>
                                                </td>
                                                <td>
                                                    {trackSubjects.length === 0 ? (
                                                        <div className={styles.subjectGradeEmpty}>
                                                            No subjects are configured for{' '}
                                                            {student.school_track_label}.
                                                        </div>
                                                    ) : (
                                                        <div className={styles.subjectGradeList}>
                                                            {trackSubjects.map(subject => (
                                                                <label
                                                                    key={`${student.id}-${subject.id}`}
                                                                    className={
                                                                        styles.subjectGradeItem
                                                                    }>
                                                                    <span
                                                                        className={
                                                                            styles.subjectGradeLabel
                                                                        }>
                                                                        {subject.code
                                                                            ? `${subject.name} (${subject.code})`
                                                                            : subject.name}
                                                                    </span>
                                                                    <Input
                                                                        value={
                                                                            draft
                                                                                .subjectGrades?.[
                                                                                String(
                                                                                    subject.id,
                                                                                )
                                                                            ] ?? ''
                                                                        }
                                                                        onChange={event =>
                                                                            updateSubjectGradeDraft(
                                                                                student.id,
                                                                                subject.id,
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        placeholder="Grade"
                                                                        className={
                                                                            styles.tableField
                                                                        }
                                                                    />
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <textarea
                                                        value={draft.comment}
                                                        onChange={event =>
                                                            updateDraft(
                                                                student.id,
                                                                'comment',
                                                                event.target.value,
                                                            )
                                                        }
                                                        className={`${managementStyles.textarea} ${styles.commentField}`}
                                                        placeholder="Add a teacher comment for this learner."
                                                    />
                                                </td>
                                                <td>
                                                    {student.performance?.updated_at
                                                        ? new Date(
                                                              student.performance.updated_at,
                                                          ).toLocaleString()
                                                        : 'Not saved yet'}
                                                </td>
                                                <td className={styles.actionsCell}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            savePerformance(student.id)
                                                        }
                                                        disabled={
                                                            savingId === student.id ||
                                                            trackSubjects.length === 0 ||
                                                            !hasDraftChanged(student)
                                                        }
                                                        className={workspaceStyles.button}>
                                                        {savingId === student.id
                                                            ? 'Saving...'
                                                            : 'Save record'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
