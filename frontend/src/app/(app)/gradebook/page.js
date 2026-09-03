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
    isTeacherUser,
} from '@/lib/userAccess'
import HomeworkManager from './HomeworkManager'
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

const makePerformanceKey = (term, periodId) => `${term}:${periodId}`

const createDrafts = (students, assessmentPeriods) =>
    Object.fromEntries(
        students.map(student => {
            const performanceMap = Object.fromEntries(
                (student.performances ?? []).map(performance => [
                    makePerformanceKey(
                        performance.assessment_period_term ?? 'first',
                        performance.assessment_period_id,
                    ),
                    createPerformanceDraft(performance),
                ]),
            )

            return [
                student.id,
                Object.fromEntries(
                    gradebookTerms.flatMap(term =>
                        (assessmentPeriods ?? []).map(period => {
                            const key = makePerformanceKey(
                                term.value,
                                period.id,
                            )

                            return [
                                key,
                                performanceMap[key] ?? createPerformanceDraft(),
                            ]
                        }),
                    ),
                ),
            ]
        }),
    )

const getTrackSubjects = (options, schoolTrack) =>
    schoolTrack ? options?.subjectsByTrack?.[schoolTrack] ?? [] : []

const getAssessmentPeriods = options => options?.assessmentPeriods ?? []

const getPerformanceForPeriod = (student, periodId, term) =>
    (student.performances ?? []).find(
        performance =>
            String(performance.assessment_period_id) === String(periodId) &&
            (performance.assessment_period_term ?? 'first') === term,
    )

const studentHasSavedRecords = student =>
    (student.performances ?? []).length > 0

const parseGradeToNumber = grade => {
    const text = (grade ?? '').trim()

    if (!text) {
        return null
    }

    const fractionMatch = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)

    if (fractionMatch && Number(fractionMatch[2]) > 0) {
        return (Number(fractionMatch[1]) / Number(fractionMatch[2])) * 100
    }

    const percentMatch = text.match(/^(\d+(?:\.\d+)?)%$/)

    if (percentMatch) {
        return Number(percentMatch[1])
    }

    if (/^\d+(?:\.\d+)?$/.test(text)) {
        const value = Number(text)

        return value <= 100 ? value : null
    }

    const letterMap = {
        'A+': 97,
        A: 93,
        'A-': 90,
        'B+': 87,
        B: 83,
        'B-': 80,
        'C+': 77,
        C: 73,
        'C-': 70,
        'D+': 67,
        D: 63,
        'D-': 60,
        F: 50,
        E: 40,
    }

    const upper = text.toUpperCase()

    return upper in letterMap ? letterMap[upper] : null
}

const computeAverage = values => {
    const numbers = values
        .map(parseGradeToNumber)
        .filter(value => value !== null)

    if (numbers.length === 0) {
        return null
    }

    return (
        Math.round(
            (numbers.reduce((sum, value) => sum + value, 0) / numbers.length) *
                10,
        ) / 10
    )
}

const gradebookTerms = [
    { value: 'first', label: 'First Term' },
    { value: 'second', label: 'Second Term' },
    { value: 'third', label: 'Third Term' },
]

const defaultOpenTerms = {
    first: true,
    second: false,
    third: false,
}

