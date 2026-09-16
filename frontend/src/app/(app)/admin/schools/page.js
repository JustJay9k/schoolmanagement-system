'use client'

import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import adminStyles from '@/app/(app)/admin/admin-tools.module.css'
import {
    DeleteIcon,
    EditIcon,
    RefreshIcon,
    StatusIcon,
} from '@/app/(app)/admin/action-icons'
import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import { useToast } from '@/components/ToastProvider'
import axios from '@/lib/axios'
import { formatRoleLabel, isAdminUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const emptyForm = {
    name: '',
}

const formatDate = value => {
    if (!value) {
        return 'Not recorded'
    }

    return new Date(value).toLocaleString()
}

export default function AdminSchoolsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const [schools, setSchools] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [formErrors, setFormErrors] = useState({})
    const [editingSchool, setEditingSchool] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmingSchool, setConfirmingSchool] = useState(null)
    const [busyAction, setBusyAction] = useState(null)

    const loadSchools = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/admin/schools')

            setSchools(response.data?.schools ?? [])
            setStats(response.data?.stats ?? null)
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load schools right now.',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !isAdminUser(user)) {
            return
        }

        loadSchools()
    }, [user])

    const schoolStats = useMemo(
        () => ({
            total: stats?.total ?? schools.length,
            locked:
                stats?.locked ??
                schools.filter(school => school.is_locked).length,
            unlocked:
                stats?.unlocked ??
                schools.filter(school => !school.is_locked).length,
            users: schools.reduce(
                (total, school) => total + (school.users_count ?? 0),
                0,
            ),
        }),
        [schools, stats],
    )

    const resetForm = () => {
        setForm(emptyForm)
        setFormErrors({})
        setEditingSchool(null)
    }

    const startEdit = school => {
        setEditingSchool(school)
        setForm({ name: school.name ?? '' })
        setFormErrors({})
    }

    const submitForm = async event => {
        event.preventDefault()
        setSaving(true)
        setFormErrors({})

        try {
            const response = editingSchool
                ? await axios.put(`/api/admin/schools/${editingSchool.id}`, form)
                : await axios.post('/api/admin/schools', form)

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    (editingSchool
                        ? 'School renamed successfully.'
                        : 'School created successfully.'),
            })
            resetForm()
            await loadSchools()
        } catch (error) {
            setFormErrors(error?.response?.data?.errors ?? {})
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save this school.',
            })
        } finally {
            setSaving(false)
        }
    }

    const runSchoolAction = async (school, action) => {
        setBusyAction(`${action}-${school.id}`)

        try {
            const response =
                action === 'delete'
                    ? await axios.delete(`/api/admin/schools/${school.id}`)
                    : await axios.post(`/api/admin/schools/${school.id}/${action}`)

            showToast({
                type: 'success',
                message: response.data?.message ?? 'School updated successfully.',
            })
            await loadSchools()
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update this school.',
            })
        } finally {
            setBusyAction(null)
            setConfirmingSchool(null)
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
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only administrators can manage schools.`}>
                <article className={workspaceStyles.panel}>
                    <p className={adminStyles.message}>
                        Ask a current administrator to grant the correct role if
                        you need to manage schools.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Administration"
            title="Schools"
            description="Review every school in the system, create new schools, rename existing schools, and lock access when a school should pause all actions."
            actions={
                <button
                    type="button"
                    onClick={loadSchools}
                    aria-label="Refresh schools"
                    title="Refresh schools"
                    className={`${workspaceStyles.secondaryButton} ${adminStyles.iconButton}`}>
                    <span className={adminStyles.srOnly}>Refresh schools</span>
                    <RefreshIcon />
                </button>
            }>
            {loadError ? (
                <section className={workspaceStyles.panel}>
                    <p className={`${adminStyles.message} ${adminStyles.dangerText}`}>
                        {loadError}
                    </p>
                </section>
            ) : null}

            <section className={adminStyles.statsGrid}>
                {[
                    ['Total schools', schoolStats.total],
                    ['Unlocked', schoolStats.unlocked],
                    ['Locked', schoolStats.locked],
                    ['Users assigned', schoolStats.users],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={adminStyles.splitPanel}>
                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Schools</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                System school list
                            </h2>
                        </div>
                    </div>

                    <div
                        className={`${workspaceStyles.tableWrap} ${adminStyles.userTableWrap}`}>
                        <table
                            className={`${workspaceStyles.table} ${adminStyles.userAccountsTable}`}>
                            <thead>
                                <tr>
                                    <th>School</th>
                                    <th>Status</th>
                                    <th>Users</th>
                                    <th>Students</th>
                                    <th>Locked by</th>
                                    <th>Updated</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className={`${adminStyles.muted} ${adminStyles.tableStateCell}`}>
                                            Loading schools...
                                        </td>
                                    </tr>
                                ) : schools.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className={`${adminStyles.muted} ${adminStyles.tableStateCell}`}>
                                            No schools have been created yet.
                                        </td>
                                    </tr>
                                ) : (
                                    schools.map(school => (
                                        <tr key={school.id}>
                                            <td data-label="School">
                                                <strong>{school.name}</strong>
                                                <small>School ID: {school.id}</small>
                                            </td>
                                            <td data-label="Status">
                                                <span
                                                    className={`${adminStyles.statusBadge} ${
                                                        school.is_locked
                                                            ? adminStyles.statusSuspended
                                                            : adminStyles.statusActive
                                                    }`}>
                                                    {school.is_locked
                                                        ? 'Locked'
                                                        : 'Unlocked'}
                                                </span>
                                            </td>
                                            <td data-label="Users">
                                                {school.users_count ?? 0}
                                            </td>
                                            <td data-label="Students">
                                                {school.student_records_count ?? 0}
                                            </td>
                                            <td data-label="Locked by">
                                                {school.is_locked ? (
                                                    <>
                                                        <strong>
                                                            {school.locked_by?.name ??
                                                                'Administrator'}
                                                        </strong>
                                                        <small>
                                                            {formatDate(school.locked_at)}
                                                        </small>
                                                    </>
                                                ) : (
                                                    <small>Not locked</small>
                                                )}
                                            </td>
                                            <td data-label="Updated">
                                                {formatDate(school.updated_at)}
                                            </td>
                                            <td data-label="Actions">
                                                <div className={adminStyles.tableActions}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(school)}
                                                        aria-label={`Rename ${school.name}`}
                                                        title={`Rename ${school.name}`}
                                                        className={`${adminStyles.ghostButton} ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            Rename {school.name}
                                                        </span>
                                                        <EditIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmingSchool({
                                                                school,
                                                                action: school.is_locked
                                                                    ? 'unlock'
                                                                    : 'lock',
                                                            })
                                                        }
                                                        aria-label={
                                                            school.is_locked
                                                                ? `Unlock ${school.name}`
                                                                : `Lock ${school.name}`
                                                        }
                                                        title={
                                                            school.is_locked
                                                                ? `Unlock ${school.name}`
                                                                : `Lock ${school.name}`
                                                        }
                                                        className={`${adminStyles.statusButton} ${
                                                            school.is_locked
                                                                ? adminStyles.statusEnabled
                                                                : adminStyles.statusDisabled
                                                        } ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            {school.is_locked
                                                                ? `Unlock ${school.name}`
                                                                : `Lock ${school.name}`}
                                                        </span>
                                                        <StatusIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmingSchool({
                                                                school,
                                                                action: 'delete',
                                                            })
                                                        }
                                                        disabled={
                                                            busyAction ===
                                                            `delete-${school.id}`
                                                        }
                                                        aria-label={`Delete ${school.name}`}
                                                        title={`Delete ${school.name}`}
                                                        className={`${adminStyles.dangerButton} ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            Delete {school.name}
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
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                {editingSchool ? 'Rename' : 'Create'}
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {editingSchool ? 'Rename school' : 'Create school'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitForm} className={adminStyles.stack}>
                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>
                                School name
                            </span>
                            <Input
                                value={form.name}
                                onChange={event =>
                                    setForm({ name: event.target.value })
                                }
                                placeholder="Enter school name"
                                required
                            />
                            <InputError messages={formErrors.name} />
                        </label>

                        <div className={adminStyles.actions}>
                            <Button disabled={saving}>
                                {saving
                                    ? 'Saving...'
                                    : editingSchool
                                      ? 'Save name'
                                      : 'Create school'}
                            </Button>
                            {editingSchool ? (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className={adminStyles.secondaryButton}>
                                    Cancel edit
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className={adminStyles.secondaryButton}>
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>

                    <div className={adminStyles.message}>
                        Locking a school blocks its non-admin users from portal,
                        management, finance, teacher, guardian, and settings
                        actions until the school is unlocked.
                    </div>
                </article>
            </section>

            <ConfirmDialog
                open={Boolean(confirmingSchool)}
                eyebrow={
                    confirmingSchool?.action === 'delete'
                        ? 'Delete school'
                        : confirmingSchool?.action === 'lock'
                          ? 'Lock school'
                          : 'Unlock school'
                }
                title={
                    confirmingSchool?.action === 'delete'
                        ? 'Delete this school?'
                        : confirmingSchool?.action === 'lock'
                          ? 'Lock this school?'
                          : 'Unlock this school?'
                }
                message={
                    confirmingSchool
                        ? confirmingSchool.action === 'delete'
                            ? `Delete ${confirmingSchool.school.name}? Linked records may be removed or detached according to system relationships.`
                            : confirmingSchool.action === 'lock'
                              ? `${confirmingSchool.school.name} users will not be able to perform actions until an admin unlocks the school.`
                              : `${confirmingSchool.school.name} users will be able to perform actions again.`
                        : ''
                }
                confirmLabel={
                    confirmingSchool?.action === 'delete'
                        ? 'Delete school'
                        : confirmingSchool?.action === 'lock'
                          ? 'Lock school'
                          : 'Unlock school'
                }
                busyLabel="Working..."
                tone={
                    confirmingSchool?.action === 'unlock' ? 'default' : 'danger'
                }
                busy={Boolean(busyAction)}
                onClose={() => {
                    if (!busyAction) {
                        setConfirmingSchool(null)
                    }
                }}
                onConfirm={() => {
                    if (confirmingSchool) {
                        runSchoolAction(
                            confirmingSchool.school,
                            confirmingSchool.action,
                        )
                    }
                }}
            />
        </WorkspacePageShell>
    )
}
