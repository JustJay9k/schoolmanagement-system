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

const createEmptyEntry = () => ({
    day_of_week: 'monday',
    period_label: '',
    start_time: '',
    end_time: '',
    subject_id: '',
    room: '',
    notes: '',
})

const createEmptyForm = () => ({
    title: '',
    school_track: 'primary',
    class_name: '',
    assigned_teacher_id: '',
    notes: '',
    entries: [createEmptyEntry()],
})

const groupEntriesByDay = entries =>
    entries.reduce((groups, entry) => {
        if (!groups[entry.day_of_week]) {
            groups[entry.day_of_week] = []
        }

        groups[entry.day_of_week].push(entry)
        return groups
    }, {})

export default function ManagementTimetablesPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [timetables, setTimetables] = useState([])
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pageStatus, setPageStatus] = useState(null)
    const [formErrors, setFormErrors] = useState({})
    const [form, setForm] = useState(createEmptyForm())
    const [editorMode, setEditorMode] = useState('create')
    const [editingTimetableId, setEditingTimetableId] = useState(null)

    const loadTimetables = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/management/timetables')

            setTimetables(response.data?.timetables ?? [])
            setOptions(response.data?.options ?? null)
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load timetables right now.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageManagementWorkspace(user)) {
            return
        }

        loadTimetables()
    }, [user])

    const availableClasses = options?.classesByTrack?.[form.school_track] ?? []
    const availableTeachers = options?.teachersByTrack?.[form.school_track] ?? []
    const availableSubjects = options?.subjectsByTrack?.[form.school_track] ?? []

    const stats = useMemo(
        () => ({
            total: timetables.length,
            primary: timetables.filter(item => item.school_track === 'primary').length,
            secondary: timetables.filter(item => item.school_track === 'secondary').length,
        }),
        [timetables],
    )

    const resetEditor = () => {
        setEditorMode('create')
        setEditingTimetableId(null)
        setForm(createEmptyForm())
        setFormErrors({})
    }

    const startEdit = timetable => {
        setEditorMode('edit')
        setEditingTimetableId(timetable.id)
        setForm({
            title: timetable.title ?? '',
            school_track: timetable.school_track ?? 'primary',
            class_name: timetable.class_name ?? '',
            assigned_teacher_id: String(timetable.assigned_teacher?.id ?? ''),
            notes: timetable.notes ?? '',
            entries:
                timetable.entries?.length > 0
                    ? timetable.entries.map(entry => ({
                          day_of_week: entry.day_of_week ?? 'monday',
                          period_label: entry.period_label ?? '',
                          start_time: entry.start_time ?? '',
                          end_time: entry.end_time ?? '',
                          subject_id: String(entry.subject?.id ?? ''),
                          room: entry.room ?? '',
                          notes: entry.notes ?? '',
                      }))
                    : [createEmptyEntry()],
        })
        setFormErrors({})
        setPageStatus(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleFieldChange = (field, value) => {
        setForm(current => {
            const next = {
                ...current,
                [field]: value,
            }

            if (field === 'school_track') {
                next.class_name = ''
                next.assigned_teacher_id = ''
                next.entries = current.entries.map(entry => ({
                    ...entry,
                    subject_id: '',
                }))
            }

            return next
        })
    }

    const handleEntryChange = (index, field, value) => {
        setForm(current => ({
            ...current,
            entries: current.entries.map((entry, entryIndex) =>
                entryIndex === index ? { ...entry, [field]: value } : entry,
            ),
        }))
    }

    const addEntry = () => {
        setForm(current => ({
            ...current,
            entries: [...current.entries, createEmptyEntry()],
        }))
    }

    const removeEntry = index => {
        setForm(current => ({
            ...current,
            entries:
                current.entries.length === 1
                    ? [createEmptyEntry()]
                    : current.entries.filter((_, entryIndex) => entryIndex !== index),
        }))
    }

    const submitForm = async event => {
        event.preventDefault()
        setSaving(true)
        setFormErrors({})
        setPageStatus(null)

        try {
            if (editorMode === 'edit' && editingTimetableId) {
                await axios.put(
                    `/api/management/timetables/${editingTimetableId}`,
                    form,
                )
                setPageStatus({
                    type: 'success',
                    message: 'Timetable updated successfully.',
                })
            } else {
                await axios.post('/api/management/timetables', form)
                setPageStatus({
                    type: 'success',
                    message: 'Timetable created successfully.',
                })
                resetEditor()
            }

            await loadTimetables()
        } catch (error) {
            setFormErrors(error?.response?.data?.errors ?? {})
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save this timetable.',
            })
        } finally {
            setSaving(false)
        }
    }

    const deleteTimetable = async timetable => {
        if (!window.confirm(`Delete the timetable for ${timetable.class_name}?`)) {
            return
        }

        setPageStatus(null)

        try {
            const response = await axios.delete(
                `/api/management/timetables/${timetable.id}`,
            )

            if (editingTimetableId === timetable.id) {
                resetEditor()
            }

            setPageStatus({
                type: 'success',
                message: response.data?.message ?? 'Timetable deleted successfully.',
            })
            await loadTimetables()
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to delete this timetable.',
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
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only head teacher / management accounts can publish class timetables.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Timetable publishing belongs to the management workspace.
                        Teachers can only see timetables assigned to them.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Management"
            title="Class timetables"
            description="Choose whether a timetable belongs to primary or secondary school, assign it to a teacher account, and publish one schedule per class."
            actions={
                <div className={managementStyles.toolbarGroup}>
                    <button
                        type="button"
                        onClick={resetEditor}
                        className={workspaceStyles.secondaryButton}>
                        New timetable
                    </button>
                    <button
                        type="button"
                        onClick={loadTimetables}
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
                    ['All timetables', stats.total],
                    ['Primary', stats.primary],
                    ['Secondary', stats.secondary],
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
                            <p className={workspaceStyles.panelEyebrow}>Published</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Timetables by class
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.list}>
                        {loading ? (
                            <p className={managementStyles.muted}>Loading timetables...</p>
                        ) : timetables.length ? (
                            timetables.map(timetable => {
                                const entriesByDay = groupEntriesByDay(
                                    timetable.entries ?? [],
                                )

                                return (
                                    <div
                                        key={timetable.id}
                                        className={managementStyles.dayCard}>
                                        <div className={managementStyles.dayCardHeader}>
                                            <div>
                                                <strong>{timetable.title}</strong>
                                                <p className={managementStyles.cardMeta}>
                                                    {timetable.school_track_label} ·{' '}
                                                    {timetable.class_name} ·{' '}
                                                    {timetable.assigned_teacher?.name ??
                                                        'No teacher assigned'}
                                                </p>
                                            </div>
                                            <div className={managementStyles.tableActions}>
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(timetable)}
                                                    className={managementStyles.ghostButton}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteTimetable(timetable)}
                                                    className={managementStyles.dangerButton}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>

                                        {timetable.notes ? (
                                            <p className={managementStyles.cardMeta}>
                                                {timetable.notes}
                                            </p>
                                        ) : null}

                                        <div className={managementStyles.dayGrid}>
                                            {Object.entries(options?.daysOfWeek ?? {}).map(
                                                ([dayValue, dayLabel]) => (
                                                    <div
                                                        key={`${timetable.id}-${dayValue}`}
                                                        className={managementStyles.periodItem}>
                                                        <strong>{dayLabel}</strong>
                                                        {(entriesByDay[dayValue] ?? []).length ? (
                                                            <div className={managementStyles.periodList}>
                                                                {entriesByDay[dayValue].map(entry => (
                                                                    <div key={entry.id}>
                                                                        <strong>
                                                                            {entry.period_label}
                                                                        </strong>
                                                                        <p>
                                                                            {entry.subject?.name ??
                                                                                'Subject missing'}
                                                                        </p>
                                                                        <small>
                                                                            {entry.start_time || '--:--'} -{' '}
                                                                            {entry.end_time || '--:--'}
                                                                            {entry.room
                                                                                ? ` · ${entry.room}`
                                                                                : ''}
                                                                        </small>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <small className={managementStyles.muted}>
                                                                No periods saved.
                                                            </small>
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <p className={managementStyles.muted}>
                                No timetables have been published yet.
                            </p>
                        )}
                    </div>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                {editorMode === 'edit' ? 'Editor' : 'New timetable'}
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {editorMode === 'edit'
                                    ? 'Update timetable'
                                    : 'Create timetable'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitForm} className={managementStyles.stack}>
                        <div className={managementStyles.formGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Title</span>
                                <Input
                                    value={form.title}
                                    onChange={event =>
                                        handleFieldChange('title', event.target.value)
                                    }
                                    placeholder="Form 2 East timetable"
                                    required
                                />
                                <InputError messages={formErrors.title} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Assigned teacher
                                </span>
                                <select
                                    value={form.assigned_teacher_id}
                                    onChange={event =>
                                        handleFieldChange(
                                            'assigned_teacher_id',
                                            event.target.value,
                                        )
                                    }
                                    className={managementStyles.select}
                                    required>
                                    <option value="">
                                        {availableTeachers.length
                                            ? 'Select a teacher'
                                            : 'Choose a track with active teachers'}
                                    </option>
                                    {availableTeachers.map(teacher => (
                                        <option key={teacher.id} value={teacher.id}>
                                            {teacher.assigned_class_name
                                                ? `${teacher.name} - ${teacher.assigned_class_name}`
                                                : teacher.name}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={formErrors.assigned_teacher_id} />
                            </label>

                            <div
                                className={`${managementStyles.field} ${managementStyles.fullWidth}`}>
                                <span className={managementStyles.fieldLabel}>School track</span>
                                <div className={managementStyles.radioGrid}>
                                    {Object.entries(options?.schoolTracks ?? {}).map(
                                        ([value, label]) => (
                                            <label
                                                key={value}
                                                className={managementStyles.radioCard}>
                                                <input
                                                    type="radio"
                                                    checked={form.school_track === value}
                                                    onChange={() =>
                                                        handleFieldChange('school_track', value)
                                                    }
                                                />
                                                <span className={managementStyles.radioMeta}>
                                                    <strong>{label}</strong>
                                                    <span>
                                                        Use {label.toLowerCase()} classes,
                                                        teachers, and subjects for this
                                                        timetable.
                                                    </span>
                                                </span>
                                            </label>
                                        ),
                                    )}
                                </div>
                                <InputError messages={formErrors.school_track} />
                            </div>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Class</span>
                                <select
                                    value={form.class_name}
                                    onChange={event =>
                                        handleFieldChange('class_name', event.target.value)
                                    }
                                    className={managementStyles.select}
                                    required>
                                    <option value="">
                                        {availableClasses.length
                                            ? 'Select a class'
                                            : 'No classes available for this track'}
                                    </option>
                                    {availableClasses.map(className => (
                                        <option key={className} value={className}>
                                            {className}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={formErrors.class_name} />
                            </label>

                            <label
                                className={`${managementStyles.field} ${managementStyles.fullWidth}`}>
                                <span className={managementStyles.fieldLabel}>Notes</span>
                                <textarea
                                    value={form.notes}
                                    onChange={event =>
                                        handleFieldChange('notes', event.target.value)
                                    }
                                    className={managementStyles.textarea}
                                    placeholder="Assembly notes, lunch break reminders, or special schedule rules."
                                />
                                <InputError messages={formErrors.notes} />
                            </label>
                        </div>

                        <article className={workspaceStyles.panel}>
                            <div className={workspaceStyles.panelHeader}>
                                <div>
                                    <p className={workspaceStyles.panelEyebrow}>Periods</p>
                                    <h2 className={workspaceStyles.panelTitle}>
                                        Timetable rows
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={addEntry}
                                    className={managementStyles.secondaryButton}>
                                    Add period
                                </button>
                            </div>

                            <div className={workspaceStyles.list}>
                                {form.entries.map((entry, index) => (
                                    <div key={`entry-${index}`} className={managementStyles.entryCard}>
                                        <div className={managementStyles.entryCardHeader}>
                                            <div>
                                                <strong>Period row {index + 1}</strong>
                                                <p className={managementStyles.cardMeta}>
                                                    Pick the day, time, subject, and room.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeEntry(index)}
                                                className={managementStyles.ghostButton}>
                                                Remove
                                            </button>
                                        </div>

                                        <div className={managementStyles.entryGrid}>
                                            <label className={managementStyles.field}>
                                                <span className={managementStyles.fieldLabel}>
                                                    Day
                                                </span>
                                                <select
                                                    value={entry.day_of_week}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'day_of_week',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={managementStyles.select}
                                                    required>
                                                    {Object.entries(
                                                        options?.daysOfWeek ?? {},
                                                    ).map(([value, label]) => (
                                                        <option key={value} value={value}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <InputError
                                                    messages={
                                                        formErrors[`entries.${index}.day_of_week`]
                                                    }
                                                />
                                            </label>

                                            <label className={managementStyles.field}>
                                                <span className={managementStyles.fieldLabel}>
                                                    Period
                                                </span>
                                                <Input
                                                    value={entry.period_label}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'period_label',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Period 1"
                                                    required
                                                />
                                                <InputError
                                                    messages={
                                                        formErrors[`entries.${index}.period_label`]
                                                    }
                                                />
                                            </label>

                                            <label className={managementStyles.field}>
                                                <span className={managementStyles.fieldLabel}>
                                                    Start
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={entry.start_time}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'start_time',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                                <InputError
                                                    messages={
                                                        formErrors[`entries.${index}.start_time`]
                                                    }
                                                />
                                            </label>

                                            <label className={managementStyles.field}>
                                                <span className={managementStyles.fieldLabel}>
                                                    End
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={entry.end_time}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'end_time',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                                <InputError
                                                    messages={
                                                        formErrors[`entries.${index}.end_time`]
                                                    }
                                                />
                                            </label>

                                            <label className={managementStyles.field}>
                                                <span className={managementStyles.fieldLabel}>
                                                    Subject
                                                </span>
                                                <select
                                                    value={entry.subject_id}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'subject_id',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className={managementStyles.select}
                                                    required>
                                                    <option value="">
                                                        {availableSubjects.length
                                                            ? 'Select a subject'
                                                            : 'Add subjects for this track first'}
                                                    </option>
                                                    {availableSubjects.map(subject => (
                                                        <option key={subject.id} value={subject.id}>
                                                            {subject.code
                                                                ? `${subject.name} (${subject.code})`
                                                                : subject.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <InputError
                                                    messages={
                                                        formErrors[`entries.${index}.subject_id`]
                                                    }
                                                />
                                            </label>

                                            <label className={managementStyles.field}>
                                                <span className={managementStyles.fieldLabel}>
                                                    Room
                                                </span>
                                                <Input
                                                    value={entry.room}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'room',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Lab 1"
                                                />
                                                <InputError
                                                    messages={formErrors[`entries.${index}.room`]}
                                                />
                                            </label>

                                            <label
                                                className={`${managementStyles.field} ${managementStyles.fullWidth}`}>
                                                <span className={managementStyles.fieldLabel}>
                                                    Notes
                                                </span>
                                                <Input
                                                    value={entry.notes}
                                                    onChange={event =>
                                                        handleEntryChange(
                                                            index,
                                                            'notes',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Double period or special instruction"
                                                />
                                                <InputError
                                                    messages={formErrors[`entries.${index}.notes`]}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <InputError messages={formErrors.entries} />
                        </article>

                        <div className={managementStyles.actions}>
                            <Button disabled={saving}>
                                {saving
                                    ? 'Saving...'
                                    : editorMode === 'edit'
                                    ? 'Save timetable'
                                    : 'Create timetable'}
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
