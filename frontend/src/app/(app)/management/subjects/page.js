'use client'

import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import { canManageManagementWorkspace, formatRoleLabel } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const emptyForm = {
    name: '',
    code: '',
    school_track: 'primary',
}

export default function ManagementSubjectsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [subjects, setSubjects] = useState([])
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pageStatus, setPageStatus] = useState(null)
    const [formErrors, setFormErrors] = useState({})
    const [form, setForm] = useState(emptyForm)
    const [editorMode, setEditorMode] = useState('create')
    const [editingSubjectId, setEditingSubjectId] = useState(null)

    const loadSubjects = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/management/subjects')

            setSubjects(response.data?.subjects ?? [])
            setStats(response.data?.stats ?? null)
            setOptions(response.data?.options ?? null)
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load school subjects right now.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageManagementWorkspace(user)) {
            return
        }

        loadSubjects()
    }, [user])

    const groupedSubjects = useMemo(() => {
        return subjects.reduce(
            (groups, subject) => {
                groups[subject.school_track].push(subject)
                return groups
            },
            { primary: [], secondary: [] },
        )
    }, [subjects])

    const resetEditor = () => {
        setEditorMode('create')
        setEditingSubjectId(null)
        setForm(emptyForm)
        setFormErrors({})
    }

    const startEdit = subject => {
        setEditorMode('edit')
        setEditingSubjectId(subject.id)
        setForm({
            name: subject.name ?? '',
            code: subject.code ?? '',
            school_track: subject.school_track ?? 'primary',
        })
        setFormErrors({})
        setPageStatus(null)
    }

    const submitForm = async event => {
        event.preventDefault()
        setSaving(true)
        setFormErrors({})
        setPageStatus(null)

        try {
            if (editorMode === 'edit' && editingSubjectId) {
                await axios.put(`/api/management/subjects/${editingSubjectId}`, form)
                setPageStatus({
                    type: 'success',
                    message: 'Subject updated successfully.',
                })
            } else {
                await axios.post('/api/management/subjects', form)
                setPageStatus({
                    type: 'success',
                    message: 'Subject saved successfully.',
                })
                resetEditor()
            }

            await loadSubjects()
        } catch (error) {
            setFormErrors(error?.response?.data?.errors ?? {})
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save this subject.',
            })
        } finally {
            setSaving(false)
        }
    }

    const deleteSubject = async subject => {
        if (!window.confirm(`Delete ${subject.name} from the subject list?`)) {
            return
        }

        setPageStatus(null)

        try {
            const response = await axios.delete(`/api/management/subjects/${subject.id}`)

            if (editingSubjectId === subject.id) {
                resetEditor()
            }

            setPageStatus({
                type: 'success',
                message: response.data?.message ?? 'Subject deleted successfully.',
            })
            await loadSubjects()
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.errors?.subject?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to delete this subject.',
            })
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
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only head teacher / management accounts can curate school subjects.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Subject setup belongs to the management workspace. Ask a head
                        teacher account to maintain the subject registry.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Management"
            title="School subjects"
            description="Keep a clean primary and secondary subject registry so timetable creation only uses subjects your school actually teaches."
            actions={
                <div className={managementStyles.toolbarGroup}>
                    <button
                        type="button"
                        onClick={resetEditor}
                        className={workspaceStyles.secondaryButton}>
                        New subject
                    </button>
                    <button
                        type="button"
                        onClick={loadSubjects}
                        className={workspaceStyles.secondaryButton}>
                        Refresh
                    </button>
                </div>
            }>
            {pageStatus ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            pageStatus.type === 'error' ? managementStyles.dangerText : ''
                        }`}>
                        {pageStatus.message}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['All subjects', stats?.total ?? 0],
                    ['Primary', stats?.primary ?? 0],
                    ['Secondary', stats?.secondary ?? 0],
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
                            <p className={workspaceStyles.panelEyebrow}>Registry</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Subjects by track
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.panelGrid}>
                        {Object.entries(options?.schoolTracks ?? {}).map(
                            ([trackValue, trackLabel]) => (
                                <article key={trackValue} className={workspaceStyles.panel}>
                                    <div className={workspaceStyles.panelHeader}>
                                        <div>
                                            <p className={workspaceStyles.panelEyebrow}>
                                                {trackLabel}
                                            </p>
                                            <h2 className={workspaceStyles.panelTitle}>
                                                {trackLabel} subjects
                                            </h2>
                                        </div>
                                    </div>

                                    <div className={workspaceStyles.list}>
                                        {loading ? (
                                            <p className={managementStyles.muted}>
                                                Loading subjects...
                                            </p>
                                        ) : groupedSubjects[trackValue]?.length ? (
                                            groupedSubjects[trackValue].map(subject => (
                                                <div
                                                    key={subject.id}
                                                    className={workspaceStyles.listItem}>
                                                    <div>
                                                        <strong>{subject.name}</strong>
                                                        <p>
                                                            {subject.code
                                                                ? `Code: ${subject.code}`
                                                                : 'No code saved'}
                                                        </p>
                                                        <small>
                                                            Added by {subject.creator_name ?? 'System'}
                                                        </small>
                                                    </div>
                                                    <div className={managementStyles.tableActions}>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(subject)}
                                                            className={managementStyles.ghostButton}>
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteSubject(subject)}
                                                            className={managementStyles.dangerButton}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className={managementStyles.muted}>
                                                No {trackLabel.toLowerCase()} subjects yet.
                                            </p>
                                        )}
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                {editorMode === 'edit' ? 'Editor' : 'New subject'}
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {editorMode === 'edit' ? 'Update subject' : 'Add subject'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitForm} className={managementStyles.stack}>
                        <label className={managementStyles.field}>
                            <span className={managementStyles.fieldLabel}>Subject name</span>
                            <Input
                                value={form.name}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="Mathematics"
                                required
                            />
                            <InputError messages={formErrors.name} />
                        </label>

                        <label className={managementStyles.field}>
                            <span className={managementStyles.fieldLabel}>Code</span>
                            <Input
                                value={form.code}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        code: event.target.value,
                                    }))
                                }
                                placeholder="MATH"
                            />
                            <InputError messages={formErrors.code} />
                        </label>

                        <label className={managementStyles.field}>
                            <span className={managementStyles.fieldLabel}>School track</span>
                            <select
                                value={form.school_track}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        school_track: event.target.value,
                                    }))
                                }
                                className={managementStyles.select}
                                required>
                                {Object.entries(options?.schoolTracks ?? {}).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                            <InputError messages={formErrors.school_track} />
                        </label>

                        <div className={managementStyles.actions}>
                            <Button disabled={saving}>
                                {saving
                                    ? 'Saving...'
                                    : editorMode === 'edit'
                                    ? 'Save subject'
                                    : 'Create subject'}
                            </Button>
                            <button
                                type="button"
                                onClick={resetEditor}
                                className={managementStyles.secondaryButton}>
                                Reset
                            </button>
                        </div>
                    </form>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