export default function GradebookPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const canManageHomework = isTeacherUser(user)
    const [activeTab, setActiveTab] = useState('gradebook')
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
    const [savingAll, setSavingAll] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [confirmingSubmit, setConfirmingSubmit] = useState(null)
    const [confirmingApprove, setConfirmingApprove] = useState(null)
    const [confirmingReopen, setConfirmingReopen] = useState(null)
    const [reopening, setReopening] = useState(false)
    const [openTerms, setOpenTerms] = useState(defaultOpenTerms)

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

    const computePeriodAverage = (studentId, periodId, term) => {
        const draft = drafts[studentId]?.[makePerformanceKey(term, periodId)]
        const subjectGrades = draft?.subjectGrades ?? {}

        return computeAverage(Object.values(subjectGrades))
    }

    const computeStudentOverallAverage = student => {
        const allGrades = []

        for (const term of gradebookTerms) {
            for (const period of assessmentPeriods) {
                const draft =
                    drafts[student.id]?.[
                        makePerformanceKey(term.value, period.id)
                    ]

                if (draft?.subjectGrades) {
                    allGrades.push(...Object.values(draft.subjectGrades))
                }
            }
        }

        return computeAverage(allGrades)
    }

    const positions = (() => {
        if (students.length === 0 || assessmentPeriods.length === 0) {
            return []
        }

        const entries = students.map(student => ({
            id: student.id,
            full_name: student.full_name,
            school_track_label: student.school_track_label,
            class_name: student.class_name,
            classKey: `${student.school_track}::${student.class_name}`,
            average: computeStudentOverallAverage(student),
        }))

        const groups = {}

        for (const entry of entries) {
            ;(groups[entry.classKey] ??= []).push(entry)
        }

        const ranked = []

        for (const group of Object.values(groups)) {
            const sorted = [...group].sort((a, b) => {
                if (a.average === null && b.average === null) return 0
                if (a.average === null) return 1
                if (b.average === null) return -1

                return b.average - a.average
            })

            let rank = 0
            let lastAverage = null

            for (const entry of sorted) {
                if (entry.average !== null && entry.average !== lastAverage) {
                    rank++
                    lastAverage = entry.average
                }

                ranked.push({
                    ...entry,
                    position: entry.average !== null ? rank : null,
                })
            }
        }

        return ranked
    })()

    const positionsByClass = (() => {
        const groups = {}

        for (const entry of positions) {
            ;(groups[entry.classKey] ??= []).push(entry)
        }

        return Object.values(groups)
    })()

    const updatePeriodDraft = (studentId, periodId, term, field, value) => {
        const performanceKey = makePerformanceKey(term, periodId)

        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                [performanceKey]: {
                    ...current[studentId]?.[performanceKey],
                    [field]: value,
                },
            },
        }))
    }

    const updateSubjectGradeDraft = (
        studentId,
        periodId,
        term,
        subjectId,
        value,
    ) => {
        const performanceKey = makePerformanceKey(term, periodId)

        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                [performanceKey]: {
                    ...current[studentId]?.[performanceKey],
                    subjectGrades: {
                        ...(current[studentId]?.[performanceKey]
                            ?.subjectGrades ?? {}),
                        [String(subjectId)]: value,
                    },
                },
            },
        }))
    }

    const hasDraftChanged = (student, periodId, term) => {
        const draft = drafts[student.id]?.[makePerformanceKey(term, periodId)]
        const savedPerformance = getPerformanceForPeriod(
            student,
            periodId,
            term,
        )
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

    const getPeriodStatus = (student, periodId, term) =>
        getPerformanceForPeriod(student, periodId, term)?.status ?? 'draft'

    const isPeriodSubmitted = (student, periodId, term) =>
        getPeriodStatus(student, periodId, term) === 'submitted'

    const isPeriodApproved = (student, periodId, term) =>
        getPeriodStatus(student, periodId, term) === 'approved'

    const isPeriodLocked = (student, periodId, term) => {
        const status = getPeriodStatus(student, periodId, term)

        return status === 'submitted' || status === 'approved'
    }

    const savePerformance = async (studentId, periodId, term) => {
        const student = students.find(item => item.id === studentId)
        const draft = drafts[studentId]?.[makePerformanceKey(term, periodId)]
        const trackSubjects = getTrackSubjects(options, student?.school_track)

        if (!student || !draft || isPeriodLocked(student, periodId, term)) {
            return {
                saved: false,
                message:
                    'This grade has already been submitted and is awaiting head teacher approval. Grades can only change after the head teacher reopens grading.',
            }
        }

        if (assessmentPeriods.length === 0) {
            return {
                saved: false,
                message:
                    'No grade criteria have been configured yet. Ask the head teacher to add one first.',
            }
        }

        if (trackSubjects.length === 0) {
            return {
                saved: false,
                message: `No subjects are configured for ${student.school_track_label} yet.`,
            }
        }

        const subjectGradesPayload = trackSubjects.map(subject => ({
            subject_id: subject.id,
            grade: draft.subjectGrades?.[String(subject.id)]?.trim() ?? '',
        }))

        if (
            subjectGradesPayload.some(subjectGrade => subjectGrade.grade === '')
        ) {
            return {
                saved: false,
                message:
                    'Enter a grade for every subject in this examination period before saving.',
            }
        }

        const response = await axios.put(
            `/api/teacher/gradebook/students/${studentId}/performance`,
            {
                assessment_period_id: periodId,
                term,
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
                          graded_students: nextStudents.filter(
                              studentHasSavedRecords,
                          ).length,
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

        return { saved: true, message: response.data?.message }
    }

    const saveAllDrafts = async () => {
        const changedCells = []

        for (const student of students) {
            for (const term of gradebookTerms) {
                for (const period of assessmentPeriods) {
                    if (
                        hasDraftChanged(student, period.id, term.value) &&
                        !isPeriodLocked(student, period.id, term.value) &&
                        !isPeriodApproved(student, period.id, term.value)
                    ) {
                        changedCells.push([student.id, period.id, term.value])
                    }
                }
            }
        }

        if (changedCells.length === 0) {
            showToast({
                type: 'info',
                message: 'There are no unsaved grade changes to save.',
            })
            return true
        }

        setSavingAll(true)
        setSavingKey('all')

        let savedCount = 0
        let firstError = null
        let allSaved = true

        try {
            for (const [studentId, periodId, term] of changedCells) {
                try {
                    const result = await savePerformance(
                        studentId,
                        periodId,
                        term,
                    )

                    if (result?.saved) {
                        savedCount++
                    } else {
                        allSaved = false

                        if (result?.message && !firstError) {
                            firstError = result.message
                        }
                    }
                } catch (error) {
                    allSaved = false

                    if (!firstError) {
                        firstError =
                            error?.response?.data?.message ??
                            'Some grade changes could not be saved.'
                    }
                }
            }

            if (savedCount > 0 && !firstError) {
                showToast({
                    type: 'success',
                    message: `${savedCount} grade record(s) saved as draft.`,
                })
            } else if (firstError) {
                showToast({
                    type: 'error',
                    message: firstError,
                })
            }
        } finally {
            setSavingAll(false)
            setSavingKey(null)
        }

        return allSaved
    }

    const findMissingGrades = () => {
        const missing = []

        for (const student of students) {
            const trackSubjects = getTrackSubjects(
                options,
                student.school_track,
            )

            if (trackSubjects.length === 0) {
                continue
            }

            let studentMissing = false

            for (const term of gradebookTerms) {
                for (const period of assessmentPeriods) {
                    if (isPeriodLocked(student, period.id, term.value)) {
                        continue
                    }

                    const draft =
                        drafts[student.id]?.[
                            makePerformanceKey(term.value, period.id)
                        ]

                    const hasAllSubjects = trackSubjects.every(
                        subject =>
                            (
                                draft?.subjectGrades?.[String(subject.id)] ?? ''
                            ).trim() !== '',
                    )

                    if (!hasAllSubjects) {
                        missing.push(student.full_name)
                        studentMissing = true
                        break
                    }
                }

                if (studentMissing) {
                    break
                }
            }
        }

        return missing
    }

    const missingGradesMessage = missing => {
        const preview = missing.slice(0, 5).join(', ')
        const extra =
            missing.length > 5
                ? ` and ${missing.length - 5} more learner(s)`
                : ''

        return `Grades are still missing for ${preview}${extra}. Fill in every subject grade for all learners before submitting.`
    }

    const submitGrades = async () => {
        try {
            const missing = findMissingGrades()

            if (missing.length > 0) {
                setConfirmingSubmit(null)
                showToast({
                    type: 'error',
                    message: missingGradesMessage(missing),
                })
                return
            }

            const savedOk = await saveAllDrafts()

            if (!savedOk) {
                setConfirmingSubmit(null)
                showToast({
                    type: 'error',
                    message:
                        'Some grades are incomplete or could not be saved. Complete every subject grade before submitting.',
                })
                return
            }

            setSubmitting(true)
            setSavingKey('submitting')

            const response = await axios.post('/api/teacher/gradebook/submit')

            showToast({
                type: 'success',
                message:
                    response.data?.message ?? 'Grades submitted successfully.',
            })
            await loadGradebook(filters)
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to submit the grades. Save and try again.',
            })
        } finally {
            setSubmitting(false)
            setSavingKey(null)
            setConfirmingSubmit(null)
        }
    }

    const pendingDraftCount = students.reduce((count, student) => {
        let cells = 0

        for (const term of gradebookTerms) {
            for (const period of assessmentPeriods) {
                if (
                    hasDraftChanged(student, period.id, term.value) &&
                    !isPeriodLocked(student, period.id, term.value)
                ) {
                    cells++
                }
            }
        }

        return count + cells
    }, 0)

    const approveGrades = async () => {
        try {
            setSubmitting(true)
            setSavingKey('approving')

            const response = await axios.post(
                '/api/management/gradebook/approve',
                filters,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ?? 'Grades approved and published.',
            })
            setConfirmingApprove(null)
            await loadGradebook(filters)
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to approve the grades right now.',
            })
        } finally {
            setSubmitting(false)
            setSavingKey(null)
            setConfirmingApprove(null)
        }
    }

    const reopenGrades = async () => {
        try {
            setReopening(true)
            setSavingKey('reopening')

            const response = await axios.post(
                '/api/management/gradebook/reopen',
                filters,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Grading reopened. Teachers can edit and submit again.',
            })
            setConfirmingReopen(null)
            await loadGradebook(filters)
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to reopen grading right now.',
            })
        } finally {
            setReopening(false)
            setSavingKey(null)
            setConfirmingReopen(null)
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

            setAssessmentForm(current => ({ ...current, name: '' }))
            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Grade criterion saved successfully.',
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

    const submittedRecordsCount = students.reduce(
        (count, student) =>
            count +
            (student.performances ?? []).filter(
                performance => performance.status === 'submitted',
            ).length,
        0,
    )

    const approvedRecordsCount = students.reduce(
        (count, student) =>
            count +
            (student.performances ?? []).filter(
                performance => performance.status === 'approved',
            ).length,
        0,
    )

    const draftRecordsCount = students.reduce(
        (count, student) =>
            count +
            (student.performances ?? []).filter(
                performance => performance.status === 'draft',
            ).length,
        0,
    )

    const canSubmitGrades =
        isTeacherUser(user) && (pendingDraftCount > 0 || draftRecordsCount > 0)

    const pageActions = (
        <>
            <button
                type="button"
                onClick={() => loadGradebook(filters)}
                className={workspaceStyles.secondaryButton}
            >
                Refresh list
            </button>
        </>
    )

    const toggleTerm = term =>
        setOpenTerms(current => ({
            ...current,
            [term]: !current[term],
        }))

    const bottomPageActions = (
        <div className={styles.bottomActions}>
            {isTeacherUser(user) ? (
                <>
                    <button
                        type="button"
                        onClick={saveAllDrafts}
                        disabled={savingAll || Boolean(savingKey)}
                        className={workspaceStyles.secondaryButton}
                    >
                        {savingAll ? 'Saving...' : 'Save drafts'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const missing = findMissingGrades()

                            if (missing.length > 0) {
                                showToast({
                                    type: 'error',
                                    message: missingGradesMessage(missing),
                                })
                                return
                            }

                            setConfirmingSubmit(true)
                        }}
                        disabled={
                            submitting || Boolean(savingKey) || !canSubmitGrades
                        }
                        className={workspaceStyles.button}
                    >
                        {submitting ? 'Submitting...' : 'Submit grades'}
                    </button>
                </>
            ) : isManagementUser(user) ? (
                <>
                    <button
                        type="button"
                        onClick={() => setConfirmingApprove(true)}
                        disabled={
                            submitting ||
                            Boolean(savingKey) ||
                            submittedRecordsCount === 0
                        }
                        className={workspaceStyles.button}
                    >
                        {submitting ? 'Approving...' : 'Approve grades'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirmingReopen(true)}
                        disabled={
                            reopening ||
                            Boolean(savingKey) ||
                            (submittedRecordsCount === 0 &&
                                approvedRecordsCount === 0)
                        }
                        className={workspaceStyles.secondaryButton}
                    >
                        {reopening ? 'Reopening...' : 'Reopen grading'}
                    </button>
                </>
            ) : null}
        </div>
    )

    if (user && !canManageGradebook(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Academic Records"
                title="Learner gradebook"
                description={`This account is signed in as ${formatRoleLabel(
                    user?.role,
                )}. Only teacher and management accounts can upload learner grades and comments.`}
            >
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
                title="Schoolwork"
                description={
                    canManageHomework
                        ? 'Switch between the gradebook to capture examination results per period and the homework tab to publish tasks with documents or manual questions, then grade each learner.'
                        : 'Head teachers can define examination periods and teachers can populate subject grades for each learner inside every configured period.'
                }
                actions={pageActions}
            >
                {canManageHomework ? (
                    <div className={styles.tabSwitch} role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'gradebook'}
                            onClick={() => setActiveTab('gradebook')}
                            className={`${styles.tabButton} ${
                                activeTab === 'gradebook'
                                    ? styles.tabButtonActive
                                    : ''
                            }`}
                        >
                            Gradebook
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'homework'}
                            onClick={() => setActiveTab('homework')}
                            className={`${styles.tabButton} ${
                                activeTab === 'homework'
                                    ? styles.tabButtonActive
                                    : ''
                            }`}
                        >
                            Homework
                        </button>
                    </div>
                ) : null}

                {activeTab === 'gradebook' || !canManageHomework ? (
                    <div className={styles.scrollArea}>
                        <section
                            className={`${styles.stack} ${styles.scrollContent}`}
                        >
                            <section className={workspaceStyles.statGrid}>
                                {[
                                    [
                                        'Students in view',
                                        stats?.total_students ?? 0,
                                    ],
                                    [
                                        'Updated records',
                                        stats?.graded_students ?? 0,
                                    ],
                                    [
                                        'Pending records',
                                        stats?.pending_students ?? 0,
                                    ],
                                ].map(([label, value]) => (
                                    <article
                                        key={label}
                                        className={workspaceStyles.statCard}
                                    >
                                        <p
                                            className={
                                                workspaceStyles.statLabel
                                            }
                                        >
                                            {label}
                                        </p>
                                        <p
                                            className={
                                                workspaceStyles.statValue
                                            }
                                        >
                                            {value}
                                        </p>
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

                            {positionsByClass.length > 0 ? (
                                <article className={workspaceStyles.fullPanel}>
                                    <div
                                        className={workspaceStyles.panelHeader}
                                    >
                                        <div>
                                            <p
                                                className={
                                                    workspaceStyles.panelEyebrow
                                                }
                                            >
                                                Class ranking
                                            </p>
                                            <h2
                                                className={
                                                    workspaceStyles.panelTitle
                                                }
                                            >
                                                Learner positions
                                            </h2>
                                        </div>
                                    </div>

                                    {positionsByClass.map(group => (
                                        <section
                                            key={group[0].classKey}
                                            className={
                                                styles.positionClassBlock
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.positionClassTitle
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.positionClassLabel
                                                    }
                                                >
                                                    {
                                                        group[0]
                                                            .school_track_label
                                                    }{' '}
                                                    | {group[0].class_name}
                                                </span>
                                                <span
                                                    className={
                                                        styles.positionClassCount
                                                    }
                                                >
                                                    {group.length} learner
                                                    {group.length !== 1
                                                        ? 's'
                                                        : ''}
                                                </span>
                                            </div>

                                            <div
                                                className={
                                                    workspaceStyles.tableWrap
                                                }
                                            >
                                                <table
                                                    className={
                                                        workspaceStyles.table
                                                    }
                                                >
                                                    <thead>
                                                        <tr>
                                                            <th>Pos</th>
                                                            <th>Learner</th>
                                                            <th>Average</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.map(entry => (
                                                            <tr key={entry.id}>
                                                                <td>
                                                                    {entry.position !=
                                                                    null ? (
                                                                        <strong
                                                                            className={
                                                                                styles.positionNumber
                                                                            }
                                                                        >
                                                                            {
                                                                                entry.position
                                                                            }
                                                                        </strong>
                                                                    ) : (
                                                                        <span
                                                                            className={
                                                                                styles.positionUngraded
                                                                            }
                                                                        >
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <strong>
                                                                        {
                                                                            entry.full_name
                                                                        }
                                                                    </strong>
                                                                </td>
                                                                <td>
                                                                    {entry.average !=
                                                                    null ? (
                                                                        <span
                                                                            className={
                                                                                styles.periodAverageValue
                                                                            }
                                                                        >
                                                                            {
                                                                                entry.average
                                                                            }
                                                                            %
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className={
                                                                                styles.positionUngraded
                                                                            }
                                                                        >
                                                                            Not
                                                                            graded
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    ))}
                                </article>
                            ) : null}

                            {managementMode ? (
                                <section
                                    className={managementStyles.summaryCards}
                                >
                                    <article className={workspaceStyles.panel}>
                                        <div
                                            className={
                                                workspaceStyles.panelHeader
                                            }
                                        >
                                            <div>
                                                <p
                                                    className={
                                                        workspaceStyles.panelEyebrow
                                                    }
                                                >
                                                    Management
                                                </p>
                                                <h2
                                                    className={
                                                        workspaceStyles.panelTitle
                                                    }
                                                >
                                                    Grade criteria
                                                </h2>
                                            </div>
                                        </div>

                                        <form
                                            onSubmit={createAssessmentPeriod}
                                            className={managementStyles.stack}
                                        >
                                            <div
                                                className={
                                                    managementStyles.formGrid
                                                }
                                            >
                                                <label
                                                    className={
                                                        managementStyles.field
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            managementStyles.fieldLabel
                                                        }
                                                    >
                                                        Criterion label
                                                    </span>
                                                    <Input
                                                        value={
                                                            assessmentForm.name
                                                        }
                                                        onChange={event =>
                                                            setAssessmentForm(
                                                                current => ({
                                                                    ...current,
                                                                    name: event
                                                                        .target
                                                                        .value,
                                                                }),
                                                            )
                                                        }
                                                        placeholder="e.g. Mid Term Results"
                                                        required
                                                    />
                                                    <span
                                                        className={
                                                            managementStyles.fieldHint
                                                        }
                                                    >
                                                        Add as many examination
                                                        periods or test criteria
                                                        as the school needs.
                                                    </span>
                                                    <InputError
                                                        messages={
                                                            assessmentErrors.name
                                                        }
                                                    />
                                                </label>
                                            </div>

                                            <div
                                                className={
                                                    managementStyles.actions
                                                }
                                            >
                                                <button
                                                    type="submit"
                                                    disabled={savingAssessment}
                                                    className={
                                                        workspaceStyles.button
                                                    }
                                                >
                                                    {savingAssessment
                                                        ? 'Saving...'
                                                        : 'Add criterion'}
                                                </button>
                                            </div>
                                        </form>
                                    </article>

                                    <article className={workspaceStyles.panel}>
                                        <div
                                            className={
                                                workspaceStyles.panelHeader
                                            }
                                        >
                                            <div>
                                                <p
                                                    className={
                                                        workspaceStyles.panelEyebrow
                                                    }
                                                >
                                                    Current setup
                                                </p>
                                                <h2
                                                    className={
                                                        workspaceStyles.panelTitle
                                                    }
                                                >
                                                    Active examination periods
                                                </h2>
                                            </div>
                                        </div>

                                        {assessmentErrors.period ? (
                                            <InputError
                                                messages={
                                                    assessmentErrors.period
                                                }
                                            />
                                        ) : null}

                                        {assessmentPeriods.length === 0 ? (
                                            <p
                                                className={
                                                    managementStyles.notice
                                                }
                                            >
                                                No grade criteria have been
                                                added yet. Add at least one so
                                                teachers can enter results by
                                                period.
                                            </p>
                                        ) : (
                                            <div
                                                className={styles.criteriaList}
                                            >
                                                {assessmentPeriods.map(
                                                    period => (
                                                        <div
                                                            key={period.id}
                                                            className={
                                                                styles.criteriaCard
                                                            }
                                                        >
                                                            <div>
                                                                <strong>
                                                                    {
                                                                        period.name
                                                                    }
                                                                </strong>
                                                                <small>
                                                                    Applies to
                                                                    First,
                                                                    Second, and
                                                                    Third Term
                                                                    item{' '}
                                                                    {
                                                                        period.position
                                                                    }
                                                                    .
                                                                </small>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setConfirmingAssessment(
                                                                        period,
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingAssessmentId ===
                                                                    period.id
                                                                }
                                                                className={
                                                                    managementStyles.dangerButton
                                                                }
                                                            >
                                                                {deletingAssessmentId ===
                                                                period.id
                                                                    ? 'Removing...'
                                                                    : 'Remove'}
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </article>
                                </section>
                            ) : null}

                            <article className={workspaceStyles.fullPanel}>
                                <div className={workspaceStyles.panelHeader}>
                                    <div>
                                        <p
                                            className={
                                                workspaceStyles.panelEyebrow
                                            }
                                        >
                                            Filters
                                        </p>
                                        <h2
                                            className={
                                                workspaceStyles.panelTitle
                                            }
                                        >
                                            Gradebook scope
                                        </h2>
                                    </div>
                                </div>

                                <div className={styles.toolbar}>
                                    <div className={styles.filterGrid}>
                                        <label
                                            className={managementStyles.field}
                                        >
                                            <span
                                                className={
                                                    managementStyles.fieldLabel
                                                }
                                            >
                                                School track
                                            </span>
                                            <select
                                                value={filters.school_track}
                                                onChange={event =>
                                                    setFilters(() => ({
                                                        school_track:
                                                            event.target.value,
                                                        class_name: '',
                                                    }))
                                                }
                                                disabled={Boolean(
                                                    scope?.locked_track,
                                                )}
                                                className={
                                                    managementStyles.select
                                                }
                                            >
                                                <option value="">
                                                    All visible tracks
                                                </option>
                                                {Object.entries(
                                                    options?.schoolTracks ?? {},
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label
                                            className={managementStyles.field}
                                        >
                                            <span
                                                className={
                                                    managementStyles.fieldLabel
                                                }
                                            >
                                                Class
                                            </span>
                                            <select
                                                value={filters.class_name}
                                                onChange={event =>
                                                    setFilters(current => ({
                                                        ...current,
                                                        class_name:
                                                            event.target.value,
                                                    }))
                                                }
                                                disabled={
                                                    Boolean(
                                                        scope?.locked_class_name,
                                                    ) || activeTrack === ''
                                                }
                                                className={
                                                    managementStyles.select
                                                }
                                            >
                                                <option value="">
                                                    {activeTrack === ''
                                                        ? 'Choose a track first'
                                                        : 'All visible classes'}
                                                </option>
                                                {availableClasses.map(
                                                    className => (
                                                        <option
                                                            key={className}
                                                            value={className}
                                                        >
                                                            {className}
                                                        </option>
                                                    ),
                                                )}
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
                                    className={`${styles.statusBar} ${styles.statusError}`}
                                >
                                    {loadError}
                                </div>
                            ) : null}

                            <div className={styles.termStack}>
                                {gradebookTerms.map(term => {
                                    const tableColumnCount =
                                        assessmentPeriods.length > 0
                                            ? 1 + assessmentPeriods.length
                                            : 2
                                    const isOpen = Boolean(
                                        openTerms[term.value],
                                    )

                                    return (
                                        <article
                                            key={term.value}
                                            className={`${workspaceStyles.fullPanel} ${styles.termPanel}`}
                                        >
                                            <button
                                                type="button"
                                                className={
                                                    styles.termHeaderButton
                                                }
                                                aria-expanded={isOpen}
                                                onClick={() =>
                                                    toggleTerm(term.value)
                                                }
                                            >
                                                <div>
                                                    <p
                                                        className={
                                                            workspaceStyles.panelEyebrow
                                                        }
                                                    >
                                                        Learner records
                                                    </p>
                                                    <h2
                                                        className={
                                                            workspaceStyles.panelTitle
                                                        }
                                                    >
                                                        {term.label}
                                                    </h2>
                                                </div>
                                                <span
                                                    className={
                                                        styles.termHeaderMeta
                                                    }
                                                >
                                                    <span>
                                                        {
                                                            assessmentPeriods.length
                                                        }{' '}
                                                        criteria
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.termToggleIcon
                                                        }
                                                        aria-hidden="true"
                                                    >
                                                        {isOpen ? '-' : '+'}
                                                    </span>
                                                </span>
                                            </button>

                                            {isOpen ? (
                                                <div
                                                    className={styles.termBody}
                                                >
                                                    {assessmentPeriods.length ===
                                                    0 ? (
                                                        <p
                                                            className={
                                                                managementStyles.notice
                                                            }
                                                        >
                                                            No examination
                                                            criteria are
                                                            configured for this
                                                            term yet. Head
                                                            teacher accounts can
                                                            add criteria above
                                                            before teachers
                                                            start entering
                                                            grades.
                                                        </p>
                                                    ) : null}

                                                    <div
                                                        className={
                                                            workspaceStyles.tableWrap
                                                        }
                                                    >
                                                        <table
                                                            className={
                                                                workspaceStyles.table
                                                            }
                                                        >
                                                            <thead>
                                                                <tr>
                                                                    <th>
                                                                        Learner
                                                                    </th>
                                                                    {assessmentPeriods.length ===
                                                                    0 ? (
                                                                        <th>
                                                                            Assessment
                                                                            periods
                                                                        </th>
                                                                    ) : (
                                                                        assessmentPeriods.map(
                                                                            period => (
                                                                                <th
                                                                                    key={
                                                                                        period.id
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        period.name
                                                                                    }
                                                                                </th>
                                                                            ),
                                                                        )
                                                                    )}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {loading ? (
                                                                    <tr>
                                                                        <td
                                                                            colSpan={
                                                                                tableColumnCount
                                                                            }
                                                                            className={
                                                                                styles.emptyState
                                                                            }
                                                                        >
                                                                            Loading
                                                                            learner
                                                                            grade
                                                                            records...
                                                                        </td>
                                                                    </tr>
                                                                ) : students.length ===
                                                                  0 ? (
                                                                    <tr>
                                                                        <td
                                                                            colSpan={
                                                                                tableColumnCount
                                                                            }
                                                                            className={
                                                                                styles.emptyState
                                                                            }
                                                                        >
                                                                            No
                                                                            learners
                                                                            match
                                                                            the
                                                                            current
                                                                            scope.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    students.map(
                                                                        student => {
                                                                            const trackSubjects =
                                                                                getTrackSubjects(
                                                                                    options,
                                                                                    student.school_track,
                                                                                )

                                                                            return (
                                                                                <tr
                                                                                    key={
                                                                                        student.id
                                                                                    }
                                                                                >
                                                                                    <td>
                                                                                        <strong>
                                                                                            {
                                                                                                student.full_name
                                                                                            }
                                                                                        </strong>
                                                                                        <small
                                                                                            className={
                                                                                                styles.metaText
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                student.school_track_label
                                                                                            }{' '}
                                                                                            |{' '}
                                                                                            {
                                                                                                student.class_name
                                                                                            }
                                                                                        </small>
                                                                                        <small
                                                                                            className={
                                                                                                styles.metaText
                                                                                            }
                                                                                        >
                                                                                            Guardian:{' '}
                                                                                            {student.guardian_name ||
                                                                                                'Not recorded'}
                                                                                        </small>
                                                                                    </td>

                                                                                    {assessmentPeriods.length ===
                                                                                    0 ? (
                                                                                        <td>
                                                                                            <div
                                                                                                className={
                                                                                                    styles.subjectGradeEmpty
                                                                                                }
                                                                                            >
                                                                                                Waiting
                                                                                                for
                                                                                                a
                                                                                                head
                                                                                                teacher
                                                                                                to
                                                                                                add
                                                                                                grade
                                                                                                criteria.
                                                                                            </div>
                                                                                        </td>
                                                                                    ) : (
                                                                                        assessmentPeriods.map(
                                                                                            period => {
                                                                                                const performanceKey =
                                                                                                    makePerformanceKey(
                                                                                                        term.value,
                                                                                                        period.id,
                                                                                                    )
                                                                                                const draft =
                                                                                                    drafts[
                                                                                                        student
                                                                                                            .id
                                                                                                    ]?.[
                                                                                                        performanceKey
                                                                                                    ] ??
                                                                                                    createPerformanceDraft()
                                                                                                const savedPerformance =
                                                                                                    getPerformanceForPeriod(
                                                                                                        student,
                                                                                                        period.id,
                                                                                                        term.value,
                                                                                                    )
                                                                                                const status =
                                                                                                    getPeriodStatus(
                                                                                                        student,
                                                                                                        period.id,
                                                                                                        term.value,
                                                                                                    )
                                                                                                const locked =
                                                                                                    status ===
                                                                                                        'submitted' ||
                                                                                                    status ===
                                                                                                        'approved'
                                                                                                const readOnly =
                                                                                                    locked ||
                                                                                                    !isTeacherUser(
                                                                                                        user,
                                                                                                    )

                                                                                                return (
                                                                                                    <td
                                                                                                        key={`${student.id}-${performanceKey}`}
                                                                                                    >
                                                                                                        <div
                                                                                                            className={
                                                                                                                styles.periodCell
                                                                                                            }
                                                                                                        >
                                                                                                            {trackSubjects.length ===
                                                                                                            0 ? (
                                                                                                                <div
                                                                                                                    className={
                                                                                                                        styles.subjectGradeEmpty
                                                                                                                    }
                                                                                                                >
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
                                                                                                                    }
                                                                                                                >
                                                                                                                    {trackSubjects.map(
                                                                                                                        subject => (
                                                                                                                            <label
                                                                                                                                key={`${student.id}-${period.id}-${subject.id}`}
                                                                                                                                className={
                                                                                                                                    styles.subjectGradeItem
                                                                                                                                }
                                                                                                                            >
                                                                                                                                <span
                                                                                                                                    className={
                                                                                                                                        styles.subjectGradeLabel
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    {subject.code
                                                                                                                                        ? `${subject.name} (${subject.code})`
                                                                                                                                        : subject.name}
                                                                                                                                </span>
                                                                                                                                <Input
                                                                                                                                    type="number"
                                                                                                                                    min="0"
                                                                                                                                    step="0.1"
                                                                                                                                    disabled={
                                                                                                                                        readOnly ||
                                                                                                                                        Boolean(
                                                                                                                                            savingKey,
                                                                                                                                        )
                                                                                                                                    }
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
                                                                                                                                            term.value,
                                                                                                                                            subject.id,
                                                                                                                                            event
                                                                                                                                                .target
                                                                                                                                                .value,
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

                                                                                                            {trackSubjects.length >
                                                                                                            0
                                                                                                                ? (() => {
                                                                                                                      const periodAverage =
                                                                                                                          computePeriodAverage(
                                                                                                                              student.id,
                                                                                                                              period.id,
                                                                                                                              term.value,
                                                                                                                          )

                                                                                                                      return periodAverage !==
                                                                                                                          null ? (
                                                                                                                          <div
                                                                                                                              className={
                                                                                                                                  styles.periodAverage
                                                                                                                              }
                                                                                                                          >
                                                                                                                              <span
                                                                                                                                  className={
                                                                                                                                      styles.periodAverageLabel
                                                                                                                                  }
                                                                                                                              >
                                                                                                                                  Average
                                                                                                                              </span>
                                                                                                                              <span
                                                                                                                                  className={
                                                                                                                                      styles.periodAverageValue
                                                                                                                                  }
                                                                                                                              >
                                                                                                                                  {
                                                                                                                                      periodAverage
                                                                                                                                  }

                                                                                                                                  %
                                                                                                                              </span>
                                                                                                                          </div>
                                                                                                                      ) : null
                                                                                                                  })()
                                                                                                                : null}

                                                                                                            <textarea
                                                                                                                value={
                                                                                                                    draft.comment
                                                                                                                }
                                                                                                                onChange={event =>
                                                                                                                    updatePeriodDraft(
                                                                                                                        student.id,
                                                                                                                        period.id,
                                                                                                                        term.value,
                                                                                                                        'comment',
                                                                                                                        event
                                                                                                                            .target
                                                                                                                            .value,
                                                                                                                    )
                                                                                                                }
                                                                                                                disabled={
                                                                                                                    readOnly ||
                                                                                                                    Boolean(
                                                                                                                        savingKey,
                                                                                                                    )
                                                                                                                }
                                                                                                                className={`${managementStyles.textarea} ${styles.commentField}`}
                                                                                                                placeholder={`Comment for ${period.name}.`}
                                                                                                            />

                                                                                                            <small
                                                                                                                className={
                                                                                                                    styles.periodMeta
                                                                                                                }
                                                                                                            >
                                                                                                                {status ===
                                                                                                                'approved'
                                                                                                                    ? `Approved on ${
                                                                                                                          savedPerformance?.updated_at
                                                                                                                              ? new Date(
                                                                                                                                    savedPerformance.updated_at,
                                                                                                                                ).toLocaleString()
                                                                                                                              : ''
                                                                                                                      }`
                                                                                                                    : status ===
                                                                                                                        'submitted'
                                                                                                                      ? `Submitted ${
                                                                                                                            savedPerformance?.updated_at
                                                                                                                                ? `on ${new Date(savedPerformance.updated_at).toLocaleString()}`
                                                                                                                                : ''
                                                                                                                        } - awaiting approval`
                                                                                                                      : savedPerformance?.updated_at
                                                                                                                        ? `Draft saved ${new Date(savedPerformance.updated_at).toLocaleString()}`
                                                                                                                        : 'Not saved yet'}
                                                                                                            </small>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                )
                                                                                            },
                                                                                        )
                                                                                    )}
                                                                                </tr>
                                                                            )
                                                                        },
                                                                    )
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </article>
                                    )
                                })}
                            </div>
                            {bottomPageActions}
                        </section>
                    </div>
                ) : (
                    <HomeworkManager />
                )}
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
            <ConfirmDialog
                open={Boolean(confirmingSubmit)}
                eyebrow="Submit grades"
                title="Publish these grades?"
                message={
                    confirmingSubmit && isTeacherUser(user)
                        ? `Submitting will send the saved grades for this class to the head teacher for approval. You will not be able to edit them until the head teacher approves or reopens them, and guardians will only see them once approved. ${pendingDraftCount > 0 ? `${pendingDraftCount} unsaved change(s) will be saved first.` : ''}`
                        : ''
                }
                confirmLabel="Submit grades"
                busyLabel="Submitting..."
                tone="danger"
                busy={submitting}
                onClose={() => setConfirmingSubmit(false)}
                onConfirm={submitGrades}
            />
            <ConfirmDialog
                open={Boolean(confirmingApprove)}
                eyebrow="Approve grades"
                title="Approve and publish these grades?"
                message={
                    confirmingApprove && isManagementUser(user)
                        ? `Approving will publish ${submittedRecordsCount} submitted grade record(s) to the guardians. Once approved, the teacher can no longer edit them unless you reopen grading.`
                        : ''
                }
                confirmLabel="Approve grades"
                busyLabel="Approving..."
                tone="danger"
                busy={submitting}
                onClose={() => setConfirmingApprove(false)}
                onConfirm={approveGrades}
            />
            <ConfirmDialog
                open={Boolean(confirmingReopen)}
                eyebrow="Reopen grading"
                title="Reopen grading for this class?"
                message={
                    confirmingReopen && isManagementUser(user)
                        ? `Reopening will return ${submittedRecordsCount + approvedRecordsCount} submitted or approved grade record(s) to draft. Teachers can then edit and submit them again; approved grades will no longer be visible to guardians until re-approved.`
                        : ''
                }
                confirmLabel="Reopen grading"
                busyLabel="Reopening..."
                tone="danger"
                busy={reopening}
                onClose={() => setConfirmingReopen(false)}
                onConfirm={reopenGrades}
            />
        </>
    )
}
