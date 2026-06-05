'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import adminStyles from '@/app/(app)/admin/admin-tools.module.css'
import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import { formatRoleLabel, isAdminUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'
import { useEffect, useMemo, useState } from 'react'

const createEmptyForm = () => ({
    name: '',
    email: '',
    role: 'teacher',
    status: 'active',
    school_track: '',
    assigned_class_name: '',
    password: '',
    password_confirmation: '',
    email_verified: false,
})

const formatDate = value => {
    if (!value) {
        return 'Not recorded'
    }

    return new Date(value).toLocaleString()
}

export default function AdminUsersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [users, setUsers] = useState([])
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: '',
    })
    const [editorMode, setEditorMode] = useState('create')
    const [editingUserId, setEditingUserId] = useState(null)
    const [form, setForm] = useState(createEmptyForm())
    const [formErrors, setFormErrors] = useState({})
    const [pageStatus, setPageStatus] = useState(null)
    const [saving, setSaving] = useState(false)

    const loadUsers = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/admin/users')

            setUsers(response.data?.users ?? [])
            setStats(response.data?.stats ?? null)
            setOptions(response.data?.options ?? null)
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load user accounts right now.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !isAdminUser(user)) {
            return
        }

        loadUsers()
    }, [user])

    const filteredUsers = useMemo(() => {
        return users.filter(item => {
            const matchesSearch =
                filters.search.trim() === '' ||
                item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                item.email.toLowerCase().includes(filters.search.toLowerCase())
            const matchesRole =
                filters.role === '' || item.role === filters.role
            const matchesStatus =
                filters.status === '' || item.status === filters.status

            return matchesSearch && matchesRole && matchesStatus
        })
    }, [filters, users])

    const takenClassesByTrack = useMemo(() => {
        return users.reduce(
            (accumulator, item) => {
                if (
                    item.role === 'teacher' &&
                    item.school_track &&
                    item.assigned_class_name &&
                    item.id !== editingUserId
                ) {
                    accumulator[item.school_track].push(item.assigned_class_name)
                }

                return accumulator
            },
            { primary: [], secondary: [] },
        )
    }, [editingUserId, users])

    const availableClasses =
        options?.classesByTrack?.[form.school_track] ?? []

    const resetEditor = () => {
        setEditorMode('create')
        setEditingUserId(null)
        setForm(createEmptyForm())
        setFormErrors({})
    }

    const startCreate = () => {
        resetEditor()
        setPageStatus(null)
    }

    const startEdit = selectedUser => {
        setEditorMode('edit')
        setEditingUserId(selectedUser.id)
        setForm({
            name: selectedUser.name ?? '',
            email: selectedUser.email ?? '',
            role: selectedUser.role ?? 'teacher',
            status: selectedUser.status ?? 'active',
            school_track: selectedUser.school_track ?? '',
            assigned_class_name: selectedUser.assigned_class_name ?? '',
            password: '',
            password_confirmation: '',
            email_verified: Boolean(selectedUser.email_verified_at),
        })
        setFormErrors({})
        setPageStatus(null)
    }

    const handleFieldChange = (field, value) => {
        setForm(current => {
            const next = {
                ...current,
                [field]: value,
            }

            if (field === 'role' && value !== 'teacher') {
                next.school_track = ''
                next.assigned_class_name = ''
            }

            if (field === 'school_track') {
                next.assigned_class_name = ''
            }

            return next
        })
    }

    const submitForm = async event => {
        event.preventDefault()
        setSaving(true)
        setFormErrors({})
        setPageStatus(null)

        try {
            if (editorMode === 'edit' && editingUserId) {
                await axios.put(`/api/admin/users/${editingUserId}`, form)
                setPageStatus({
                    type: 'success',
                    message: 'User account updated successfully.',
                })
            } else {
                await axios.post('/api/admin/users', form)
                resetEditor()
                setPageStatus({
                    type: 'success',
                    message: 'User account created successfully.',
                })
            }

            await loadUsers()
        } catch (error) {
            setFormErrors(error?.response?.data?.errors ?? {})
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save the user account.',
            })
        } finally {
            setSaving(false)
        }
    }

    const toggleStatus = async selectedUser => {
        setPageStatus(null)

        try {
            const response = await axios.patch(
                `/api/admin/users/${selectedUser.id}/status`,
            )

            setPageStatus({
                type: 'success',
                message: response.data?.message ?? 'Account status updated.',
            })
            await loadUsers()
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.errors?.status?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to update account status.',
            })
        }
    }

    const deleteUser = async selectedUser => {
        if (
            !window.confirm(
                `Delete ${selectedUser.name}'s account permanently?`,
            )
        ) {
            return
        }

        setPageStatus(null)

        try {
            const response = await axios.delete(
                `/api/admin/users/${selectedUser.id}`,
            )

            setPageStatus({
                type: 'success',
                message: response.data?.message ?? 'User deleted successfully.',
            })

            if (editingUserId === selectedUser.id) {
                startCreate()
            }

            await loadUsers()
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.errors?.delete?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to delete this user.',
            })
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
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only administrator accounts can manage users and school structure.`}
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
        <WorkspacePageShell
            eyebrow="Administration"
            title="User accounts"
            description="View every account in the system, assign class ownership to teachers, and switch access on or off without leaving the main workspace."
            actions={
                <div className={adminStyles.toolbarGroup}>
                    <button
                        type="button"
                        onClick={startCreate}
                        className={workspaceStyles.secondaryButton}>
                        New account
                    </button>
                    <button
                        type="button"
                        onClick={loadUsers}
                        className={workspaceStyles.secondaryButton}>
                        Refresh
                    </button>
                </div>
            }
        >
            {pageStatus ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${adminStyles.message} ${
                            pageStatus.type === 'error'
                                ? adminStyles.dangerText
                                : ''
                        }`}>
                        {pageStatus.message}
                    </p>
                </section>
            ) : null}

            <section className={adminStyles.statsGrid}>
                {[
                    ['Total users', stats?.total ?? 0],
                    ['Administrators', stats?.admins ?? 0],
                    ['Active', stats?.active ?? 0],
                    ['Inactive', stats?.inactive ?? 0],
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
                            <p className={workspaceStyles.panelEyebrow}>Roster</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                All system users
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
                                placeholder="Name or email"
                            />
                        </label>

                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>Role</span>
                            <select
                                value={filters.role}
                                onChange={event =>
                                    setFilters(current => ({
                                        ...current,
                                        role: event.target.value,
                                    }))
                                }
                                className={adminStyles.select}>
                                <option value="">All roles</option>
                                {(options?.roles ?? []).map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>Status</span>
                            <select
                                value={filters.status}
                                onChange={event =>
                                    setFilters(current => ({
                                        ...current,
                                        status: event.target.value,
                                    }))
                                }
                                className={adminStyles.select}>
                                <option value="">All statuses</option>
                                {(options?.statuses ?? []).map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Assignment</th>
                                    <th>Status</th>
                                    <th>Verified</th>
                                    <th>Created</th>
                                    <th>Last login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className={adminStyles.muted}>
                                            Loading user accounts...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className={adminStyles.muted}>
                                            No users match the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>{item.name}</strong>
                                                <small>{item.email}</small>
                                            </td>
                                            <td>{item.role_label}</td>
                                            <td>
                                                {item.school_track &&
                                                item.assigned_class_name ? (
                                                    <>
                                                        <strong>
                                                            {item.school_track ===
                                                            'primary'
                                                                ? 'Primary'
                                                                : 'Secondary'}
                                                        </strong>
                                                        <small>
                                                            {item.assigned_class_name}
                                                        </small>
                                                    </>
                                                ) : (
                                                    <small>All-school access</small>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={`${adminStyles.statusBadge} ${
                                                        item.status === 'active'
                                                            ? adminStyles.statusActive
                                                            : item.status ===
                                                              'inactive'
                                                            ? adminStyles.statusInactive
                                                            : adminStyles.statusSuspended
                                                    }`}>
                                                    {item.status_label}
                                                </span>
                                            </td>
                                            <td>
                                                {item.email_verified_at
                                                    ? 'Verified'
                                                    : 'Pending'}
                                            </td>
                                            <td>{formatDate(item.created_at)}</td>
                                            <td>{formatDate(item.last_login_at)}</td>
                                            <td>
                                                <div
                                                    className={
                                                        adminStyles.tableActions
                                                    }>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(item)}
                                                        className={
                                                            adminStyles.ghostButton
                                                        }>
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleStatus(item)
                                                        }
                                                        className={`${adminStyles.statusButton} ${
                                                            item.status ===
                                                            'active'
                                                                ? adminStyles.statusDisabled
                                                                : adminStyles.statusEnabled
                                                        }`}>
                                                        {item.status === 'active'
                                                            ? 'Disable'
                                                            : 'Enable'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteUser(item)
                                                        }
                                                        className={
                                                            adminStyles.dangerButton
                                                        }>
                                                        Delete
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
                                {editorMode === 'edit'
                                    ? 'Account editor'
                                    : 'New account'}
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {editorMode === 'edit'
                                    ? 'Update user account'
                                    : 'Create user account'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitForm} className={adminStyles.stack}>
                        <div className={adminStyles.formGrid}>
                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>Name</span>
                                <Input
                                    value={form.name}
                                    onChange={event =>
                                        handleFieldChange(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError messages={formErrors.name} />
                            </label>

                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>Email</span>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={event =>
                                        handleFieldChange(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError messages={formErrors.email} />
                            </label>

                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>Role</span>
                                <select
                                    value={form.role}
                                    onChange={event =>
                                        handleFieldChange(
                                            'role',
                                            event.target.value,
                                        )
                                    }
                                    className={adminStyles.select}
                                    required>
                                    {(options?.roles ?? []).map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={formErrors.role} />
                            </label>

                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>Status</span>
                                <select
                                    value={form.status}
                                    onChange={event =>
                                        handleFieldChange(
                                            'status',
                                            event.target.value,
                                        )
                                    }
                                    className={adminStyles.select}
                                    required>
                                    {(options?.statuses ?? []).map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={formErrors.status} />
                            </label>

                            {form.role === 'teacher' ? (
                                <>
                                    <div
                                        className={`${adminStyles.field} ${adminStyles.fullWidth}`}>
                                        <span className={adminStyles.fieldLabel}>
                                            School track
                                        </span>
                                        <div className={adminStyles.radioGrid}>
                                            {Object.entries(
                                                options?.schoolTracks ?? {},
                                            ).map(([value, label]) => (
                                                <label
                                                    key={value}
                                                    className={adminStyles.radioCard}>
                                                    <input
                                                        type="radio"
                                                        checked={
                                                            form.school_track ===
                                                            value
                                                        }
                                                        onChange={() =>
                                                            handleFieldChange(
                                                                'school_track',
                                                                value,
                                                            )
                                                        }
                                                    />
                                                    <span
                                                        className={
                                                            adminStyles.radioMeta
                                                        }>
                                                        <strong>{label}</strong>
                                                        <span>
                                                            Limit this teacher
                                                            to {label.toLowerCase()}{' '}
                                                            classes only.
                                                        </span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                        <InputError
                                            messages={formErrors.school_track}
                                        />
                                    </div>

                                    <label className={adminStyles.field}>
                                        <span className={adminStyles.fieldLabel}>
                                            Assigned class
                                        </span>
                                        <select
                                            value={form.assigned_class_name}
                                            onChange={event =>
                                                handleFieldChange(
                                                    'assigned_class_name',
                                                    event.target.value,
                                                )
                                            }
                                            className={adminStyles.select}
                                            required>
                                            <option value="">
                                                {form.school_track
                                                    ? 'Select a class'
                                                    : 'Choose a track first'}
                                            </option>
                                            {availableClasses.map(className => {
                                                const reservedByOtherTeacher =
                                                    takenClassesByTrack[
                                                        form.school_track
                                                    ]?.includes(className) &&
                                                    className !==
                                                        form.assigned_class_name

                                                return (
                                                    <option
                                                        key={className}
                                                        value={className}
                                                        disabled={
                                                            reservedByOtherTeacher
                                                        }>
                                                        {reservedByOtherTeacher
                                                            ? `${className} (already assigned)`
                                                            : className}
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        <InputError
                                            messages={
                                                formErrors.assigned_class_name
                                            }
                                        />
                                    </label>
                                </>
                            ) : null}

                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>
                                    Password
                                </span>
                                <Input
                                    type="password"
                                    value={form.password}
                                    onChange={event =>
                                        handleFieldChange(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required={editorMode === 'create'}
                                />
                                <span className={adminStyles.fieldHint}>
                                    {editorMode === 'edit'
                                        ? 'Leave blank to keep the current password.'
                                        : 'Set the initial password for this account.'}
                                </span>
                                <InputError messages={formErrors.password} />
                            </label>

                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>
                                    Confirm password
                                </span>
                                <Input
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={event =>
                                        handleFieldChange(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    required={editorMode === 'create'}
                                />
                                <InputError
                                    messages={
                                        formErrors.password_confirmation
                                    }
                                />
                            </label>
                        </div>

                        <label className={adminStyles.checkboxCard}>
                            <input
                                type="checkbox"
                                checked={form.email_verified}
                                onChange={event =>
                                    handleFieldChange(
                                        'email_verified',
                                        event.target.checked,
                                    )
                                }
                            />
                            <span className={adminStyles.checkboxMeta}>
                                <strong>Email verified</strong>
                                <span>
                                    Mark this account as verified immediately.
                                </span>
                            </span>
                        </label>

                        <div className={adminStyles.actions}>
                            <Button disabled={saving}>
                                {saving
                                    ? 'Saving...'
                                    : editorMode === 'edit'
                                    ? 'Save changes'
                                    : 'Create account'}
                            </Button>
                            <button
                                type="button"
                                onClick={startCreate}
                                className={adminStyles.secondaryButton}>
                                Reset form
                            </button>
                        </div>
                    </form>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
