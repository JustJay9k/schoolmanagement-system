'use client'

import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import InputError from '@/components/InputError'
import { useToast } from '@/components/ToastProvider'
import axios from '@/lib/axios'
import { canManageManagementWorkspace, formatRoleLabel } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const buildFormTeacherDrafts = teachers =>
    Object.fromEntries(
        teachers.map(teacher => [teacher.id, teacher.assigned_class_name ?? '']),
    )

const emptySubjectAssignmentForm = {
    teacher_id: '',
    subject_id: '',
    class_name: '',
}

const getTeacherOptionLabel = teacher =>
    teacher.form_class_name
        ? `${teacher.name} - Form teacher (${teacher.form_class_name})`
        : `${teacher.name} - Subject teacher`

export default function ManagementFormTeachersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const [teachers, setTeachers] = useState([])
    const [teacherRequests, setTeacherRequests] = useState([])
    const [activeTab, setActiveTab] = useState('allocations')
    const [activeTrack, setActiveTrack] = useState('secondary')
    const [formTeacherOptions, setFormTeacherOptions] = useState(null)
    const [subjectAssignments, setSubjectAssignments] = useState([])
    const [subjectAssignmentOptions, setSubjectAssignmentOptions] = useState(
        null,
    )
    const [formTeacherDrafts, setFormTeacherDrafts] = useState({})
    const [formTeacherErrors, setFormTeacherErrors] = useState({})
    const [subjectAssignmentForm, setSubjectAssignmentForm] = useState(
        emptySubjectAssignmentForm,
    )
    const [subjectAssignmentErrors, setSubjectAssignmentErrors] = useState({})
    const [loading, setLoading] = useState(true)
    const [savingTeacherId, setSavingTeacherId] = useState(null)
    const [savingSubjectAssignment, setSavingSubjectAssignment] =
        useState(false)
    const [deletingAssignmentId, setDeletingAssignmentId] = useState(null)
    const [processingRequest, setProcessingRequest] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [confirmingAssignment, setConfirmingAssignment] = useState(null)
    const [confirmingRequest, setConfirmingRequest] = useState(null)

    const loadData = async () => {
        setLoading(true)

        try {
            const [formTeachersResponse, subjectAssignmentsResponse] =
                await Promise.all([
                    axios.get('/api/management/form-teachers'),
                    axios.get('/api/management/teacher-subject-assignments'),
                ])

            const nextTeachers = formTeachersResponse.data?.teachers ?? []

            setTeachers(nextTeachers)
            setTeacherRequests(formTeachersResponse.data?.requests ?? [])
            setFormTeacherOptions(formTeachersResponse.data?.options ?? null)
            setFormTeacherDrafts(buildFormTeacherDrafts(nextTeachers))
            setSubjectAssignments(
                subjectAssignmentsResponse.data?.assignments ?? [],
            )
            setSubjectAssignmentOptions(
                subjectAssignmentsResponse.data?.options ?? null,
            )
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load teacher allocations.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageManagementWorkspace(user)) {
            return
        }

        loadData()
    }, [user])

    useEffect(() => {
        const enabledTracks = formTeacherOptions?.enabledTracks ?? []

        if (enabledTracks.length > 0 && !enabledTracks.includes(activeTrack)) {
            setActiveTrack(enabledTracks[0])
        }
    }, [activeTrack, formTeacherOptions])

    const stats = useMemo(
        () => ({
            totalTeachers: teachers.length,
            formTeachers: teachers.filter(teacher => teacher.is_form_teacher)
                .length,
            subjectAllocations: subjectAssignments.length,
            pendingRequests: teacherRequests.filter(
                request => request.status === 'pending',
            ).length,
        }),
        [teachers, subjectAssignments, teacherRequests],
    )

    const teachersForTrack = teachers.filter(
        teacher => teacher.school_track === activeTrack,
    )
    const availableClasses =
        formTeacherOptions?.classesByTrack?.[activeTrack] ?? []
    const availableAssignmentTeachers =
        subjectAssignmentOptions?.teachers ?? []
    const availableSubjects = subjectAssignmentOptions?.subjects ?? []

    const getTakenClassesForTeacher = teacherId =>
        teachers
            .filter(
                teacher =>
                    teacher.id !== teacherId &&
                    teacher.school_track === activeTrack &&
                    typeof teacher.assigned_class_name === 'string' &&
                    teacher.assigned_class_name !== '',
            )
            .map(teacher => teacher.assigned_class_name)

    const classCoverage = availableClasses.map(className => {
        const assignedTeacher = teachersForTrack.find(
            teacher => teacher.assigned_class_name === className,
        )

        return {
            className,
            teacherName: assignedTeacher?.name ?? null,
        }
    })

    const getTeacherRoleLabel = teacher =>
        ['preschool', 'primary'].includes(teacher.school_track)
            ? `${teacher.school_track === 'preschool' ? 'Preschool' : 'Primary'} class teacher`
            : teacher.assigned_class_name
              ? 'Form teacher and subject teacher'
              : 'Subject teacher only'

    const updateFormTeacherDraft = (teacherId, value) => {
        setFormTeacherDrafts(current => ({
            ...current,
            [teacherId]: value,
        }))
        setFormTeacherErrors(current => ({
            ...current,
            [teacherId]: {},
        }))
    }

    const saveFormTeacherAllocation = async (teacherId, assignedClassName) => {
        setSavingTeacherId(teacherId)

        try {
            const response = await axios.put(
                `/api/management/form-teachers/${teacherId}`,
                {
                    assigned_class_name: assignedClassName,
                },
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Form teacher allocation updated successfully.',
            })
            setFormTeacherErrors(current => ({
                ...current,
                [teacherId]: {},
            }))
            await loadData()
        } catch (error) {
            setFormTeacherErrors(current => ({
                ...current,
                [teacherId]: error?.response?.data?.errors ?? {},
            }))
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update the form teacher allocation.',
            })
        } finally {
            setSavingTeacherId(null)
        }
    }

    const createSubjectAssignment = async event => {
        event.preventDefault()
        setSavingSubjectAssignment(true)
        setSubjectAssignmentErrors({})

        try {
            const response = await axios.post(
                '/api/management/teacher-subject-assignments',
                subjectAssignmentForm,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Subject teaching allocation created successfully.',
            })
            setSubjectAssignmentForm(emptySubjectAssignmentForm)
            await loadData()
        } catch (error) {
            setSubjectAssignmentErrors(error?.response?.data?.errors ?? {})
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to create the subject teaching allocation.',
            })
        } finally {
            setSavingSubjectAssignment(false)
        }
    }

    const deleteSubjectAssignment = async assignment => {
        setDeletingAssignmentId(assignment.id)

        try {
            const response = await axios.delete(
                `/api/management/teacher-subject-assignments/${assignment.id}`,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Subject teaching allocation removed successfully.',
            })
            await loadData()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to remove the subject teaching allocation.',
            })
        } finally {
            setDeletingAssignmentId(null)
            setConfirmingAssignment(null)
        }
    }

    const respondToTeacherRequest = async (teacher, action) => {
        setProcessingRequest(`${action}-${teacher.id}`)

        try {
            const response = await axios.post(
                `/api/management/form-teachers/${teacher.id}/${action}`,
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    `Teacher request ${action === 'approve' ? 'accepted' : 'denied'}.`,
            })
            await loadData()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update the teacher request.',
            })
        } finally {
            setProcessingRequest(null)
            setConfirmingRequest(null)
        }
    }

    if (!user) {
        return null
    }

    if (!canManageManagementWorkspace(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Management access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only head teacher / management accounts can allocate teacher responsibilities.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Primary and secondary teacher allocation and subject
                        teaching allocation belong to the management workspace.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Management"
            title="Teacher allocations"
            description="Manage primary class teachers and secondary form teachers separately, see unassigned classes, and allocate secondary subject teaching."
            actions={
                <div className={managementStyles.toolbarGroup}>
                    <button
                        type="button"
                        onClick={loadData}
                        className={workspaceStyles.secondaryButton}>
                        Refresh
                    </button>
                </div>
            }>
            {loadError ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            managementStyles.dangerText
                        }`}>
                        {loadError}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['Primary and secondary teachers', stats.totalTeachers],
                    ['Assigned classes', stats.formTeachers],
                    ['Subject allocations', stats.subjectAllocations],
                    ['Pending requests', stats.pendingRequests],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <div className={managementStyles.tabList} role="tablist" aria-label="Teacher allocation tabs">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'allocations'}
                    onClick={() => setActiveTab('allocations')}
                    className={`${managementStyles.tabButton} ${
                        activeTab === 'allocations' ? managementStyles.tabButtonActive : ''
                    }`}>
                    Allocations
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'requests'}
                    onClick={() => setActiveTab('requests')}
                    className={`${managementStyles.tabButton} ${
                        activeTab === 'requests' ? managementStyles.tabButtonActive : ''
                    }`}>
                    Approval requests
                </button>
            </div>

            {activeTab === 'requests' ? (
                <section className={managementStyles.summaryCards}>
                    <article className={workspaceStyles.fullPanel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Teacher Requests
                                </p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    Account approval requests
                                </h2>
                            </div>
                        </div>

                        <div className={workspaceStyles.tableWrap}>
                            <table className={workspaceStyles.table}>
                                <thead>
                                    <tr>
                                        <th>Teacher</th>
                                        <th>Request</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className={managementStyles.muted}>
                                                Loading teacher requests...
                                            </td>
                                        </tr>
                                    ) : teacherRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className={managementStyles.muted}>
                                                No teacher account requests yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        teacherRequests.map(request => {
                                            const approving =
                                                processingRequest ===
                                                `approve-${request.id}`
                                            const denying =
                                                processingRequest ===
                                                `deny-${request.id}`
                                            const canRespond =
                                                request.status === 'pending' &&
                                                processingRequest === null

                                            return (
                                                <tr key={request.id}>
                                                    <td>
                                                        <strong>{request.name}</strong>
                                                        <small>{request.email}</small>
                                                    </td>
                                                    <td>
                                                        <strong>
                                                                                                                        {request.school_track === 'preschool'
                                                                                                                                ? 'Preschool teacher'
                                                                                                                                : request.school_track === 'primary'
                                                                                                                                    ? 'Primary teacher'
                                                                                                                                    : 'Secondary teacher'}
                                                        </strong>
                                                        <small>
                                                            {request.assigned_class_name
                                                                ? `Requested class: ${request.assigned_class_name}`
                                                                : 'No class responsibility requested'}
                                                        </small>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`${managementStyles.requestBadge} ${
                                                                request.status === 'pending'
                                                                    ? managementStyles.requestBadgePending
                                                                    : managementStyles.requestBadgeDenied
                                                            }`}>
                                                            {request.status_label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className={managementStyles.tableActions}>
                                                            <Button
                                                                type="button"
                                                                disabled={!canRespond}
                                                                onClick={() =>
                                                                    setConfirmingRequest({
                                                                        teacher: request,
                                                                        action: 'approve',
                                                                    })
                                                                }>
                                                                {approving ? 'Accepting...' : 'Accept'}
                                                            </Button>
                                                            <button
                                                                type="button"
                                                                disabled={!canRespond}
                                                                onClick={() =>
                                                                    setConfirmingRequest({
                                                                        teacher: request,
                                                                        action: 'deny',
                                                                    })
                                                                }
                                                                className={managementStyles.dangerButton}>
                                                                {denying ? 'Denying...' : 'Deny'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>

                    <article className={workspaceStyles.panel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Access
                                </p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    What happens next
                                </h2>
                            </div>
                        </div>

                        <div className={workspaceStyles.list}>
                            <div className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Accepted teachers can sign in</strong>
                                    <p>
                                        Their account becomes active and appears in
                                        allocation tools.
                                    </p>
                                </div>
                            </div>
                            <div className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Denied teachers stay blocked</strong>
                                    <p>
                                        They will see a denial message when they try
                                        to sign in.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>
            ) : (
                <>
            <div className={managementStyles.tabList} role="tablist" aria-label="School section allocations">
                {(formTeacherOptions?.enabledTracks ?? ['primary', 'secondary']).map(track => (
                    <button
                        key={track}
                        type="button"
                        role="tab"
                        aria-selected={activeTrack === track}
                        onClick={() => setActiveTrack(track)}
                        className={`${managementStyles.tabButton} ${
                            activeTrack === track ? managementStyles.tabButtonActive : ''
                        }`}>
                        {track === 'primary' ? 'Primary classes' : 'Secondary classes'}
                    </button>
                ))}
            </div>

            <section className={managementStyles.summaryCards}>
                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                {activeTrack === 'primary' ? 'Primary' : 'Secondary'} class coverage
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Assigned and unassigned classes
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.list}>
                        {classCoverage.map(({ className, teacherName }) => (
                            <div key={className} className={workspaceStyles.listItem}>
                                <div>
                                    <strong>{className}</strong>
                                    <p>
                                        {teacherName
                                            ? `Assigned to ${teacherName}`
                                            : 'No teacher assigned yet'}
                                    </p>
                                </div>
                                <span className={`${managementStyles.requestBadge} ${
                                    teacherName
                                        ? managementStyles.requestBadgePending
                                        : managementStyles.requestBadgeDenied
                                }`}>
                                    {teacherName ? 'Assigned' : 'Unassigned'}
                                </span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                {activeTrack === 'primary'
                                    ? 'Class Responsibility'
                                    : 'Form Responsibility'}
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {activeTrack === 'primary'
                                    ? 'Primary class teacher assignments'
                                    : 'Secondary form teacher assignments'}
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>Teacher</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>
                                        {activeTrack === 'primary'
                                            ? 'Class'
                                            : 'Form class'}
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className={managementStyles.muted}>
                                            Loading {activeTrack} teachers...
                                        </td>
                                    </tr>
                                ) : teachersForTrack.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className={managementStyles.muted}>
                                            No {activeTrack} teachers found.
                                        </td>
                                    </tr>
                                ) : (
                                    teachersForTrack.map(teacher => {
                                        const takenClassesForTeacher =
                                            getTakenClassesForTeacher(teacher.id)
                                        const fieldErrors =
                                            formTeacherErrors[teacher.id] ?? {}
                                        const currentDraft =
                                            formTeacherDrafts[teacher.id] ?? ''
                                        const isSaving =
                                            savingTeacherId === teacher.id

                                        return (
                                            <tr key={teacher.id}>
                                                <td>
                                                    <strong>{teacher.name}</strong>
                                                    <small>{teacher.email}</small>
                                                </td>
                                                        <td>{getTeacherRoleLabel(teacher)}</td>
                                                <td>{teacher.status_label}</td>
                                                <td>
                                                    <div className={managementStyles.field}>
                                                        <select
                                                            value={currentDraft}
                                                            onChange={event =>
                                                                updateFormTeacherDraft(
                                                                    teacher.id,
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            className={
                                                                managementStyles.select
                                                            }
                                                            disabled={
                                                                !teacher.can_receive_form_class ||
                                                                isSaving
                                                            }>
                                                            <option value="">
                                                                No form class
                                                            </option>
                                                            {availableClasses.map(
                                                                className => {
                                                                        const reservedByOtherTeacher =
                                                                        takenClassesForTeacher.includes(
                                                                            className,
                                                                        ) &&
                                                                        className !==
                                                                            currentDraft

                                                                    return (
                                                                        <option
                                                                            key={
                                                                                className
                                                                            }
                                                                            value={
                                                                                className
                                                                            }
                                                                            disabled={
                                                                                reservedByOtherTeacher
                                                                            }>
                                                                            {reservedByOtherTeacher
                                                                                ? `${className} (already assigned)`
                                                                                : className}
                                                                        </option>
                                                                    )
                                                                },
                                                            )}
                                                        </select>
                                                        <InputError
                                                            messages={
                                                                fieldErrors.assigned_class_name
                                                            }
                                                        />
                                                        <InputError
                                                            messages={
                                                                fieldErrors.teacher
                                                            }
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div
                                                        className={
                                                            managementStyles.tableActions
                                                        }>
                                                        <Button
                                                            type="button"
                                                            disabled={
                                                                isSaving ||
                                                                !teacher.can_receive_form_class
                                                            }
                                                            onClick={() =>
                                                                saveFormTeacherAllocation(
                                                                    teacher.id,
                                                                    currentDraft,
                                                                )
                                                            }>
                                                            {isSaving
                                                                ? 'Saving...'
                                                                : 'Save'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Teaching Rules
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                How this works
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.list}>
                        <div className={workspaceStyles.listItem}>
                            <div>
                                <strong>Subject teachers stay separate</strong>
                                <p>
                                    Secondary teachers can teach subjects
                                    without holding any single class
                                    responsibility.
                                </p>
                            </div>
                        </div>
                        <div className={workspaceStyles.listItem}>
                            <div>
                                <strong>Form class is one extra duty</strong>
                                <p>
                                    Allocate one form class only when that
                                    teacher should report class-wide issues to
                                    the Head Master.
                                </p>
                            </div>
                        </div>
                        <div className={workspaceStyles.listItem}>
                            <div>
                                <strong>Both roles can live together</strong>
                                <p>
                                    A form teacher can still be allocated
                                    subjects in their own class and in other
                                    secondary classes.
                                </p>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            {activeTrack === 'secondary' ? (
            <section className={managementStyles.summaryCards}>
                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Subject Teaching
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Subject and class allocations
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>Teacher</th>
                                    <th>Subject</th>
                                    <th>Class</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className={managementStyles.muted}>
                                            Loading subject allocations...
                                        </td>
                                    </tr>
                                ) : subjectAssignments.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className={managementStyles.muted}>
                                            No subject teaching allocations yet.
                                        </td>
                                    </tr>
                                ) : (
                                    subjectAssignments.map(assignment => (
                                        <tr key={assignment.id}>
                                            <td>
                                                <strong>
                                                    {assignment.teacher?.name ??
                                                        'Teacher missing'}
                                                </strong>
                                                <small>
                                                    {assignment.teacher
                                                        ?.form_class_name
                                                        ? `Form class: ${assignment.teacher.form_class_name}`
                                                        : 'Subject teacher only'}
                                                </small>
                                            </td>
                                            <td>
                                                <strong>
                                                    {assignment.subject?.name ??
                                                        'Subject missing'}
                                                </strong>
                                                <small>
                                                    {assignment.subject?.code ||
                                                        'No code'}
                                                </small>
                                            </td>
                                            <td>{assignment.class_name}</td>
                                            <td>
                                                <div
                                                    className={
                                                        managementStyles.tableActions
                                                    }>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmingAssignment(
                                                                assignment,
                                                            )
                                                        }
                                                        disabled={
                                                            deletingAssignmentId ===
                                                            assignment.id
                                                        }
                                                        className={
                                                            managementStyles.dangerButton
                                                        }>
                                                        {deletingAssignmentId ===
                                                        assignment.id
                                                            ? 'Removing...'
                                                            : 'Remove'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                New Allocation
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Assign subject teacher
                            </h2>
                        </div>
                    </div>

                    <form
                        onSubmit={createSubjectAssignment}
                        className={managementStyles.stack}>
                        <label className={managementStyles.field}>
                            <span className={managementStyles.fieldLabel}>
                                Teacher
                            </span>
                            <select
                                value={subjectAssignmentForm.teacher_id}
                                onChange={event =>
                                    setSubjectAssignmentForm(current => ({
                                        ...current,
                                        teacher_id: event.target.value,
                                    }))
                                }
                                className={managementStyles.select}
                                required>
                                <option value="">Select a teacher</option>
                                {availableAssignmentTeachers.map(teacher => (
                                    <option
                                        key={teacher.id}
                                        value={teacher.id}>
                                        {getTeacherOptionLabel(teacher)}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                messages={subjectAssignmentErrors.teacher_id}
                            />
                        </label>

                        <label className={managementStyles.field}>
                            <span className={managementStyles.fieldLabel}>
                                Subject
                            </span>
                            <select
                                value={subjectAssignmentForm.subject_id}
                                onChange={event =>
                                    setSubjectAssignmentForm(current => ({
                                        ...current,
                                        subject_id: event.target.value,
                                    }))
                                }
                                className={managementStyles.select}
                                required>
                                <option value="">Select a subject</option>
                                {availableSubjects.map(subject => (
                                    <option
                                        key={subject.id}
                                        value={subject.id}>
                                        {subject.code
                                            ? `${subject.name} (${subject.code})`
                                            : subject.name}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                messages={subjectAssignmentErrors.subject_id}
                            />
                        </label>

                        <label className={managementStyles.field}>
                            <span className={managementStyles.fieldLabel}>
                                Class
                            </span>
                            <select
                                value={subjectAssignmentForm.class_name}
                                onChange={event =>
                                    setSubjectAssignmentForm(current => ({
                                        ...current,
                                        class_name: event.target.value,
                                    }))
                                }
                                className={managementStyles.select}
                                required>
                                <option value="">Select a class</option>
                                {availableClasses.map(className => (
                                    <option
                                        key={className}
                                        value={className}>
                                        {className}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                messages={subjectAssignmentErrors.class_name}
                            />
                        </label>

                        <InputError
                            messages={subjectAssignmentErrors.assignment}
                        />

                        <div className={managementStyles.actions}>
                            <Button disabled={savingSubjectAssignment}>
                                {savingSubjectAssignment
                                    ? 'Saving...'
                                    : 'Create allocation'}
                            </Button>
                        </div>
                    </form>
                </article>
            </section>
            ) : null}
                </>
            )}
            <ConfirmDialog
                open={Boolean(confirmingAssignment)}
                eyebrow="Remove allocation"
                title="Remove this subject allocation?"
                message={
                    confirmingAssignment
                        ? `Remove ${confirmingAssignment.subject?.name ?? 'this subject'} from ${
                              confirmingAssignment.teacher?.name ?? 'this teacher'
                          } in ${confirmingAssignment.class_name}?`
                        : ''
                }
                confirmLabel="Remove allocation"
                busyLabel="Removing..."
                tone="danger"
                busy={
                    deletingAssignmentId != null &&
                    deletingAssignmentId === confirmingAssignment?.id
                }
                onClose={() => setConfirmingAssignment(null)}
                onConfirm={() => {
                    if (confirmingAssignment) {
                        deleteSubjectAssignment(confirmingAssignment)
                    }
                }}
            />
            <ConfirmDialog
                open={Boolean(confirmingRequest)}
                eyebrow={
                    confirmingRequest?.action === 'approve'
                        ? 'Accept request'
                        : 'Deny request'
                }
                title={
                    confirmingRequest?.action === 'approve'
                        ? 'Accept this teacher account?'
                        : 'Deny this teacher account?'
                }
                message={
                    confirmingRequest?.teacher
                        ? confirmingRequest.action === 'approve'
                            ? `${confirmingRequest.teacher.name} will be able to sign in and appear in teacher allocation tools.`
                            : `${confirmingRequest.teacher.name} will remain blocked from signing in and will see that the request was denied.`
                        : ''
                }
                confirmLabel={
                    confirmingRequest?.action === 'approve'
                        ? 'Accept account'
                        : 'Deny account'
                }
                busyLabel={
                    confirmingRequest?.action === 'approve'
                        ? 'Accepting...'
                        : 'Denying...'
                }
                tone={confirmingRequest?.action === 'deny' ? 'danger' : 'default'}
                busy={Boolean(processingRequest)}
                onClose={() => {
                    if (!processingRequest) {
                        setConfirmingRequest(null)
                    }
                }}
                onConfirm={() => {
                    if (confirmingRequest) {
                        respondToTeacherRequest(
                            confirmingRequest.teacher,
                            confirmingRequest.action,
                        )
                    }
                }}
            />
        </WorkspacePageShell>
    )
}
