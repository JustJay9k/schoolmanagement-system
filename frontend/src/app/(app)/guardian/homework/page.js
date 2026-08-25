'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import homeworkStyles from '@/app/(app)/gradebook/homework.module.css'
import { useAuth } from '@/hooks/auth'
import { formatRoleLabel, isGuardianUser } from '@/lib/userAccess'
import axios from '@/lib/axios'
import useSWR from 'swr'
import Input from '@/components/Input'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useToast } from '@/components/ToastProvider'

const fetcher = url => axios.get(url).then(response => response.data)

const formatDate = value => (value ? new Date(value).toLocaleString() : null)

const formatDueDate = value => {
    if (!value) {
        return null
    }

    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
        return null
    }

    return parsed.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

const formatFileSize = sizeInKb => {
    const size = Number(sizeInKb ?? 0)

    if (size >= 1024) {
        return `${(size / 1024).toFixed(1)} MB`
    }

    return `${Math.max(size, 1)} KB`
}

const extractErrorMessage = error =>
    error?.response?.data?.message ??
    (error?.response?.status === 422
        ? 'Please check your entries and try again.'
        : 'Something went wrong. Please try again.')

const buildSubmissionState = submission => ({
    answers: Object.fromEntries(
        (submission?.answers ?? []).map(answerEntry => [
            answerEntry.question_id,
            answerEntry.answer ?? '',
        ]),
    ),
    notes: submission?.notes ?? '',
    files: [],
    removeIds: [],
})

function AttachmentMedia({ attachments }) {
    const images = attachments.filter(attachment => attachment.is_image)
    const documents = attachments.filter(attachment => !attachment.is_image)

    return (
        <>
            {images.length > 0 ? (
                <div className={homeworkStyles.imageGrid}>
                    {images.map(attachment => (
                        <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            title={`Open ${attachment.name}`}
                            className={homeworkStyles.imageThumbLink}>
                            <Image
                                src={attachment.url}
                                alt={attachment.name}
                                width={480}
                                height={360}
                                className={homeworkStyles.imageThumb}
                                unoptimized
                            />
                        </a>
                    ))}
                </div>
            ) : null}

            {documents.length > 0 ? (
                <div className={homeworkStyles.attachmentList}>
                    {documents.map(attachment => (
                        <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            title={attachment.name}
                            className={homeworkStyles.attachmentChip}>
                            <strong>File</strong>
                            <span>{attachment.name}</span>
                            <small>{formatFileSize(attachment.size_in_kb)}</small>
                        </a>
                    ))}
                </div>
            ) : null}
        </>
    )
}

