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

const terms = [
    { value: 'first', label: 'First Term' },
    { value: 'second', label: 'Second Term' },
    { value: 'third', label: 'Third Term' },
]

export default function SchoolStructurePage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [teacherCountsByTrack, setTeacherCountsByTrack] = useState(null)
    const [form, setForm] = useState({
        primary_classes: '',
        secondary_classes: '',
    })
    const [activeTerm, setActiveTerm] = useState('first')
    const [errors, setErrors] = useState({})
    const [status, setStatus] = useState(null)
    const [termStatus, setTermStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingTerm, setSavingTerm] = useState(false)
    const [promotions, setPromotions] = useState([])
    const [promotionsLoading, setPromotionsLoading] = useState(true)
    const [approveModal, setApproveModal] = useState(null)
    const [approveSelection, setApproveSelection] = useState([])
    const [promotionBusy, setPromotionBusy] = useState(false)
    const [promotionStatus, setPromotionStatus] = useState(null)
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
            setActiveTerm(response.data?.activeTerm ?? 'first')
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

    const loadPromotions = async () => {
        if (!isManagementUser(user)) {
            return
        }

        try {
            const response = await axios.get('/api/management/promotions')

            setPromotions(response.data?.promotions ?? [])
        } catch {
            setPromotions([])
        } finally {
            setPromotionsLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageSchoolStructure(user)) {
            return
        }

        loadPromotions()
    }, [user])

    const openApproveModal = promotion => {
        const allIds = (promotion.students ?? []).map(
            entry => entry.student_id,
        )

        setApproveModal(promotion)
        setApproveSelection(allIds)
    }

    const toggleApproveStudent = studentId => {
        setApproveSelection(current =>
            current.includes(studentId)
                ? current.filter(id => id !== studentId)
                : [...current, studentId],
        )
    }

    const toggleAllApproveStudents = () => {
        const allIds = (approveModal?.students ?? []).map(
            entry => entry.student_id,
        )

        setApproveSelection(current =>
            current.length === allIds.length ? [] : allIds,
        )
    }

    const submitApproval = async () => {
        if (!approveModal) {
            return
        }

        setPromotionBusy(true)
        setPromotionStatus(null)

        try {
            const response = await axios.post(
                `/api/management/promotions/${approveModal.id}/approve`,
                { student_ids: approveSelection },
            )

            setPromotionStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'Promotion approved and learners moved.',
            })
            setApproveModal(null)
            setApproveSelection([])
            await Promise.all([loadPromotions(), loadStructure()])
        } catch (error) {
            setPromotionStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to approve the promotion.',
            })
        } finally {
            setPromotionBusy(false)
        }
    }

    const submitRejection = async promotion => {
        setPromotionBusy(true)
        setPromotionStatus(null)

        try {
            const response = await axios.post(
                `/api/management/promotions/${promotion.id}/reject`,
            )

            setPromotionStatus({
                type: 'success',
                message:
                    response.data?.message ?? 'Promotion request rejected.',
            })
            await loadPromotions()
        } catch (error) {
            setPromotionStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to reject the promotion.',
            })
        } finally {
            setPromotionBusy(false)
        }
    }

    const formatPromotionDate = value => {
        if (!value) {
            return ''
        }

        return new Date(value).toLocaleString()
    }

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

    const submitActiveTerm = async event => {
        event.preventDefault()
        setSavingTerm(true)
        setTermStatus(null)

        try {
            const endpoint = `${getSchoolStructureEndpoint(user)}/active-term`
            const response = await axios.put(endpoint, { term: activeTerm })

            setActiveTerm(response.data?.activeTerm ?? activeTerm)
            setTermStatus({
                type: 'success',
                message:
                    response.data?.message ??
                    'Active term updated successfully.',
            })
        } catch (error) {
            setTermStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update the active term.',
            })
        } finally {
            setSavingTerm(false)
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
        <>
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

            <form onSubmit={submitActiveTerm} className={adminStyles.structureEditor}>
                <div className={adminStyles.editorHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>Grading period</p>
                        <h2>Active term</h2>
                        <p>
                            Choose which term teachers are currently entering grades for.
                            Teachers can only save grades for the active term until you switch it.
                        </p>
                    </div>
                    <div className={adminStyles.actions}>
                        <Button disabled={savingTerm || loading}>
                            {savingTerm ? 'Saving...' : 'Save active term'}
                        </Button>
                    </div>
                </div>

                {termStatus ? (
                    <div
                        className={`${adminStyles.statusBanner} ${
                            termStatus.type === 'error'
                                ? adminStyles.statusBannerError
                                : adminStyles.statusBannerSuccess
                        }`}>
                        <div>
                            <strong>
                                {termStatus.type === 'error'
                                    ? 'Active term was not saved'
                                    : 'Active term saved'}
                            </strong>
                            <p>{termStatus.message}</p>
                        </div>
                    </div>
                ) : null}

                <div className={adminStyles.termPickerGrid}>
                    {terms.map(term => {
                        const isActive = term.value === activeTerm

                        return (
                            <label
                                key={term.value}
                                className={`${adminStyles.termOptionCard} ${
                                    isActive ? adminStyles.termOptionCardActive : ''
                                }`}>
                                <input
                                    type="radio"
                                    name="active_term"
                                    value={term.value}
                                    checked={isActive}
                                    onChange={() => setActiveTerm(term.value)}
                                    className={adminStyles.termOptionInput}
                                />
                                <span className={adminStyles.termOptionDot} aria-hidden="true" />
                                <span className={adminStyles.termOptionLabel}>{term.label}</span>
                                {isActive ? (
                                    <span
                                        className={adminStyles.termOptionBadge}>
                                        Active
                                    </span>
                                ) : null}
                            </label>
                        )
                    })}
                </div>
                <InputError messages={errors.term} />
            </form>

            {isManagementUser(user) ? (
                <section className={adminStyles.structureEditor}>
                    <div className={adminStyles.editorHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>
                                End of year
                            </p>
                            <h2>Promotion requests</h2>
                            <p>
                                Approve teacher promotion lists to move
                                learners to their next class. Approved learners
                                keep all their previous grades in the
                                repository.
                            </p>
                        </div>
                        <div className={adminStyles.actions}>
                            <button
                                type="button"
                                onClick={loadPromotions}
                                disabled={promotionsLoading || promotionBusy}
                                className={`${workspaceStyles.secondaryButton} ${adminStyles.iconButton}`}>
                                <span className={adminStyles.srOnly}>
                                    Refresh promotion requests
                                </span>
                                <RefreshIcon />
                            </button>
                        </div>
                    </div>

                    {promotionStatus ? (
                        <div
                            className={`${adminStyles.statusBanner} ${
                                promotionStatus.type === 'error'
                                    ? adminStyles.statusBannerError
                                    : adminStyles.statusBannerSuccess
                            }`}>
                            <div>
                                <strong>
                                    {promotionStatus.type === 'error'
                                        ? 'Promotion was not processed'
                                        : 'Promotion processed'}
                                </strong>
                                <p>{promotionStatus.message}</p>
                            </div>
                        </div>
                    ) : null}

                    {promotionsLoading ? (
                        <p className={adminStyles.message}>
                            Loading promotion requests...
                        </p>
                    ) : promotions.length === 0 ? (
                        <p className={adminStyles.message}>
                            No promotion requests yet. Teachers can submit a
                            list once the Third Term is active.
                        </p>
                    ) : (
                        <div className={adminStyles.promotionList}>
                            {promotions.map(promotion => {
                                const studentCount = (promotion.students ?? [])
                                    .length
                                const pending =
                                    promotion.status === 'pending'
                                const approved =
                                    promotion.status === 'approved'

                                return (
                                    <article
                                        key={promotion.id}
                                        className={adminStyles.promotionCard}>
                                        <div
                                            className={
                                                adminStyles.promotionCardHeader
                                            }>
                                            <div>
                                                <p
                                                    className={
                                                        workspaceStyles.panelEyebrow
                                                    }
                                                >
                                                    Submitted by{' '}
                                                    {promotion.teacher_name}
                                                </p>
                                                <h3>
                                                    {promotion.from_class} →{' '}
                                                    {promotion.to_class}
                                                </h3>
                                                <p>
                                                    {promotion.school_track_label}{' '}
                                                    • {studentCount} learner(s){' '}
                                                    • submitted{' '}
                                                    {formatPromotionDate(
                                                        promotion.submitted_at,
                                                    )}
                                                </p>
                                            </div>
                                            <span
                                                className={[
                                                    adminStyles.promotionStatus,
                                                    promotion.status ===
                                                        'pending'
                                                        ? adminStyles.promotionStatusPending
                                                        : promotion.status ===
                                                            'approved'
                                                          ? adminStyles.promotionStatusApproved
                                                          : adminStyles.promotionStatusRejected,
                                                ].join(' ')}>
                                                {pending
                                                    ? 'Awaiting approval'
                                                    : approved
                                                      ? 'Approved'
                                                      : 'Rejected'}
                                            </span>
                                        </div>

                                        <div className={adminStyles.promotionStudents}>
                                            <span
                                                className={
                                                    adminStyles.promotionStudentsLabel
                                                }>
                                                Learners
                                            </span>
                                            {(promotion.students ?? []).map(
                                                entry => (
                                                    <div
                                                        key={entry.student_id}
                                                        className={
                                                            adminStyles.promotionStudentRow
                                                        }>
                                                        <span>
                                                            {entry.full_name}
                                                        </span>
                                                        <span>
                                                            {entry.average !==
                                                            null
                                                                ? `${entry.average}%`
                                                                : 'No grades'}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        {pending ? (
                                            <div
                                                className={
                                                    adminStyles.promotionActions
                                                }>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openApproveModal(
                                                            promotion,
                                                        )
                                                    }
                                                    disabled={promotionBusy}
                                                    className={
                                                        workspaceStyles.button
                                                    }
                                                >
                                                    Review & approve
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        submitRejection(
                                                            promotion,
                                                        )
                                                    }
                                                    disabled={promotionBusy}
                                                    className={`${workspaceStyles.secondaryButton} ${adminStyles.dangerSecondaryButton}`}>
                                                    Reject
                                                </button>
                                            </div>
                                        ) : approved ? (
                                            <p
                                                className={
                                                    adminStyles.promotionMeta
                                                }>
                                                Approved by{' '}
                                                {promotion.approved_by_name ??
                                                    'head teacher'}{' '}
                                                {formatPromotionDate(
                                                    promotion.approved_at,
                                                )}
                                            </p>
                                        ) : null}
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            ) : null}

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

            {approveModal ? (
                <div
                    className={adminStyles.modalOverlay}
                    onClick={() =>
                        !promotionBusy && setApproveModal(null)
                    }>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="approve-promotion-title"
                        className={adminStyles.modalCard}
                        onClick={event => event.stopPropagation()}>
                        <div className={adminStyles.modalHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Approve promotion
                                </p>
                                <h2 id="approve-promotion-title">
                                    {approveModal.from_class} →{' '}
                                    {approveModal.to_class}
                                </h2>
                                <p>
                                    Review the learners, then approve. Selected
                                    learners are moved to{' '}
                                    {approveModal.to_class} and keep all their
                                    previous grades.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setApproveModal(null)}
                                disabled={promotionBusy}
                                className={adminStyles.modalClose}
                                aria-label="Close approve promotion dialog">
                                Close
                            </button>
                        </div>

                        <div className={adminStyles.modalSelectRow}>
                            <span>
                                {approveSelection.length} of{' '}
                                {(approveModal.students ?? []).length}{' '}
                                selected
                            </span>
                            <button
                                type="button"
                                onClick={toggleAllApproveStudents}
                                disabled={promotionBusy}
                                className={workspaceStyles.secondaryButton}>
                                {approveSelection.length ===
                                (approveModal.students ?? []).length
                                    ? 'Clear all'
                                    : 'Select all'}
                            </button>
                        </div>

                        <div className={adminStyles.modalStudentList}>
                            {(approveModal.students ?? []).map(entry => {
                                const selected = approveSelection.includes(
                                    entry.student_id,
                                )

                                return (
                                    <label
                                        key={entry.student_id}
                                        className={`${adminStyles.modalStudentRow} ${
                                            selected
                                                ? adminStyles.modalStudentRowSelected
                                                : ''
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() =>
                                                toggleApproveStudent(
                                                    entry.student_id,
                                                )
                                            }
                                            disabled={promotionBusy}
                                            className={
                                                adminStyles.modalStudentCheckbox
                                            }
                                        />
                                        <span>{entry.full_name}</span>
                                        <span>
                                            {entry.average !== null
                                                ? `${entry.average}%`
                                                : 'No grades'}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>

                        <div className={adminStyles.modalActions}>
                            <button
                                type="button"
                                onClick={() => setApproveModal(null)}
                                disabled={promotionBusy}
                                className={workspaceStyles.secondaryButton}>
                                Cancel
                            </button>
                            <Button
                                disabled={
                                    promotionBusy ||
                                    approveSelection.length === 0
                                }
                                onClick={submitApproval}>
                                {promotionBusy
                                    ? 'Promoting...'
                                    : `Approve ${approveSelection.length} learner(s)`}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    )
}
