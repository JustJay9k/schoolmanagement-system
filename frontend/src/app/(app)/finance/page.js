'use client'

import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import Button from '@/components/Button'
import Input from '@/components/Input'
import axios from '@/lib/axios'
import { canManageFinanceWorkspace, formatRoleLabel } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const createFilters = () => ({
    search: '',
    school_track: '',
    class_name: '',
})

const createDrafts = students =>
    Object.fromEntries(
        students.map(student => [
            student.id,
            {
                fees_balance: formatWithCommas(String(student.fees_balance ?? 0)),
                books_paid: Boolean(student.books_paid),
                uniform_paid: Boolean(student.uniform_paid),
            },
        ]),
    )

const formatCurrency = value =>
    new Intl.NumberFormat('en-MW', {
        style: 'currency',
        currency: 'MWK',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0))

const parseNumericInput = raw => {
    const stripped = (raw ?? '').replace(/[^0-9.]/g, '')

    return stripped
}

const formatWithCommas = raw => {
    const cleaned = parseNumericInput(raw)

    if (cleaned === '' || cleaned === '.') {
        return ''
    }

    const parts = cleaned.split('.')
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart
}

export default function FinancePage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [students, setStudents] = useState([])
    const [drafts, setDrafts] = useState({})
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState(createFilters())
    const [filterForm, setFilterForm] = useState(createFilters())
    const [savingId, setSavingId] = useState(null)
    const [pageStatus, setPageStatus] = useState(null)

    const loadStudents = async activeFilters => {
        setLoading(true)

        try {
            const response = await axios.get('/api/finance/students', {
                params: activeFilters,
            })
            const nextStudents = response.data?.students ?? []

            setStudents(nextStudents)
            setDrafts(createDrafts(nextStudents))
            setStats(response.data?.stats ?? null)
            setOptions(response.data?.options ?? null)
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load student finance records right now.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageFinanceWorkspace(user)) {
            return
        }

        loadStudents(filters)
    }, [filters, user])

    const availableClasses = useMemo(() => {
        if (!filterForm.school_track) {
            return []
        }

        return options?.classesByTrack?.[filterForm.school_track] ?? []
    }, [filterForm.school_track, options])

    const hasDraftChanged = student => {
        const draft = drafts[student.id]

        if (!draft) {
            return false
        }

        return (
            Number(parseNumericInput(draft.fees_balance) || 0) !== Number(student.fees_balance || 0) ||
            draft.books_paid !== Boolean(student.books_paid) ||
            draft.uniform_paid !== Boolean(student.uniform_paid)
        )
    }

    const updateDraft = (studentId, field, value) => {
        setDrafts(current => ({
            ...current,
            [studentId]: {
                ...current[studentId],
                [field]: value,
            },
        }))
    }

    const applyFilters = event => {
        event.preventDefault()
        setFilters({
            search: filterForm.search.trim(),
            school_track: filterForm.school_track,
            class_name: filterForm.class_name,
        })
    }

    const clearFilters = () => {
        const nextFilters = createFilters()
        setFilterForm(nextFilters)
        setFilters(nextFilters)
    }

    const saveStudentFinance = async studentId => {
        const draft = drafts[studentId]

        if (!draft) {
            return
        }

        setSavingId(studentId)
        setPageStatus(null)

        try {
            const response = await axios.put(`/api/finance/students/${studentId}`, {
                fees_balance:
                    parseNumericInput(draft.fees_balance) === '' ? 0 : Number(parseNumericInput(draft.fees_balance)),
                books_paid: draft.books_paid,
                uniform_paid: draft.uniform_paid,
            })
            const updatedStudent = response.data?.student

            setStudents(current =>
                current.map(student =>
                    student.id === studentId ? updatedStudent : student,
                ),
            )
            setDrafts(current => ({
                ...current,
                [studentId]: {
                    fees_balance: formatWithCommas(String(updatedStudent?.fees_balance ?? 0)),
                    books_paid: Boolean(updatedStudent?.books_paid),
                    uniform_paid: Boolean(updatedStudent?.uniform_paid),
                },
            }))
            setPageStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'Student finance record updated successfully.',
            })
            await loadStudents(filters)
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.errors?.fees_balance?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to update this student finance record.',
            })
        } finally {
            setSavingId(null)
        }
    }

    if (!user) {
        return null
    }

    if (!canManageFinanceWorkspace(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Finance access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only finance accounts can manage student fee balances and payment flags.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Student finance belongs to the accountant workspace.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Finance"
            title="Student fees desk"
            description="Work only with learner finance records: fees balances, book payments, uniform payments, and the student basics needed to follow up families."
            actions={
                <button
                    type="button"
                    onClick={() => loadStudents(filters)}
                    className={workspaceStyles.secondaryButton}>
                    Refresh
                </button>
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
                    ['Students in view', stats?.total_students ?? 0],
                    [
                        'Outstanding balance',
                        formatCurrency(stats?.outstanding_balance ?? 0),
                    ],
                    ['Books pending', stats?.books_pending ?? 0],
                    ['Uniform pending', stats?.uniform_pending ?? 0],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={workspaceStyles.panelGrid}>
                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Finance filters
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Narrow the student list
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={applyFilters} className={managementStyles.stack}>
                        <div className={managementStyles.formGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Search
                                </span>
                                <Input
                                    value={filterForm.search}
                                    onChange={event =>
                                        setFilterForm(current => ({
                                            ...current,
                                            search: event.target.value,
                                        }))
                                    }
                                    placeholder="Student, code, or guardian"
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    School track
                                </span>
                                <select
                                    value={filterForm.school_track}
                                    onChange={event =>
                                        setFilterForm(current => ({
                                            ...current,
                                            school_track: event.target.value,
                                            class_name: '',
                                        }))
                                    }
                                    className={managementStyles.select}>
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

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Class
                                </span>
                                <select
                                    value={filterForm.class_name}
                                    onChange={event =>
                                        setFilterForm(current => ({
                                            ...current,
                                            class_name: event.target.value,
                                        }))
                                    }
                                    className={managementStyles.select}
                                    disabled={!filterForm.school_track}>
                                    <option value="">
                                        {filterForm.school_track
                                            ? 'All classes'
                                            : 'Choose a track first'}
                                    </option>
                                    {availableClasses.map(className => (
                                        <option key={className} value={className}>
                                            {className}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className={managementStyles.actions}>
                            <Button type="submit" className="px-4 py-2.5 text-xs">
                                Apply filters
                            </Button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className={managementStyles.secondaryButton}>
                                Clear
                            </button>
                        </div>
                    </form>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Scope</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Accountant responsibilities
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.list}>
                        <div className={workspaceStyles.listItem}>
                            <div className={workspaceStyles.stack}>
                                <strong>Student balances only</strong>
                                <p>
                                    Capture outstanding fees and review learner
                                    identity details before following up with the
                                    family.
                                </p>
                            </div>
                        </div>

                        <div className={workspaceStyles.listItem}>
                            <div className={workspaceStyles.stack}>
                                <strong>Books and uniform flags</strong>
                                <p>
                                    Mark whether the student has already paid for
                                    books and uniform without opening the wider
                                    management workspace.
                                </p>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section className={workspaceStyles.fullPanel}>
                <div className={workspaceStyles.panelHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>
                            Student finance register
                        </p>
                        <h2 className={workspaceStyles.panelTitle}>
                            Update learner balances and payment flags
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <p className={managementStyles.muted}>
                        Loading student finance records...
                    </p>
                ) : students.length === 0 ? (
                    <p className={managementStyles.notice}>
                        No student records match the current filters.
                    </p>
                ) : (
                    <div className={workspaceStyles.tableWrap}>
                        <table className={workspaceStyles.table}>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Basic information</th>
                                    <th>Fees balance</th>
                                    <th>Books paid</th>
                                    <th>Uniform paid</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(student => {
                                    const draft = drafts[student.id]

                                    return (
                                        <tr key={student.id}>
                                            <td>
                                                <strong>{student.full_name}</strong>
                                                <small>
                                                    {student.school_track_label} |{' '}
                                                    {student.class_name}
                                                </small>
                                                <small>
                                                    Code:{' '}
                                                    {student.student_code || 'N/A'}
                                                </small>
                                            </td>
                                            <td>
                                                <strong>
                                                    {student.guardian_name || 'No guardian name'}
                                                </strong>
                                                <small>
                                                    Residence:{' '}
                                                    {student.residence || 'Not recorded'}
                                                </small>
                                                <small>
                                                    Sex: {student.sex || 'N/A'} | Age:{' '}
                                                    {student.age ?? 'N/A'}
                                                </small>
                                            </td>
                                            <td>
                                                <Input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={draft?.fees_balance ?? ''}
                                                    onChange={event =>
                                                        updateDraft(
                                                            student.id,
                                                            'fees_balance',
                                                            formatWithCommas(event.target.value),
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td>
                                                <label className={managementStyles.radioCard}>
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(
                                                            draft?.books_paid,
                                                        )}
                                                        onChange={event =>
                                                            updateDraft(
                                                                student.id,
                                                                'books_paid',
                                                                event.target.checked,
                                                            )
                                                        }
                                                    />
                                                    <span className={managementStyles.radioMeta}>
                                                        <strong>
                                                            {draft?.books_paid
                                                                ? 'Paid'
                                                                : 'Pending'}
                                                        </strong>
                                                    </span>
                                                </label>
                                            </td>
                                            <td>
                                                <label className={managementStyles.radioCard}>
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(
                                                            draft?.uniform_paid,
                                                        )}
                                                        onChange={event =>
                                                            updateDraft(
                                                                student.id,
                                                                'uniform_paid',
                                                                event.target.checked,
                                                            )
                                                        }
                                                    />
                                                    <span className={managementStyles.radioMeta}>
                                                        <strong>
                                                            {draft?.uniform_paid
                                                                ? 'Paid'
                                                                : 'Pending'}
                                                        </strong>
                                                    </span>
                                                </label>
                                            </td>
                                            <td>
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        saveStudentFinance(
                                                            student.id,
                                                        )
                                                    }
                                                    disabled={
                                                        savingId === student.id ||
                                                        !hasDraftChanged(student)
                                                    }
                                                    className="px-4 py-2.5 text-xs">
                                                    {savingId === student.id
                                                        ? 'Saving...'
                                                        : 'Save'}
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </WorkspacePageShell>
    )
}
