'use client'

import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import Button from '@/components/Button'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import { canManageManagementWorkspace, formatRoleLabel } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const buildFormTeacherDrafts = teachers =>
    Object.fromEntries(
        teachers.map(teacher => [teacher.id, teacher.form_class_name ?? '']),
    )

const emptySubjectAssignmentForm = {
    teacher_id: '',
    subject_id: '',
    class_name: '',
}

const getTeacherRoleLabel = teacher =>
    teacher.is_form_teacher
        ? 'Form teacher and subject teacher'
        : 'Subject teacher only'

const getTeacherOptionLabel = teacher =>
    teacher.form_class_name
        ? `${teacher.name} - Form teacher (${teacher.form_class_name})`
        : `${teacher.name} - Subject teacher`

export default function ManagementFormTeachersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [teachers, setTeachers] = useState([])
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
    const [pageStatus, setPageStatus] = useState(null)

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
            setFormTeacherOptions(formTeachersResponse.data?.options ?? null)
            setFormTeacherDrafts(buildFormTeacherDrafts(nextTeachers))
            setSubjectAssignments(
                subjectAssignmentsResponse.data?.assignments ?? [],
            )
            setSubjectAssignmentOptions(
                subjectAssignmentsResponse.data?.options ?? null,
            )
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load teacher allocations.',
            })
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

    const stats = useMemo(
        () => ({
            totalTeachers: teachers.length,
            formTeachers: teachers.filter(teacher => teacher.is_form_teacher)
                .length,
            subjectAllocations: subjectAssignments.length,
        }),
        [teachers, subjectAssignments],
    )

    const availableClasses = formTeacherOptions?.secondaryClasses ?? []
    const availableAssignmentTeachers =
        subjectAssignmentOptions?.teachers ?? []
    const availableSubjects = subjectAssignmentOptions?.subjects ?? []

    const getTakenClassesForTeacher = teacherId =>
        teachers
            .filter(
                teacher =>
                    teacher.id !== teacherId &&
                    typeof teacher.form_class_name === 'string' &&
                    teacher.form_class_name !== '',
            )
            .map(teacher => teacher.form_class_name)

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
        setPageStatus(null)

        try {
            const response = await axios.put(
                `/api/management/form-teachers/${teacherId}`,
                {
                    assigned_class_name: assignedClassName,
                },
            )

            setPageStatus({
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
            setPageStatus({
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
        setPageStatus(null)

        try {
            const response = await axios.post(
                '/api/management/teacher-subject-assignments',
                subjectAssignmentForm,
            )

            setPageStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'Subject teaching allocation created successfully.',
            })
            setSubjectAssignmentForm(emptySubjectAssignmentForm)
            await loadData()
        } catch (error) {
            setSubjectAssignmentErrors(error?.response?.data?.errors ?? {})
            setPageStatus({
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
        if (
            !window.confirm(
                `Remove ${assignment.subject?.name ?? 'this subject'} from ${
                    assignment.teacher?.name ?? 'this teacher'
                } in ${assignment.class_name}?`,
            )
        ) {
            return
        }

        setDeletingAssignmentId(assignment.id)
        setPageStatus(null)

        try {
            const response = await axios.delete(
                `/api/management/teacher-subject-assignments/${assignment.id}`,
            )

            setPageStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'Subject teaching allocation removed successfully.',
            })
            await loadData()
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to remove the subject teaching allocation.',
            })
        } finally {
            setDeletingAssignmentId(null)
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
                        Secondary form-teacher allocation and subject teaching
                        allocation both belong to the management workspace.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Management"
            title="Teacher allocations"
            description="Assign one secondary form class to each form teacher, then allocate the subjects and classes each secondary teacher will actually teach."
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
            {pageStatus ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            pageStatus.type === 'error'
                                ? managementStyles.dangerText
                                : ''
                        }`}>
                        {pageStatus.message}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['Secondary teachers', stats.totalTeachers],
                    ['Form teachers', stats.formTeachers],
                    ['Subject allocations', stats.subjectAllocations],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={managementStyles.summaryCards}>
                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Form Responsibility
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Form teacher assignments
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
                                    <th>Form class</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className={managementStyles.muted}>
                                            Loading secondary teachers...
                                        </td>
                                    </tr>
                                ) : teachers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className={managementStyles.muted}>
                                            No secondary teachers found.
                                        </td>
                                    </tr>
                                ) : (
                                    teachers.map(teacher => {
                                        const takenClasses =
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
                                                                        takenClasses.includes(
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
                                                            deleteSubjectAssignment(
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
        </WorkspacePageShell>
    )
}
