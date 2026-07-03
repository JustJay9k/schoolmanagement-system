'use client'

import { useEffect, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import { useToast } from '@/components/ToastProvider'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import {
    canManageGradebook,
    formatRoleLabel,
    isManagementUser,
} from '@/lib/userAccess'
import styles from './gradebook.module.css'

const createSubjectGradeMap = subjectGrades =>
    Object.fromEntries(
        (subjectGrades ?? []).map(subjectGrade => [
            String(subjectGrade.subject_id),
            subjectGrade.grade ?? '',
        ]),
    )

const createPerformanceDraft = performance => ({
    subjectGrades: createSubjectGradeMap(performance?.subject_grades ?? []),
    comment: performance?.comment ?? '',
})

const createDrafts = (students, assessmentPeriods) =>
    Object.fromEntries(
        students.map(student => {
            const performanceMap = Object.fromEntries(
                (student.performances ?? []).map(performance => [
                    String(performance.assessment_period_id),
                    createPerformanceDraft(performance),
                ]),
            )

            return [
                student.id,
                Object.fromEntries(
                    (assessmentPeriods ?? []).map(period => [
                        String(period.id),
                        performanceMap[String(period.id)] ?? createPerformanceDraft(),
                    ]),
                ),
            ]
        }),
    )

const getTrackSubjects = (options, schoolTrack) =>
    schoolTrack ? options?.subjectsByTrack?.[schoolTrack] ?? [] : []

const getAssessmentPeriods = options => options?.assessmentPeriods ?? []

const getPerformanceForPeriod = (student, periodId) =>
    (student.performances ?? []).find(
        performance => String(performance.assessment_period_id) === String(periodId),
    )

const studentHasSavedRecords = student => (student.performances ?? []).length > 0

export default function GradebookPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
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
    const [savingKey, setSavingKey] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [assessmentForm, setAssessmentForm] = useState({ name: '' })
    const [assessmentErrors, setAssessmentErrors] = useState({})
    const [savingAssessment, setSavingAssessment] = useState(false)
    const [deletingAssessmentId, setDeletingAssessmentId] = useState(null)
    const [confirmingAssessment, setConfirmingAssessment] = useState(null)

    const loadGradebook = async activeFilters => {
        setLoading(true)

        try {
            const response = await axios.get('/api/teacher/gradebook', {
                params: activeFilters,
            })

            const nextStudents = response.data?.students ?? []
            const nextScope = response.data?.scope ?? null
            const nextOptions = response.data?.options ?? null
            const nextAssessmentPeriods = getAssessmentPeriods(nextOptions)

            setStudents(nextStudents)
            setStats(response.data?.stats ?? null)
            setScope(nextScope)
            setOptions(nextOptions)
            setDrafts(createDrafts(nextStudents, nextAssessmentPeriods))
            setLoadError(null)

            if (nextScope) {
                setFilters(current => {
                    const nextFilters = {
                        school_track:
                            nextScope.school_track ?? current.school_track,
                        class_name: nextScope.class_name ?? current.class_name,
                    }

                    return current.school_track === nextFilters.school_track &&
                        current.class_name === nextFilters.class_name
                        ? current
                        : nextFilters
                })
            }
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load learner grade records right now.',
            )
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
    const assessmentPeriods = getAssessmentPeriods(options)
    const managementMode = isManagementUser(user)
    const tableColumnCount = assessmentPeriods.length > 0 ? 1 + assessmentPeriods.length : 2

    const updatePeriodDraft = (studentId, periodId, field, value) => {
        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                [String(periodId)]: {
                    ...current[studentId]?.[String(periodId)],
                    [field]: value,
                },
            },
        }))
    }

    const updateSubjectGradeDraft = (studentId, periodId, subjectId, value) => {
        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                [String(periodId)]: {
                    ...current[studentId]?.[String(periodId)],
                    subjectGrades: {
                        ...(current[studentId]?.[String(periodId)]?.subjectGrades ?? {}),
                        [String(subjectId)]: value,
                    },
                },
            },
        }))
    }

    const hasDraftChanged = (student, periodId) => {
        const draft = drafts[student.id]?.[String(periodId)]
        const savedPerformance = getPerformanceForPeriod(student, periodId)
        const trackSubjects = getTrackSubjects(options, student.school_track)

        if (!draft) {
            return false
        }

        const savedSubjectGrades = createSubjectGradeMap(
            savedPerformance?.subject_grades ?? [],
        )

        return (
            draft.comment !== (savedPerformance?.comment ?? '') ||
            trackSubjects.some(
                subject =>
                    (draft.subjectGrades?.[String(subject.id)] ?? '') !==
                    (savedSubjectGrades[String(subject.id)] ?? ''),
            )
        )
    }

    const savePerformance = async (studentId, periodId) => {
        const student = students.find(item => item.id === studentId)
        const draft = drafts[studentId]?.[String(periodId)]
        const trackSubjects = getTrackSubjects(options, student?.school_track)

        if (!student || !draft) {
            return
        }

        if (assessmentPeriods.length === 0) {
            showToast({
                type: 'error',
                message:
                    'No grade criteria have been configured yet. Ask the head teacher to add one first.',
            })
            return
        }

        if (trackSubjects.length === 0) {
            showToast({
                type: 'error',
                message: `No subjects are configured for ${student.school_track_label} yet.`,
            })
            return
        }

        const subjectGradesPayload = trackSubjects.map(subject => ({
            subject_id: subject.id,
            grade: draft.subjectGrades?.[String(subject.id)]?.trim() ?? '',
        }))

        if (subjectGradesPayload.some(subjectGrade => subjectGrade.grade === '')) {
            showToast({
                type: 'error',
                message:
                    'Enter a grade for every subject in this examination period before saving.',
            })
            return
        }

        const currentSavingKey = `${studentId}:${periodId}`
        setSavingKey(currentSavingKey)

        try {
            const response = await axios.put(
                `/api/teacher/gradebook/students/${studentId}/performance`,
                {
                    assessment_period_id: periodId,
                    subject_grades: subjectGradesPayload,
                    comment: draft.comment,
                },
            )

            const updatedStudent = response.data?.student

            setStudents(current => {
                const nextStudents = current.map(item =>
                    item.id === studentId ? updatedStudent : item,
                )

                setStats(currentStats =>
                    currentStats
                        ? {
                              ...currentStats,
                              graded_students: nextStudents.filter(studentHasSavedRecords)
                                  .length,
                              pending_students: nextStudents.filter(
                                  student => !studentHasSavedRecords(student),
                              ).length,
                          }
                        : currentStats,
                )

                return nextStudents
            })

            setDrafts(current => ({
                ...current,
                [studentId]: {
                    ...current[studentId],
                    ...createDrafts([updatedStudent], assessmentPeriods)[studentId],
                },
            }))
            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Learner grade record saved successfully.',
            })
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save this learner grade record.',
            })
        } finally {
            setSavingKey(null)
        }
    }

    const createAssessmentPeriod = async event => {
        event.preventDefault()
        setSavingAssessment(true)
        setAssessmentErrors({})

        try {
            const response = await axios.post(
                '/api/management/gradebook-assessment-periods',
                assessmentForm,
            )

            setAssessmentForm({ name: '' })
            showToast({
                type: 'success',
                message:
                    response.data?.message ?? 'Grade criterion saved successfully.',
            })
            await loadGradebook(filters)
        } catch (error) {
            setAssessmentErrors(error?.response?.data?.errors ?? {})
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save this grade criterion.',
            })
        } finally {
            setSavingAssessment(false)
        }
    }

    const deleteAssessmentPeriod = async period => {
        setDeletingAssessmentId(period.id)
        setAssessmentErrors({})

        try {
            const response = await axios.delete(
                `/api/management/gradebook-assessment-periods/${period.id}`,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Grade criterion deleted successfully.',
            })
            await loadGradebook(filters)
        } catch (error) {
            setAssessmentErrors(error?.response?.data?.errors ?? {})
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to delete this grade criterion.',
            })
        } finally {
            setDeletingAssessmentId(null)
            setConfirmingAssessment(null)
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
                description={`This account is signed in as ${formatRoleLabel(
                    user?.role,
                )}. Only teacher and management accounts can upload learner grades and comments.`}>
                <div className={`${styles.statusBar} ${styles.statusError}`}>
                    This workspace is not available to the current role.
                </div>
            </WorkspacePageShell>
        )
    }

    return (
        <>
            <WorkspacePageShell
                eyebrow="Academic Records"
                title="Learner gradebook"
                description="Head teachers can define examination periods and teachers can populate subject grades for each learner inside every configured period."
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
                                      ? 'These learners already have at least one saved examination-period record from your account.'
                                      : 'These learners still need at least one saved examination-period record from your account.'}
                            </p>
                        </article>
                    ))}
                </section>

                {managementMode ? (
                    <section className={managementStyles.summaryCards}>
                        <article className={workspaceStyles.panel}>
                            <div className={workspaceStyles.panelHeader}>
                                <div>
                                    <p className={workspaceStyles.panelEyebrow}>
                                        Management
                                    </p>
                                    <h2 className={workspaceStyles.panelTitle}>
                                        Grade criteria
                                    </h2>
                                </div>
                            </div>

                            <form
                                onSubmit={createAssessmentPeriod}
                                className={managementStyles.stack}>
                                <div className={managementStyles.formGrid}>
                                    <label className={managementStyles.field}>
                                        <span className={managementStyles.fieldLabel}>
                                            Criterion label
                                        </span>
                                        <Input
                                            value={assessmentForm.name}
                                            onChange={event =>
                                                setAssessmentForm({
                                                    name: event.target.value,
                                                })
                                            }
                                            placeholder="e.g. Mid Term Results"
                                            required
                                        />
                                        <span className={managementStyles.fieldHint}>
                                            Add as many examination periods or test
                                            criteria as the school needs.
                                        </span>
                                        <InputError messages={assessmentErrors.name} />
                                    </label>
                                </div>

                                <div className={managementStyles.actions}>
                                    <button
                                        type="submit"
                                        disabled={savingAssessment}
                                        className={workspaceStyles.button}>
                                        {savingAssessment
                                            ? 'Saving...'
                                            : 'Add criterion'}
                                    </button>
                                </div>
                            </form>
                        </article>

                        <article className={workspaceStyles.panel}>
                            <div className={workspaceStyles.panelHeader}>
                                <div>
                                    <p className={workspaceStyles.panelEyebrow}>
                                        Current setup
                                    </p>
                                    <h2 className={workspaceStyles.panelTitle}>
                                        Active examination periods
                                    </h2>
                                </div>
                            </div>

                            {assessmentErrors.period ? (
                                <InputError messages={assessmentErrors.period} />
                            ) : null}

                            {assessmentPeriods.length === 0 ? (
                                <p className={managementStyles.notice}>
                                    No grade criteria have been added yet. Add at
                                    least one so teachers can enter results by period.
                                </p>
                            ) : (
                                <div className={styles.criteriaList}>
                                    {assessmentPeriods.map(period => (
                                        <div
                                            key={period.id}
                                            className={styles.criteriaCard}>
                                            <div>
                                                <strong>{period.name}</strong>
                                                <small>
                                                    Column {period.position} in the
                                                    teacher gradebook grid.
                                                </small>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingAssessment(period)
                                                }
                                                disabled={
                                                    deletingAssessmentId === period.id
                                                }
                                                className={
                                                    managementStyles.dangerButton
                                                }>
                                                {deletingAssessmentId === period.id
                                                    ? 'Removing...'
                                                    : 'Remove'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>
                    </section>
                ) : null}

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

                {loadError ? (
                    <div
                        className={`${styles.statusBar} ${styles.statusError}`}>
                        {loadError}
                    </div>
                ) : null}

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Learner records
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Subject grades by examination period
                            </h2>
                        </div>
                    </div>

                    {assessmentPeriods.length === 0 ? (
                        <p className={managementStyles.notice}>
                            No examination periods are configured yet. Head
                            teacher accounts should add at least one criterion
                            before teachers start entering grades.
                        </p>
                    ) : null}

                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>Learner</th>
                                    {assessmentPeriods.length === 0 ? (
                                        <th>Assessment periods</th>
                                    ) : (
                                        assessmentPeriods.map(period => (
                                            <th key={period.id}>{period.name}</th>
                                        ))
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={tableColumnCount}
                                            className={styles.emptyState}>
                                            Loading learner grade records...
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={tableColumnCount}
                                            className={styles.emptyState}>
                                            No learners match the current scope.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map(student => {
                                        const trackSubjects = getTrackSubjects(
                                            options,
                                            student.school_track,
                                        )

                                        return (
                                            <tr key={student.id}>
                                                <td>
                                                    <strong>{student.full_name}</strong>
                                                    <small className={styles.metaText}>
                                                        {student.school_track_label} |{' '}
                                                        {student.class_name}
                                                    </small>
                                                    <small className={styles.metaText}>
                                                        Guardian:{' '}
                                                        {student.guardian_name ||
                                                            'Not recorded'}
                                                    </small>
                                                </td>

                                                {assessmentPeriods.length === 0 ? (
                                                    <td>
                                                        <div
                                                            className={
                                                                styles.subjectGradeEmpty
                                                            }>
                                                            Waiting for a head
                                                            teacher to add grade
                                                            criteria.
                                                        </div>
                                                    </td>
                                                ) : (
                                                    assessmentPeriods.map(period => {
                                                        const draft =
                                                            drafts[student.id]?.[
                                                                String(period.id)
                                                            ] ?? createPerformanceDraft()
                                                        const savedPerformance =
                                                            getPerformanceForPeriod(
                                                                student,
                                                                period.id,
                                                            )
                                                        const currentSavingKey = `${student.id}:${period.id}`

                                                        return (
                                                            <td key={`${student.id}-${period.id}`}>
                                                                <div
                                                                    className={
                                                                        styles.periodCell
                                                                    }>
                                                                    {trackSubjects.length ===
                                                                    0 ? (
                                                                        <div
                                                                            className={
                                                                                styles.subjectGradeEmpty
                                                                            }>
                                                                            No
                                                                            subjects
                                                                            are
                                                                            configured
                                                                            for{' '}
                                                                            {
                                                                                student.school_track_label
                                                                            }
                                                                            .
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className={
                                                                                styles.subjectGradeList
                                                                            }>
                                                                            {trackSubjects.map(
                                                                                subject => (
                                                                                    <label
                                                                                        key={`${student.id}-${period.id}-${subject.id}`}
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
                                                                                                ] ??
                                                                                                ''
                                                                                            }
                                                                                            onChange={event =>
                                                                                                updateSubjectGradeDraft(
                                                                                                    student.id,
                                                                                                    period.id,
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
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <textarea
                                                                        value={draft.comment}
                                                                        onChange={event =>
                                                                            updatePeriodDraft(
                                                                                student.id,
                                                                                period.id,
                                                                                'comment',
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        className={`${managementStyles.textarea} ${styles.commentField}`}
                                                                        placeholder={`Comment for ${period.name}.`}
                                                                    />

                                                                    <small
                                                                        className={
                                                                            styles.periodMeta
                                                                        }>
                                                                        {savedPerformance?.updated_at
                                                                            ? `Last saved ${new Date(
                                                                                  savedPerformance.updated_at,
                                                                              ).toLocaleString()}`
                                                                            : 'Not saved yet'}
                                                                    </small>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            savePerformance(
                                                                                student.id,
                                                                                period.id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            savingKey ===
                                                                                currentSavingKey ||
                                                                            trackSubjects.length ===
                                                                                0 ||
                                                                            !hasDraftChanged(
                                                                                student,
                                                                                period.id,
                                                                            )
                                                                        }
                                                                        className={
                                                                            workspaceStyles.button
                                                                        }>
                                                                        {savingKey ===
                                                                        currentSavingKey
                                                                            ? 'Saving...'
                                                                            : 'Save period'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )
                                                    })
                                                )}
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
            <ConfirmDialog
                open={Boolean(confirmingAssessment)}
                eyebrow="Delete criterion"
                title="Remove grade criterion?"
                message={
                    confirmingAssessment
                        ? `Delete ${confirmingAssessment.name} from the grade criteria list?`
                        : ''
                }
                confirmLabel="Delete criterion"
                busyLabel="Deleting..."
                tone="danger"
                busy={
                    deletingAssessmentId != null &&
                    deletingAssessmentId === confirmingAssessment?.id
                }
                onClose={() => setConfirmingAssessment(null)}
                onConfirm={() => {
                    if (confirmingAssessment) {
                        deleteAssessmentPeriod(confirmingAssessment)
                    }
                }}
            />
        </>
    )
}
