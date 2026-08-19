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
import { useEffect, useState } from 'react'

const toTextareaValue = classes => (classes ?? []).join('\n')
const getSchoolStructureEndpoint = user =>
    isManagementUser(user)
        ? '/api/management/school-structure'
        : '/api/admin/school-structure'

export default function SchoolStructurePage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [defaultClassesByTrack, setDefaultClassesByTrack] = useState(null)
    const [teacherCountsByTrack, setTeacherCountsByTrack] = useState(null)
    const [form, setForm] = useState({
        primary_classes: '',
        secondary_classes: '',
    })
    const [errors, setErrors] = useState({})
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadStructure = async () => {
        setLoading(true)

        try {
            const response = await axios.get(getSchoolStructureEndpoint(user))

            setDefaultClassesByTrack(response.data?.defaultClassesByTrack ?? null)
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
            description="Set the primary and secondary class names used during teacher onboarding, user assignment, and class visibility across the workspace."
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
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${adminStyles.message} ${
                            status.type === 'error'
                                ? adminStyles.dangerText
                                : ''
                        }`}>
                        {status.message}
                    </p>
                </section>
            ) : null}

            <section className={adminStyles.statsGrid}>
                <article className={workspaceStyles.statCard}>
                    <p className={workspaceStyles.statLabel}>
                        Primary teachers assigned
                    </p>
                    <p className={workspaceStyles.statValue}>
                        {teacherCountsByTrack?.primary ?? 0}
                    </p>
                </article>
                <article className={workspaceStyles.statCard}>
                    <p className={workspaceStyles.statLabel}>
                        Secondary teachers assigned
                    </p>
                    <p className={workspaceStyles.statValue}>
                        {teacherCountsByTrack?.secondary ?? 0}
                    </p>
                </article>
            </section>

            <section className={adminStyles.splitPanel}>
                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Current defaults
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Baseline class setup
                            </h2>
                        </div>
                    </div>

                    <div className={workspaceStyles.list}>
                        <div className={workspaceStyles.listItem}>
                            <div>
                                <strong>Primary</strong>
                                <p>
                                    {defaultClassesByTrack?.primary?.join(', ') ??
                                        'Loading...'}
                                </p>
                            </div>
                        </div>
                        <div className={workspaceStyles.listItem}>
                            <div>
                                <strong>Secondary</strong>
                                <p>
                                    {defaultClassesByTrack?.secondary?.join(', ') ??
                                        'Loading...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className={adminStyles.message}>
                        One class per line. You can rename classes to fit your
                        school setup, but a class cannot be removed while a
                        teacher is still assigned to it.
                    </p>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                Editor
                            </p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Publish class lists
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitForm} className={adminStyles.stack}>
                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>
                                Primary classes
                            </span>
                            <textarea
                                value={form.primary_classes}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        primary_classes: event.target.value,
                                    }))
                                }
                                className={adminStyles.textarea}
                            />
                            <span className={adminStyles.fieldHint}>
                                Example default: Standard 1 through Standard 8.
                            </span>
                            <InputError
                                messages={[
                                    ...(errors['classes_by_track.primary'] ?? []),
                                    ...(errors['classes_by_track.primary.*'] ?? []),
                                ]}
                            />
                        </label>

                        <label className={adminStyles.field}>
                            <span className={adminStyles.fieldLabel}>
                                Secondary classes
                            </span>
                            <textarea
                                value={form.secondary_classes}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        secondary_classes: event.target.value,
                                    }))
                                }
                                className={adminStyles.textarea}
                            />
                            <span className={adminStyles.fieldHint}>
                                Example default: Form 1 through Form 4.
                            </span>
                            <InputError
                                messages={[
                                    ...(errors['classes_by_track.secondary'] ?? []),
                                    ...(errors['classes_by_track.secondary.*'] ?? []),
                                ]}
                            />
                        </label>

                        <InputError messages={errors.classes_by_track} />

                        <div className={adminStyles.actions}>
                            <Button disabled={saving || loading}>
                                {saving ? 'Saving...' : 'Save structure'}
                            </Button>
                            <button
                                type="button"
                                onClick={loadStructure}
                                aria-label="Reset school structure form"
                                title="Reset school structure form"
                                className={`${adminStyles.secondaryButton} ${adminStyles.iconButton}`}>
                                <span className={adminStyles.srOnly}>Reset school structure form</span>
                                <ResetIcon />
                            </button>
                        </div>
                    </form>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
