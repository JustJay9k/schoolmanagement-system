'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import adminStyles from '@/app/(app)/admin/admin-tools.module.css'
import {
    AddIcon,
    DeleteIcon,
    EditIcon,
    RefreshIcon,
    ResetIcon,
    StatusIcon,
} from '@/app/(app)/admin/action-icons'
import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import { formatRoleLabel, isAdminUser } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'
import { useEffect, useMemo, useRef, useState } from 'react'

const createEmptyForm = () => ({
    name: '',
    email: '',
    role: 'teacher',
    status: 'active',
    school_id: '',
    school_name: '',
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

const getTeacherAssignmentMeta = user => {
    if (user.role !== 'teacher') {
        return null
    }

    if (user.school_track === 'primary') {
        return {
            trackLabel: 'Primary',
            roleLabel: 'Class teacher',
            classLabel: user.assigned_class_name ?? 'Class required',
        }
    }

    if (user.school_track === 'secondary') {
        return {
            trackLabel: 'Secondary',
            roleLabel: user.form_class_name
                ? 'Form teacher and subject teacher'
                : 'Subject teacher only',
            classLabel: user.form_class_name ?? 'No form class',
        }
    }

    return {
        trackLabel: 'Teacher',
        roleLabel: 'Track required',
        classLabel: 'Update assignment',
    }
}

export default function AdminUsersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const editorCardRef = useRef(null)
    const [users, setUsers] = useState([])
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        school: '',
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
                item.email.toLowerCase().includes(filters.search.toLowerCase()) ||
                (item.school_name ?? '')
                    .toLowerCase()
                    .includes(filters.search.toLowerCase())
            const matchesRole =
                filters.role === '' || item.role === filters.role
            const matchesSchool =
                filters.school === '' ||
                (filters.school === 'unassigned'
                    ? !item.school_id
                    : String(item.school_id ?? '') === filters.school)
            const matchesStatus =
                filters.status === '' || item.status === filters.status

            return matchesSearch && matchesRole && matchesSchool && matchesStatus
        })
    }, [filters, users])

    const takenClassesByTrack = useMemo(() => {
        return users.reduce(
            (accumulator, item) => {
                if (
                    item.role === 'teacher' &&
                    item.school_id &&
                    item.school_track &&
                    item.assigned_class_name &&
                    item.id !== editingUserId
                ) {
                    const schoolKey = String(item.school_id)

                    if (!accumulator[schoolKey]) {
                        accumulator[schoolKey] = {
                            primary: [],
                            secondary: [],
                        }
                    }

                    accumulator[schoolKey][item.school_track].push(
                        item.assigned_class_name,
                    )
                }

                return accumulator
            },
            {},
        )
    }, [editingUserId, users])

    const availableClasses =
        options?.classesByTrack?.[form.school_track] ?? []

    const scrollToEditor = () => {
        window.requestAnimationFrame(() => {
            editorCardRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })

            const firstField = editorCardRef.current?.querySelector(
                'input, select, textarea',
            )

            firstField?.focus()
        })
    }

    const resetEditor = () => {
        setEditorMode('create')
        setEditingUserId(null)
        setForm(createEmptyForm())
        setFormErrors({})
    }

    const startCreate = () => {
        resetEditor()
        setPageStatus(null)
        scrollToEditor()
    }

    const startEdit = selectedUser => {
        setEditorMode('edit')
        setEditingUserId(selectedUser.id)
        setForm({
            name: selectedUser.name ?? '',
            email: selectedUser.email ?? '',
            role: selectedUser.role ?? 'teacher',
            status: selectedUser.status ?? 'active',
            school_id: selectedUser.school_id ? String(selectedUser.school_id) : '',
            school_name: '',
            school_track: selectedUser.school_track ?? '',
            assigned_class_name: selectedUser.assigned_class_name ?? '',
            password: '',
            password_confirmation: '',
            email_verified: Boolean(selectedUser.email_verified_at),
        })
        setFormErrors({})
        setPageStatus(null)
        scrollToEditor()
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

            if (field === 'school_id') {
                next.school_name = ''
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
            description="View every account in the system, assign primary class responsibility or secondary form-teacher responsibility, and switch access on or off without leaving the main workspace."
            actions={
                <div className={adminStyles.toolbarGroup}>
                    <button
                        type="button"
                        onClick={startCreate}
                        aria-label="Create new account"
                        title="Create new account"
                        className={`${workspaceStyles.secondaryButton} ${adminStyles.iconButton}`}>
                        <span className={adminStyles.srOnly}>Create new account</span>
                        <AddIcon />
                    </button>
                    <button
                        type="button"
                        onClick={loadUsers}
                        aria-label="Refresh user accounts"
                        title="Refresh user accounts"
                        className={`${workspaceStyles.secondaryButton} ${adminStyles.iconButton}`}>
                        <span className={adminStyles.srOnly}>Refresh user accounts</span>
                        <RefreshIcon />
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
                    ['Schools', stats?.schools ?? options?.schools?.length ?? 0],
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
                                    <th>School</th>
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
                                        <td colSpan="9" className={adminStyles.muted}>
                                            Loading user accounts...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className={adminStyles.muted}>
                                            No users match the current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(item => (
                                        <tr key={item.id}>
                                            {(() => {
                                                const assignmentMeta =
                                                    getTeacherAssignmentMeta(
                                                        item,
                                                    )

                                                return (
                                                    <>
                                            <td>
                                                <strong>{item.name}</strong>
                                                <small>{item.email}</small>
                                            </td>
                                            <td>{item.role_label}</td>
                                            <td>
                                                <strong>{item.school_name ?? 'Unassigned'}</strong>
                                                <small>
                                                    {item.school_name
                                                        ? 'Assigned School'
                                                        : 'Needs assignment'}
                                                </small>
                                            </td>
                                            <td>
                                                {assignmentMeta ? (
                                                    <>
                                                        <strong>{assignmentMeta.trackLabel}</strong>
                                                        <small>{assignmentMeta.roleLabel}</small>
                                                        <small>{assignmentMeta.classLabel}</small>
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
                                                        aria-label={`Edit ${item.name}`}
                                                        title={`Edit ${item.name}`}
                                                        className={`${adminStyles.ghostButton} ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            {`Edit ${item.name}`}
                                                        </span>
                                                        <EditIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleStatus(item)
                                                        }
                                                        aria-label={
                                                            item.status === 'active'
                                                                ? `Disable ${item.name}`
                                                                : `Enable ${item.name}`
                                                        }
                                                        title={
                                                            item.status === 'active'
                                                                ? `Disable ${item.name}`
                                                                : `Enable ${item.name}`
                                                        }
                                                        className={`${adminStyles.statusButton} ${
                                                            item.status ===
                                                            'active'
                                                                ? adminStyles.statusDisabled
                                                                : adminStyles.statusEnabled
                                                        } ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            {item.status === 'active'
                                                                ? `Disable ${item.name}`
                                                                : `Enable ${item.name}`}
                                                        </span>
                                                        <StatusIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteUser(item)
                                                        }
                                                        aria-label={`Delete ${item.name}`}
                                                        title={`Delete ${item.name}`}
                                                        className={`${adminStyles.dangerButton} ${adminStyles.iconButton}`}>
                                                        <span className={adminStyles.srOnly}>
                                                            {`Delete ${item.name}`}
                                                        </span>
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                            </td>
                                                    </>
                                                )
                                            })()}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article
                    ref={editorCardRef}
                    className={`${workspaceStyles.panel} ${adminStyles.editorPanel}`}>
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
                                <span className={adminStyles.fieldLabel}>School</span>
                                <select
                                    value={form.school_id}
                                    onChange={event =>
                                        handleFieldChange(
                                            'school_id',
                                            event.target.value,
                                        )
                                    }
                                    className={adminStyles.select}
                                    required={form.school_name.trim() === ''}>
                                    <option value="">Select a school</option>
                                    {(options?.schools ?? []).map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={formErrors.school_id} />
                            </label>

                            <label className={adminStyles.field}>
                                <span className={adminStyles.fieldLabel}>
                                    New school name
                                </span>
                                <Input
                                    value={form.school_name}
                                    onChange={event =>
                                        handleFieldChange(
                                            'school_name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Add a new school if it is not listed"
                                />
                                <span className={adminStyles.fieldHint}>
                                    Leave this blank when assigning the user to an
                                    existing school.
                                </span>
                                <InputError messages={formErrors.school_name} />
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
                                            {form.school_track === 'secondary'
                                                ? 'Form class (optional)'
                                                : 'Assigned class'}
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
                                            required={
                                                form.school_track === 'primary'
                                            }>
                                            <option value="">
                                                {form.school_track
                                                    ? form.school_track ===
                                                      'secondary'
                                                        ? 'No form class'
                                                        : 'Select a class'
                                                    : 'Choose a track first'}
                                            </option>
                                            {availableClasses.map(className => {
                                                const selectedSchoolKey =
                                                    form.school_id || null
                                                const reservedByOtherTeacher =
                                                    selectedSchoolKey &&
                                                    takenClassesByTrack[
                                                        selectedSchoolKey
                                                    ]?.[
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
                                        <span className={adminStyles.fieldHint}>
                                            {form.school_track === 'secondary'
                                                ? 'Secondary teachers can stay as subject teachers only, or they can also be allocated one form class.'
                                                : 'Primary teachers must manage exactly one class.'}
                                        </span>
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
                                aria-label="Reset form"
                                title="Reset form"
                                className={`${adminStyles.secondaryButton} ${adminStyles.iconButton}`}>
                                <span className={adminStyles.srOnly}>Reset form</span>
                                <ResetIcon />
                            </button>
                        </div>
                    </form>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
