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

const buildDrafts = teachers =>
    Object.fromEntries(
        teachers.map(teacher => [teacher.id, teacher.form_class_name ?? '']),
    )

const getTeacherRoleLabel = teacher =>
    teacher.is_form_teacher
        ? 'Form teacher and subject teacher'
        : 'Subject teacher only'

export default function ManagementFormTeachersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [teachers, setTeachers] = useState([])
    const [options, setOptions] = useState(null)
    const [drafts, setDrafts] = useState({})
    const [rowErrors, setRowErrors] = useState({})
    const [loading, setLoading] = useState(true)
    const [savingTeacherId, setSavingTeacherId] = useState(null)
    const [pageStatus, setPageStatus] = useState(null)

    const loadTeachers = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/management/form-teachers')
            const nextTeachers = response.data?.teachers ?? []

            setTeachers(nextTeachers)
            setOptions(response.data?.options ?? null)
            setDrafts(buildDrafts(nextTeachers))
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load secondary form-teacher allocations.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageManagementWorkspace(user)) {
            return
        }

        loadTeachers()
    }, [user])

    const stats = useMemo(
        () => ({
            total: teachers.length,
            formTeachers: teachers.filter(teacher => teacher.is_form_teacher)
                .length,
            subjectOnly: teachers.filter(teacher => !teacher.is_form_teacher)
                .length,
        }),
        [teachers],
    )

    const availableClasses = options?.secondaryClasses ?? []

    const getTakenClassesForTeacher = teacherId =>
        teachers
            .filter(
                teacher =>
                    teacher.id !== teacherId &&
                    typeof teacher.form_class_name === 'string' &&
                    teacher.form_class_name !== '',
            )
            .map(teacher => teacher.form_class_name)

    const updateDraft = (teacherId, value) => {
        setDrafts(current => ({
            ...current,
            [teacherId]: value,
        }))
        setRowErrors(current => ({
            ...current,
            [teacherId]: {},
        }))
    }

    const saveAllocation = async (teacherId, assignedClassName) => {
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
            setRowErrors(current => ({
                ...current,
                [teacherId]: {},
            }))
            await loadTeachers()
        } catch (error) {
            setRowErrors(current => ({
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

    if (!user) {
        return null
    }

    if (!canManageManagementWorkspace(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Management access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only head teacher / management accounts can allocate form teachers.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Secondary form-teacher allocation belongs to the
                        management workspace.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Management"
            title="Secondary form teachers"
            description="Allocate one form class to each secondary form teacher while keeping ordinary subject teachers available with no form class."
            actions={
                <div className={managementStyles.toolbarGroup}>
                    <button
                        type="button"
                        onClick={loadTeachers}
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
                    ['Secondary teachers', stats.total],
                    ['Form teachers', stats.formTeachers],
                    ['Subject only', stats.subjectOnly],
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
                                Allocation Desk
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
                                            rowErrors[teacher.id] ?? {}
                                        const currentDraft =
                                            drafts[teacher.id] ?? ''
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
                                                                updateDraft(
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
                                                                saveAllocation(
                                                                    teacher.id,
                                                                    currentDraft,
                                                                )
                                                            }>
                                                            {isSaving
                                                                ? 'Saving...'
                                                                : 'Save'}
                                                        </Button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                updateDraft(
                                                                    teacher.id,
                                                                    '',
                                                                )
                                                                saveAllocation(
                                                                    teacher.id,
                                                                    '',
                                                                )
                                                            }}
                                                            disabled={
                                                                isSaving ||
                                                                (!teacher
                                                                    .form_class_name &&
                                                                    !currentDraft)
                                                            }
                                                            className={
                                                                managementStyles.secondaryButton
                                                            }>
                                                            Clear
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
                                Workflow
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
                                <strong>Form class is optional</strong>
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
                                    A secondary teacher can remain a subject
                                    teacher and also hold one form class at the
                                    same time.
                                </p>
                            </div>
                        </div>
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
