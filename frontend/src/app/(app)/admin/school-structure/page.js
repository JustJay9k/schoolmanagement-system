'use client'

import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import adminStyles from '@/app/(app)/admin/admin-tools.module.css'
import {
    RefreshIcon,
    ResetIcon,
} from '@/app/(app)/admin/action-icons'
import Button from '@/components/Button'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import {
    canManageSchoolStructure,
    formatRoleLabel,
    isManagementUser,
} from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'
import { useEffect, useMemo, useState } from 'react'

const toTextareaValue = classes => (classes ?? []).join('\n')
const toClassList = value =>
    (value ?? '')
        .split(/\r\n|\r|\n/)
        .map(className => className.trim())
        .filter(Boolean)
const getSchoolStructureEndpoint = user =>
    isManagementUser(user)
        ? '/api/management/school-structure'
        : '/api/admin/school-structure'

const tracks = [
    {
        key: 'primary',
        label: 'Primary',
        hint: 'Usually Standard 1 through Standard 8.',
        placeholder: 'Standard 1\nStandard 2\nStandard 3',
    },
    {
        key: 'secondary',
        label: 'Secondary',
        hint: 'Usually Form 1 through Form 4.',
        placeholder: 'Form 1\nForm 2\nForm 3',
    },
]

export default function SchoolStructurePage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [teacherCountsByTrack, setTeacherCountsByTrack] = useState(null)
    const [form, setForm] = useState({
        primary_classes: '',
        secondary_classes: '',
    })
    const [errors, setErrors] = useState({})
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const classesByTrack = useMemo(
        () => ({
            primary: toClassList(form.primary_classes),
            secondary: toClassList(form.secondary_classes),
        }),
        [form],
    )
    const totalClassCount =
        classesByTrack.primary.length + classesByTrack.secondary.length

    const errorsForTrack = track => [
        ...(errors[`classes_by_track.${track}`] ?? []),
        ...(errors[`classes_by_track.${track}.*`] ?? []),
    ]

    const loadStructure = async () => {
        setLoading(true)

        try {
            const response = await axios.get(getSchoolStructureEndpoint(user))

            setTeacherCountsByTrack(response.data?.teacherCountsByTrack ?? null)
            setForm({
                primary_classes: toTextareaValue(
                    response.data?.classesByTrack?.primary,
                ),
                secondary_classes: toTextareaValue(
                    response.data?.classesByTrack?.secondary,
                ),
            })
        } catch (error) {
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load the school structure.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageSchoolStructure(user)) {
            return
        }

        loadStructure()
    }, [user])

    const submitForm = async event => {
        event.preventDefault()
        setSaving(true)
        setErrors({})
        setStatus(null)

        try {
            const response = await axios.put(getSchoolStructureEndpoint(user), form)

            setStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'School structure updated successfully.',
            })

            await loadStructure()
        } catch (error) {
            setErrors(error?.response?.data?.errors ?? {})
            setStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update the school structure.',
            })
        } finally {
            setSaving(false)
        }
    }

    if (!user) {
        return null
    }

    if (!canManageSchoolStructure(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="School structure access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only administrator and head teacher accounts can change the school structure.`}
            >
                <article className={workspaceStyles.panel}>
                    <p className={adminStyles.message}>
                        Ask a current administrator to grant the correct role if you
                        need to edit primary and secondary class definitions.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="School Setup"
            title="School structure"
            description="Build the class list teachers, students, registers, timetables, and gradebooks will use across the workspace."
            actions={
                <button
                    type="button"
                    onClick={loadStructure}
                    aria-label="Refresh school structure"
                    title="Refresh school structure"
                    className={`${workspaceStyles.secondaryButton} ${adminStyles.iconButton}`}>
                    <span className={adminStyles.srOnly}>Refresh school structure</span>
                    <RefreshIcon />
                </button>
            }
        >
            {status ? (
                <section
                    className={`${adminStyles.statusBanner} ${
                        status.type === 'error'
                            ? adminStyles.statusBannerError
                            : adminStyles.statusBannerSuccess
                    }`}>
                    <div>
                        <strong>
                            {status.type === 'error'
                                ? 'Structure was not saved'
                                : 'Structure saved'}
                        </strong>
                        <p>{status.message}</p>
                    </div>
                </section>
            ) : null}

            <section className={adminStyles.structureOverview}>
                <article className={adminStyles.structureSummary}>
                    <div className={adminStyles.structureSummaryHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Live setup
                            </p>
                            <h2 className={adminStyles.structureTitle}>
                                {loading
                                    ? 'Loading class structure'
                                    : `${totalClassCount} classes ready`}
                            </h2>
                        </div>
                        <span className={adminStyles.structureRoleBadge}>
                            {isManagementUser(user) ? 'Head Teacher' : 'Admin'}
                        </span>
                    </div>

                    <div className={adminStyles.trackSummaryGrid}>
                        {tracks.map(track => {
                            const classes = classesByTrack[track.key]
                            const teacherCount =
                                teacherCountsByTrack?.[track.key] ?? 0
                            const visibleClasses = classes.slice(0, 8)
                            const hiddenCount =
                                classes.length - visibleClasses.length

                            return (
                                <article
                                    key={track.key}
                                    className={adminStyles.trackSummaryCard}>
                                    <div className={adminStyles.trackSummaryTop}>
                                        <span
                                            className={`${adminStyles.trackDot} ${
                                                track.key === 'primary'
                                                    ? adminStyles.trackDotPrimary
                                                    : adminStyles.trackDotSecondary
                                            }`}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <h3>{track.label}</h3>
                                            <p>
                                                {classes.length} classes /{' '}
                                                {teacherCount} teachers assigned
                                            </p>
                                        </div>
                                    </div>

                                    <div className={adminStyles.classChipList}>
                                        {visibleClasses.length > 0 ? (
                                            visibleClasses.map((className, index) => (
                                                <span
                                                    key={`${track.key}-${className}-${index}`}
                                                    className={adminStyles.classChip}>
                                                    {className}
                                                </span>
                                            ))
                                        ) : (
                                            <span className={adminStyles.emptyChip}>
                                                No classes entered
                                            </span>
                                        )}
                                        {hiddenCount > 0 ? (
                                            <span className={adminStyles.emptyChip}>
                                                +{hiddenCount} more
                                            </span>
                                        ) : null}
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                </article>

                <aside className={adminStyles.guidancePanel}>
                    <p className={workspaceStyles.panelEyebrow}>Before saving</p>
                    <h2>Keep the list simple</h2>
                    <ol className={adminStyles.guidanceList}>
                        <li>Put one class name on each line.</li>
                        <li>Keep names short and consistent.</li>
                        <li>Do not remove a class with teachers or timetables attached.</li>
                    </ol>
                    <p className={adminStyles.guidanceNote}>
                        These names appear in registration, teacher allocation,
                        registers, timetables, and gradebooks.
                    </p>
                </aside>
            </section>

            <form onSubmit={submitForm} className={adminStyles.structureEditor}>
                <div className={adminStyles.editorHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>Editor</p>
                        <h2>Class lists</h2>
                        <p>
                            Edit the names below. The preview updates as you type.
                        </p>
                    </div>
                    <div className={adminStyles.actions}>
                        <Button disabled={saving || loading}>
                            {saving ? 'Saving...' : 'Save structure'}
                        </Button>
                        <button
                            type="button"
                            onClick={loadStructure}
                            disabled={saving || loading}
                            aria-label="Reset school structure form"
                            title="Reset school structure form"
                            className={`${adminStyles.secondaryButton} ${adminStyles.iconButton}`}>
                            <span className={adminStyles.srOnly}>Reset school structure form</span>
                            <ResetIcon />
                        </button>
                    </div>
                </div>

                <div className={adminStyles.trackEditorGrid}>
                    {tracks.map(track => {
                        const fieldName = `${track.key}_classes`
                        const trackErrors = errorsForTrack(track.key)
                        const classes = classesByTrack[track.key]

                        return (
                            <section
                                key={track.key}
                                className={`${adminStyles.trackEditorCard} ${
                                    trackErrors.length > 0
                                        ? adminStyles.trackEditorCardError
                                        : ''
                                }`}>
                                <div className={adminStyles.trackEditorTop}>
                                    <div>
                                        <p className={workspaceStyles.panelEyebrow}>
                                            {track.label} track
                                        </p>
                                        <h3>{track.label} classes</h3>
                                    </div>
                                    <span className={adminStyles.classCountBadge}>
                                        {classes.length} classes
                                    </span>
                                </div>

                                <label className={adminStyles.field}>
                                    <span className={adminStyles.fieldLabel}>
                                        One class per line
                                    </span>
                                    <textarea
                                        value={form[fieldName]}
                                        placeholder={track.placeholder}
                                        onChange={event =>
                                            setForm(current => ({
                                                ...current,
                                                [fieldName]: event.target.value,
                                            }))
                                        }
                                        className={adminStyles.structureTextarea}
                                    />
                                    <span className={adminStyles.fieldHint}>
                                        {track.hint}
                                    </span>
                                    <InputError messages={trackErrors} />
                                </label>

                                <div className={adminStyles.previewBlock}>
                                    <span>Preview</span>
                                    <div className={adminStyles.classChipList}>
                                        {classes.length > 0 ? (
                                            classes.map((className, index) => (
                                                <span
                                                    key={`${track.key}-${className}-${index}`}
                                                    className={adminStyles.classChip}>
                                                    {className}
                                                </span>
                                            ))
                                        ) : (
                                            <span className={adminStyles.emptyChip}>
                                                Add at least one class
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )
                    })}
                </div>

                <InputError messages={errors.classes_by_track} />
            </form>
        </WorkspacePageShell>
    )
}