function SubmissionPanel({ item, onSaved }) {
    const { showToast } = useToast()

    const submission = item.my_submission

    const [state, setState] = useState(() => buildSubmissionState(submission))
    const [confirmAction, setConfirmAction] = useState(null)
    const [busyAction, setBusyAction] = useState(null)

    const isSubmitted = submission?.status === 'submitted'
    const isOverdue = Boolean(item.due_date) && new Date(item.due_date) < new Date()
    const isLocked = isSubmitted || isOverdue
    const maxFiles = 5 - ((submission?.attachments?.length ?? 0) - state.removeIds.length)
    const remainingQuestions = useMemo(
        () =>
            (item.questions ?? []).filter(
                question => !(state.answers[question.id] ?? '').trim(),
            ).length,
        [item.questions, state.answers],
    )

    const buildPayload = () => {
        const payload = new FormData()

        payload.append('notes', state.notes)

        ;(item.questions ?? []).forEach(question => {
            const answer = (state.answers[question.id] ?? '').trim()

            if (!isSubmitted && answer) {
                payload.append('answers[][question_id]', question.id)
                payload.append('answers[][answer]', answer)
            }
        })

        state.files.forEach(file => {
            payload.append('attachments[]', file)
        })

        state.removeIds.forEach(attachmentId => {
            payload.append('remove_attachment_ids[]', attachmentId)
        })

        return payload
    }

    const runAction = async actionType => {
        setBusyAction(actionType)
        setConfirmAction(null)

        try {
            const endpoint =
                actionType === 'submit'
                    ? `/api/guardian/homework/${item.id}/submit`
                    : `/api/guardian/homework/${item.id}/submission`

            const { data } = await axios.post(endpoint, buildPayload())

            setState(buildSubmissionState(data.submission))
            showToast({
                title: actionType === 'submit' ? 'Response submitted' : 'Draft saved',
                message:
                    actionType === 'submit'
                        ? 'The teacher has been notified.'
                        : 'Continue any time before you submit.',
                type: 'success',
            })
            onSaved?.()
        } catch (error) {
            showToast({
                title: 'Could not save',
                message: extractErrorMessage(error),
                type: 'error',
            })
        } finally {
            setBusyAction(null)
        }
    }

    const removePendingFile = index => {
        setState(current => ({
            ...current,
            files: current.files.filter((_, fileIndex) => fileIndex !== index),
        }))
    }

    if (isSubmitted) {
        return (
            <div className={homeworkStyles.submissionPanel}>
                <div className={homeworkStyles.submissionPanelHead}>
                    <span className={homeworkStyles.submittedBadge}>Response submitted</span>
                    <small className={homeworkStyles.submissionPanelMeta}>
                        {formatDate(submission.submitted_at)} · locked for editing
                    </small>
                </div>

                {(item.questions ?? []).length > 0 ? (
                    <ol className={homeworkStyles.qaList}>
                        {item.questions.map(question => (
                            <li key={question.id} className={homeworkStyles.qaItem}>
                                <p className={homeworkStyles.qaQuestion}>
                                    {question.question_text}
                                </p>
                                <p className={homeworkStyles.qaAnswer}>
                                    {(submission.answers ?? []).find(
                                        answerEntry => answerEntry.question_id === question.id,
                                    )?.answer || 'No answer provided.'}
                                </p>
                            </li>
                        ))}
                    </ol>
                ) : null}

                {submission.notes ? (
                    <p className={homeworkStyles.taskBody}>{submission.notes}</p>
                ) : null}

                <AttachmentMedia attachments={submission.attachments ?? []} />
            </div>
        )
    }

    if (isOverdue) {
        return (
            <div className={homeworkStyles.submissionPanel}>
                <div className={homeworkStyles.submissionPanelHead}>
                    <span className={homeworkStyles.overdueBadge}>Deadline passed</span>
                </div>
                <p className={homeworkStyles.taskBody}>
                    The deadline for this homework has passed. The teacher can no longer accept responses.
                    {submission?.status === 'draft' && submission.answers?.length
                        ? ' A draft was saved but was not submitted in time.'
                        : ''}
                </p>
            </div>
        )
    }

    return (
        <div className={homeworkStyles.submissionPanel}>
            <div className={homeworkStyles.submissionPanelHead}>
                <span className={managementStyles.fieldLabel}>Your child&apos;s response</span>
                {submission?.status === 'draft' ? (
                    <span className={homeworkStyles.draftBadge}>Draft saved</span>
                ) : null}
            </div>

            {(item.questions ?? []).length > 0 ? (
                <ol className={homeworkStyles.qaList}>
                    {item.questions.map(question => (
                        <li key={question.id} className={homeworkStyles.qaItem}>
                            <p className={homeworkStyles.qaQuestion}>
                                {question.question_text}
                            </p>
                            <textarea
                                rows={2}
                                maxLength={2000}
                                placeholder="Type your child's answer..."
                                value={state.answers[question.id] ?? ''}
                                onChange={event =>
                                    setState(current => ({
                                        ...current,
                                        answers: {
                                            ...current.answers,
                                            [question.id]: event.target.value,
                                        },
                                    }))
                                }
                                className={homeworkStyles.gradeFieldWide}
                            />
                        </li>
                    ))}
                </ol>
            ) : null}

            <label className={managementStyles.field}>
                <span className={managementStyles.fieldLabel}>Notes for the teacher (optional)</span>
                <textarea
                    rows={2}
                    maxLength={2000}
                    placeholder="Anything the teacher should know about this work..."
                    value={state.notes}
                    onChange={event =>
                        setState(current => ({ ...current, notes: event.target.value }))
                    }
                    className={homeworkStyles.gradeFieldWide}
                />
            </label>

            <div className={homeworkStyles.attachmentList}>
                {(submission?.attachments ?? [])
                    .filter(attachment => !state.removeIds.includes(attachment.id))
                    .map(attachment => (
                        <span
                            key={attachment.id}
                            className={homeworkStyles.attachmentChip}>
                            <strong>File</strong>
                            <span>{attachment.name}</span>
                            <small>{formatFileSize(attachment.size_in_kb)}</small>
                            <button
                                type="button"
                                onClick={() =>
                                    setState(current => ({
                                        ...current,
                                        removeIds: [...current.removeIds, attachment.id],
                                    }))
                                }
                                className={homeworkStyles.fileChipRemove}
                                aria-label={`Remove ${attachment.name}`}>
                                ×
                            </button>
                        </span>
                    ))}
            </div>

            <label className={managementStyles.field}>
                <span className={managementStyles.fieldLabel}>
                    Add documents or photos ({maxFiles} slot{maxFiles === 1 ? '' : 's'} left)
                </span>
                <Input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx"
                    onChange={event => {
                        const picked = Array.from(event.target.files ?? [])

                        setState(current => ({
                            ...current,
                            files: [...current.files, ...picked].slice(0, Math.max(maxFiles, 0)),
                        }))

                        event.target.value = ''
                    }}
                />
                <span className={managementStyles.fieldHint}>
                    Up to 10 MB each: jpg, png, gif, webp, pdf, doc(x), xls(x), csv, txt, ppt(x).
                </span>
            </label>

            {state.files.length > 0 ? (
                <div className={homeworkStyles.attachmentList}>
                    {state.files.map((file, index) => (
                        <span key={`${file.name}-${index}`} className={homeworkStyles.attachmentChip}>
                            <strong>New</strong>
                            <span>{file.name}</span>
                            <button
                                type="button"
                                onClick={() => removePendingFile(index)}
                                className={homeworkStyles.fileChipRemove}
                                aria-label={`Remove ${file.name}`}>
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            ) : null}

            <div className={managementStyles.actions}>
                <button
                    type="button"
                    onClick={() => setConfirmAction('draft')}
                    disabled={busyAction !== null}
                    className={workspaceStyles.secondaryButton}>
                    {busyAction === 'draft' ? 'Saving...' : 'Save as draft'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (remainingQuestions > 0) {
                            showToast({
                                title: 'Incomplete response',
                                message: `${remainingQuestions} question${
                                    remainingQuestions === 1 ? ' still needs' : 's still need'
                                } an answer before you can submit.`,
                                type: 'error',
                            })
                            return
                        }

                        setConfirmAction('submit')
                    }}
                    disabled={busyAction !== null}
                    className={workspaceStyles.button}>
                    {busyAction === 'submit' ? 'Submitting...' : 'Submit response'}
                </button>
            </div>

            <ConfirmDialog
                open={confirmAction === 'draft'}
                eyebrow="Save draft"
                title="Save this draft?"
                message={
                    remainingQuestions > 0
                        ? `You have not answered ${remainingQuestions} question${
                              remainingQuestions === 1 ? '' : 's'
                          }. Drafts are private to you until you submit.`
                        : 'You can continue editing any time before you submit.'
                }
                confirmLabel="Save draft"
                busy={busyAction === 'draft'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => runAction('draft')}
            />

            <ConfirmDialog
                open={confirmAction === 'submit'}
                eyebrow="Submit response"
                tone="default"
                title="Submit this response?"
                message="The teacher will be notified immediately and the response can no longer be edited."
                confirmLabel="Submit response"
                busy={busyAction === 'submit'}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => runAction('submit')}
            />
        </div>
    )
}

export default function GuardianHomeworkPage() {
    const { user } = useAuth({ middleware: 'auth' })

    const isGuardian = isGuardianUser(user)

    const { data, isLoading, error, mutate } = useSWR(
        isGuardian ? '/api/guardian/homework' : null,
        fetcher,
    )

    const [openQuestions, setOpenQuestions] = useState({})
    const [openSubmissions, setOpenSubmissions] = useState({})

    if (!user) {
        return null
    }

    if (!isGuardian) {
        return (
            <WorkspacePageShell
                eyebrow="Schoolwork"
                title="Guardian access required"
                description={`This account is signed in as ${formatRoleLabel(
                    user?.role,
                )}. Only guardian accounts can follow their child's homework.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Homework updates are only available in the guardian portal.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    const child = data?.child ?? null
    const homework = data?.homework ?? []

    return (
        <WorkspacePageShell
            eyebrow="Schoolwork"
            title="Homework and results"
            description="Follow every task your child's teacher publishes, hand in documents or typed answers, and see the grades your child receives."
        >
            {!child && !isLoading ? (
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        {data?.message ??
                            error?.response?.data?.message ??
                            'No learner record is linked to this guardian account yet.'}
                    </p>
                </article>
            ) : null}

            {child ? (
                <section className={workspaceStyles.statGrid}>
                    {[
                        ['Learner', child.full_name],
                        ['Class', child.class_name],
                        ['Graded tasks', homework.filter(item => item.my_grade).length],
                        [
                            'Handed in',
                            homework.filter(item => item.my_submission?.status === 'submitted')
                                .length,
                        ],
                    ].map(([label, value]) => (
                        <article key={label} className={workspaceStyles.statCard}>
                            <p className={workspaceStyles.statLabel}>{label}</p>
                            <p className={workspaceStyles.statValue}>{value}</p>
                        </article>
                    ))}
                </section>
            ) : null}

            <section className={workspaceStyles.fullPanel}>
                <div className={workspaceStyles.panelHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>Class feed</p>
                        <h2 className={workspaceStyles.panelTitle}>Published homework</h2>
                    </div>
                </div>

                {isLoading ? (
                    <p className={managementStyles.notice}>Loading homework...</p>
                ) : child && homework.length === 0 ? (
                    <p className={managementStyles.notice}>
                        No homework has been published for this class yet. You will also receive
                        a notification whenever new work or results are posted.
                    </p>
                ) : child ? (
                    <div className={homeworkStyles.stack}>
                        {homework.map(item => {
                            const questionsOpen = openQuestions[item.id] ?? false
                            const submissionOpen = openSubmissions[item.id] ?? false

                                    const isItemOverdue = Boolean(item.due_date) && new Date(item.due_date) < new Date()
                                    const isItemSubmitted = item.my_submission?.status === 'submitted'

                                    return (
                                        <article key={item.id} className={homeworkStyles.taskCard}>
                                            <div className={homeworkStyles.taskHeader}>
                                                <div>
                                                    <h3 className={homeworkStyles.taskTitle}>
                                                        {item.title}
                                                    </h3>
                                                    <p className={homeworkStyles.taskMeta}>
                                                        Posted {formatDate(item.created_at) ?? 'recently'} ·{' '}
                                                        {item.teacher_name}
                                                    </p>
                                                </div>

                                                <div className={homeworkStyles.badgeRow}>
                                                    {isItemSubmitted ? (
                                                        <span className={homeworkStyles.submittedBadge}>
                                                            Handed in
                                                        </span>
                                                    ) : null}
                                                    {item.my_submission?.status === 'draft' ? (
                                                        <span className={homeworkStyles.draftBadge}>
                                                            Draft
                                                        </span>
                                                    ) : null}
                                                    {isItemOverdue && !isItemSubmitted ? (
                                                        <span className={homeworkStyles.overdueBadge}>
                                                            Deadline passed
                                                        </span>
                                                    ) : null}
                                                    {item.due_date ? (
                                                        <span className={homeworkStyles.dueBadge}>
                                                            Due {formatDueDate(item.due_date)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                    </div>

                                    {item.description ? (
                                        <p className={homeworkStyles.taskBody}>
                                            {item.description}
                                        </p>
                                    ) : null}

                                    {item.questions?.length ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenQuestions(current => ({
                                                        ...current,
                                                        [item.id]: !questionsOpen,
                                                    }))
                                                }
                                                className={workspaceStyles.secondaryButton}>
                                                {questionsOpen
                                                    ? 'Hide questions'
                                                    : `Show questions (${item.questions.length})`}
                                            </button>

                                            {questionsOpen ? (
                                                <ol className={homeworkStyles.questionList}>
                                                    {item.questions.map(question => (
                                                        <li
                                                            key={question.id}
                                                            className={
                                                                homeworkStyles.questionItem
                                                            }>
                                                            <span>
                                                                {question.question_text}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : null}
                                        </>
                                    ) : null}

                                    <AttachmentMedia attachments={item.attachments ?? []} />

                                    {item.my_grade ? (
                                        <div className={homeworkStyles.gradePanel}>
                                            <span className={homeworkStyles.gradePanelLabel}>
                                                Result
                                            </span>
                                            <span className={homeworkStyles.gradePanelValue}>
                                                {item.my_grade.grade}
                                            </span>
                                            {item.my_grade.remarks ? (
                                                <p className={homeworkStyles.gradePanelRemarks}>
                                                    {item.my_grade.remarks}
                                                </p>
                                            ) : null}
                                            {item.my_grade.graded_at ? (
                                                <small className={homeworkStyles.gradePanelMeta}>
                                                    Graded {formatDate(item.my_grade.graded_at)}
                                                </small>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {isItemOverdue && !isItemSubmitted ? null : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOpenSubmissions(current => ({
                                                    ...current,
                                                    [item.id]: !submissionOpen,
                                                }))
                                            }
                                            className={workspaceStyles.secondaryButton}>
                                            {submissionOpen
                                                ? 'Hide response area'
                                                : item.my_submission
                                                  ? 'Continue response'
                                                  : 'Prepare a response'}
                                        </button>
                                    )}

                                    {submissionOpen ? (
                                        <SubmissionPanel item={item} onSaved={mutate} />
                                    ) : null}
                                </article>
                            )
                        })}
                    </div>
                ) : null}
            </section>
        </WorkspacePageShell>
    )
}
