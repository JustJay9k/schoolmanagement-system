'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import adminStyles from '@/app/(app)/admin/admin-tools.module.css'
import {
    DeleteIcon,
    RefreshIcon,
    ResetIcon,
} from '@/app/(app)/admin/action-icons'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import { useToast } from '@/components/ToastProvider'
import axios from '@/lib/axios'
import { formatRoleLabel, isAdminUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'
import { useEffect, useMemo, useState } from 'react'

const createFilters = () => ({
    search: '',
    school: '',
    track: '',
})

const formatDate = value => {
    if (!value) {
        return 'Not recorded'
    }

    return new Date(value).toLocaleString()
}

export default function AdminDeletedRecordsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const [students, setStudents] = useState([])
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [filters, setFilters] = useState(createFilters())
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [restoringStudentId, setRestoringStudentId] = useState(null)
    const [deletingStudentId, setDeletingStudentId] = useState(null)
    const [confirmingRestoreStudent, setConfirmingRestoreStudent] = useState(null)
    const [confirmingDeleteStudent, setConfirmingDeleteStudent] = useState(null)

    const loadDeletedRecords = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/admin/deleted-records/students')

            setStudents(response.data?.students ?? [])
            setStats(response.data?.stats ?? null)
            setOptions(response.data?.options ?? null)
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load deleted student records right now.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !isAdminUser(user)) {
            return
        }

        loadDeletedRecords()
    }, [user])

    const filteredStudents = useMemo(() => {
        const search = filters.search.trim().toLowerCase()

        return students.filter(student => {
            const matchesSearch =
                search === '' ||
                [
                    student.full_name,
                    student.student_code,
                    student.guardian_name,
                    student.school_name,
                ]
                    .filter(Boolean)
                    .some(value => String(value).toLowerCase().includes(search))

            const matchesSchool =
                filters.school === '' ||
                (filters.school === 'unassigned'
                    ? student.school_id == null
                    : String(student.school_id) === filters.school)

            const matchesTrack =
                filters.track === '' || student.school_track === filters.track

            return matchesSearch && matchesSchool && matchesTrack
        })
    }, [filters, students])

    const restoreStudent = async student => {
        setRestoringStudentId(student.id)

        try {
            await axios.patch(
                `/api/admin/deleted-records/students/${student.id}/restore`,
            )
            showToast({
                type: 'success',
                message: 'Student record restored successfully.',
            })
            await loadDeletedRecords()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to restore this student record.',
            })
        } finally {
            setRestoringStudentId(null)
            setConfirmingRestoreStudent(null)
        }
    }

    const permanentlyDeleteStudent = async student => {
        setDeletingStudentId(student.id)

        try {
            await axios.delete(`/api/admin/deleted-records/students/${student.id}`)
            showToast({
                type: 'success',
                message: 'Student record permanently deleted successfully.',
            })
            await loadDeletedRecords()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to permanently delete this student record.',
            })
        } finally {
            setDeletingStudentId(null)
            setConfirmingDeleteStudent(null)
        }
    }

    if (!user) {
        return null
    }

    if (!isAdminUser(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Administrator access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only administrator accounts can manage deleted records.`}
            >
                <article className={workspaceStyles.panel}>
                    <p className={adminStyles.message}>
                        Ask a current administrator to upgrade your role if you
                        need access to these controls.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <>
            <WorkspacePageShell
                eyebrow="Administration"
                title="Deleted records"
                description="Review student records hidden by head teachers, restore them to the school register, or permanently delete records that should no longer be retained."
                actions={
                    <button
                        type="button"
                        onClick={loadDeletedRecords}
                        aria-label="Refresh deleted records"
                        title="Refresh deleted records"
                        className={`${workspaceStyles.secondaryButton} ${adminStyles.iconButton}`}>
                        <span className={adminStyles.srOnly}>
                            Refresh deleted records
                        </span>
                        <RefreshIcon />
                    </button>
                }
            >
                {loadError ? (
                    <section className={workspaceStyles.panel}>
                        <p
                            className={`${adminStyles.message} ${adminStyles.dangerText}`}>
                            {loadError}
                        </p>
                    </section>
                ) : null}

                <section className={adminStyles.statsGrid}>
                    {[
                        ['Deleted records', stats?.total ?? 0],
                        ['Primary', stats?.primary ?? 0],
                        ['Secondary', stats?.secondary ?? 0],
                        ['Schools affected', stats?.schools ?? 0],
                    ].map(([label, value]) => (
                        <article key={label} className={workspaceStyles.statCard}>
                            <p className={workspaceStyles.statLabel}>{label}</p>
                            <p className={workspaceStyles.statValue}>{value}</p>
                        </article>
                    ))}
                </section>

                <section className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Archive</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Hidden student records
                            </h2>
                        </div>
                    </div>

                    <div className={adminStyles.filterGrid}>
                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>Search</span>
                            <Input
                                value={filters.search}
                                onChange={event =>
                                    setFilters(current => ({
                                        ...current,
                                        search: event.target.value,
                                    }))
                                }
                                placeholder="Name, code, guardian, or school"
                            />
                        </label>

                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>School</span>
                            <select
                                value={filters.school}
                                onChange={event =>
                                    setFilters(current => ({
                                        ...current,
                                        school: event.target.value,
                                    }))
                                }
                                className={adminStyles.select}>
                                <option value="">All schools</option>
                                <option value="unassigned">Unassigned</option>
                                {(options?.schools ?? []).map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>Track</span>
                            <select
                                value={filters.track}
                                onChange={event =>
                                    setFilters(current => ({
                                        ...current,
                                        track: event.target.value,
                                    }))
                                }
                                className={adminStyles.select}>
                                <option value="">All tracks</option>
                                {Object.entries(options?.schoolTracks ?? {}).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                    </div>

                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>School</th>
                                    <th>Class</th>
                                    <th>Guardian</th>
                                    <th>Hidden</th>
                                    <th>Added by</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className={adminStyles.muted}>
                                            Loading deleted student records...
                                        </td>
                                    </tr>
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={adminStyles.muted}>
                                            No deleted student records match the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map(student => (
                                        <tr key={student.id}>
                                            <td>
                                                <strong>{student.full_name}</strong>
                                                <small>
                                                    {student.student_code ?? 'No code recorded'}
                                                </small>
                                            </td>
                                            <td>{student.school_name ?? 'Unassigned'}</td>
                                            <td>
                                                <strong>
                                                    {student.school_track_label ??
                                                        student.school_track}
                                                </strong>
                                                <small>{student.class_name}</small>
                                            </td>
                                            <td>
                                                <strong>
                                                    {student.guardian_name ?? 'Not recorded'}
                                                </strong>
                                                <small>
                                                    {student.guardian_phone ??
                                                        student.guardian_email ??
                                                        'No contact recorded'}
                                                </small>
                                            </td>
                                            <td>{formatDate(student.deleted_at)}</td>
                                            <td>{student.creator_name ?? 'Not recorded'}</td>
                                            <td>
                                                <div className={adminStyles.tableActions}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmingRestoreStudent(
                                                                student,
                                                            )
                                                        }
                                                        disabled={
                                                            restoringStudentId ===
                                                            student.id
                                                        }
                                                        aria-label={`Restore ${student.full_name}`}
                                                        title={`Restore ${student.full_name}`}
                                                        className={`${adminStyles.statusButton} ${adminStyles.statusEnabled} ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            {`Restore ${student.full_name}`}
                                                        </span>
                                                        <ResetIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmingDeleteStudent(student)
                                                        }
                                                        disabled={
                                                            deletingStudentId ===
                                                            student.id
                                                        }
                                                        aria-label={`Permanently delete ${student.full_name}`}
                                                        title={`Permanently delete ${student.full_name}`}
                                                        className={`${adminStyles.dangerButton} ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            {`Permanently delete ${student.full_name}`}
                                                        </span>
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </WorkspacePageShell>

            <ConfirmDialog
                open={Boolean(confirmingRestoreStudent)}
                eyebrow="Restore record"
                title="Restore this student record?"
                message={
                    confirmingRestoreStudent
                        ? `Are you sure you want to restore ${confirmingRestoreStudent.full_name}?`
                        : ''
                }
                confirmLabel="Restore record"
                busyLabel="Restoring..."
                busy={
                    restoringStudentId != null &&
                    restoringStudentId === confirmingRestoreStudent?.id
                }
                onClose={() => setConfirmingRestoreStudent(null)}
                onConfirm={() => {
                    if (confirmingRestoreStudent) {
                        restoreStudent(confirmingRestoreStudent)
                    }
                }}
            />

            <ConfirmDialog
                open={Boolean(confirmingDeleteStudent)}
                eyebrow="Permanent deletion"
                title="Permanently delete this record?"
                message={
                    confirmingDeleteStudent
                        ? `This will remove ${confirmingDeleteStudent.full_name} from deleted records and cannot be restored.`
                        : ''
                }
                confirmLabel="Delete permanently"
                busyLabel="Deleting..."
                tone="danger"
                busy={
                    deletingStudentId != null &&
                    deletingStudentId === confirmingDeleteStudent?.id
                }
                onClose={() => setConfirmingDeleteStudent(null)}
                onConfirm={() => {
                    if (confirmingDeleteStudent) {
                        permanentlyDeleteStudent(confirmingDeleteStudent)
                    }
                }}
            />
        </>
    )
}
