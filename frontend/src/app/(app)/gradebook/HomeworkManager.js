'use client'

import { useState } from 'react'
import Image from 'next/image'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import { useToast } from '@/components/ToastProvider'
import axios from '@/lib/axios'
import useSWR, { useSWRConfig } from 'swr'
import styles from './homework.module.css'

const fetcher = url => axios.get(url).then(response => response.data)

const MAX_QUESTIONS = 20
const MAX_FILES = 5
const FILE_ACCEPT =
    '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx'

const formatDate = value =>
    value ? new Date(value).toLocaleString() : null

const formatDueDate = value => {
    if (!value) {
        return null
    }

    const parsed = value.includes('T')
        ? new Date(value)
        : new Date(`${value}T00:00:00`)

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

const extractErrorMessage = error => {
    const errors = error?.response?.data?.errors

    if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0]

        if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey][0]) {
            return errors[firstKey][0]
        }
    }

    return error?.response?.data?.message ?? null
}

const createDraft = () => ({
    title: '',
    description: '',
    due_date: '',
    questions: [],
    files: [],
})

export default function HomeworkManager() {
    const { mutate } = useSWRConfig()
    const { showToast } = useToast()

    const [draft, setDraft] = useState(createDraft)
    const [questionInput, setQuestionInput] = useState('')
    const [publishing, setPublishing] = useState(false)
    const [expandedId, setExpandedId] = useState(null)
    const [responsesId, setResponsesId] = useState(null)
    const [gradeDrafts, setGradeDrafts] = useState({})
    const [savingGradesKey, setSavingGradesKey] = useState(null)
    const [pendingDelete, setPendingDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    const { data, isLoading } = useSWR('/api/teacher/homework', fetcher)

    const homeworkList = data?.homework ?? []
    const roster = data?.roster ?? []
    const gradedCount = homeworkList.reduce(
        (total, item) => total + (item.grades?.length ?? 0),
        0,
    )

    const updateDraft = (field, value) => {
        setDraft(current => ({ ...current, [field]: value }))
    }

    const addQuestion = () => {
        const question = questionInput.trim()

        if (
            !question ||
            draft.questions.length >= MAX_QUESTIONS ||
            draft.questions.includes(question)
        ) {
            return
        }

        updateDraft('questions', [...draft.questions, question])
        setQuestionInput('')
    }

    const removeQuestion = index => {
        updateDraft(
            'questions',
            draft.questions.filter((_, position) => position !== index),
        )
    }

    const addFiles = event => {
        const selected = Array.from(event.target.files ?? [])

        setDraft(current => ({
            ...current,
            files: [...current.files, ...selected].slice(0, MAX_FILES),
        }))
        event.target.value = ''
    }

    const removeFile = index => {
        setDraft(current => ({
            ...current,
            files: current.files.filter((_, position) => position !== index),
        }))
    }

    const publishHomework = async event => {
        event.preventDefault()

        if (!draft.title.trim()) {
            return
        }

        setPublishing(true)

        const formData = new FormData()
        formData.append('title', draft.title.trim())
        formData.append('description', draft.description.trim())

        if (draft.due_date) {
            formData.append('due_date', draft.due_date)
        }

        draft.questions.forEach(question =>
            formData.append('questions[]', question),
        )
        draft.files.forEach(file => formData.append('attachments[]', file))

        try {
            const response = await axios.post('/api/teacher/homework', formData)

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Homework published to your class guardians.',
            })
            setDraft(createDraft())
            await mutate('/api/teacher/homework')
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    extractErrorMessage(error) ??
                    'Unable to publish this homework right now.',
            })
        } finally {
            setPublishing(false)
        }
    }

    const gradeValueFor = (item, studentId, field) => {
        const edited = gradeDrafts[item.id]?.[studentId]?.[field]
        const saved = item.grades.find(
            entry => entry.student_record_id === studentId,
        )

        if (edited !== undefined) {
            return edited
        }

        return saved?.[field] ?? ''
    }

    const updateGradeField = (item, studentId, field, value) => {
        setGradeDrafts(current => ({
            ...current,
            [item.id]: {
                ...(current[item.id] ?? {}),
                [studentId]: {
                    ...(current[item.id]?.[studentId] ?? {}),
                    [field]: value,
                },
            },
        }))
    }

    const collectEntries = item =>
        roster
            .map(student => ({
                student_id: student.id,
                grade: gradeValueFor(item, student.id, 'grade').trim(),
                remarks: gradeValueFor(item, student.id, 'remarks').trim(),
            }))
            .filter(entry => entry.grade !== '' || entry.remarks !== '')

    const saveGrades = async item => {
        const entries = collectEntries(item)

        if (entries.length === 0) {
            showToast({
                type: 'info',
                message: 'Enter a grade or remarks for at least one learner.',
            })
            return
        }

        setSavingGradesKey(item.id)

        try {
            const response = await axios.put(
                `/api/teacher/homework/${item.id}/grades`,
                { grades: entries },
            )

            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Grades saved and guardians notified.',
            })
            setGradeDrafts(current => ({ ...current, [item.id]: {} }))
            await mutate('/api/teacher/homework')
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    extractErrorMessage(error) ??
                    'Unable to save these grades right now.',
            })
        } finally {
            setSavingGradesKey(null)
        }
    }

    const deleteHomework = async () => {
        if (!pendingDelete) {
            return
        }

        setDeleting(true)

        try {
            const response = await axios.delete(
                `/api/teacher/homework/${pendingDelete.id}`,
            )

            showToast({
                type: 'success',
                message: response.data?.message ?? 'Homework deleted.',
            })
            setPendingDelete(null)
            await mutate('/api/teacher/homework')
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    extractErrorMessage(error) ??
                    'Unable to delete this homework right now.',
            })
        } finally {
            setDeleting(false)
        }
    }

    if (data?.requiresClassAssignment) {
        return (
            <article className={workspaceStyles.fullPanel}>
                <p className={managementStyles.notice}>
                    Your account has no class assigned yet. Once an administrator
                    assigns you a school track and class, you can publish homework
                    and grade it here.
                </p>
            </article>
        )
    }

    return (
        <section className={styles.stack}>
            <div className={workspaceStyles.statGrid}>
                    {[
                        ['Published tasks', homeworkList.length],
                        ['Learners in class', roster.length],
                        ['Graded results', gradedCount],
                    ].map(([label, value]) => (
                        <article key={label} className={workspaceStyles.statCard}>
                            <p className={workspaceStyles.statLabel}>{label}</p>
                            <p className={workspaceStyles.statValue}>{value}</p>
                        </article>
                    ))}
                </div>

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>New task</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Publish homework to your class
                            </h2>
                        </div>
                    </div>

                    <form className={styles.composeStack} onSubmit={publishHomework}>
                        <div className={managementStyles.formGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Title
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    value={draft.title}
                                    onChange={event =>
                                        updateDraft('title', event.target.value)
                                    }
                                    placeholder="e.g. Fractions practice"
                                    maxLength={180}
                                    required
                                    disabled={publishing}
                                />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Due date &amp; time
                                </span>
                                <Input
                                    type="datetime-local"
                                    value={draft.due_date}
                                    onChange={event =>
                                        updateDraft('due_date', event.target.value)
                                    }
                                    disabled={publishing}
                                />
                            </label>
                        </div>

                        <label className={`${managementStyles.field} ${styles.fullWidth}`}>
                            <span className={managementStyles.fieldLabel}>
                                Instructions
                            </span>
                            <textarea
                                value={draft.description}
                                onChange={event =>
                                    updateDraft('description', event.target.value)
                                }
                                className={managementStyles.textarea}
                                placeholder="Explain the task learners and guardians should follow."
                                maxLength={5000}
                                disabled={publishing}
                            />
                        </label>

                        <label className={`${managementStyles.field} ${styles.fullWidth}`}>
                            <span className={managementStyles.fieldLabel}>
                                Questions
                            </span>
                            <div className={styles.questionComposer}>
                                <input
                                    value={questionInput}
                                    onChange={event =>
                                        setQuestionInput(event.target.value)
                                    }
                                    onKeyDown={event => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault()
                                            addQuestion()
                                        }
                                    }}
                                    placeholder={
                                        draft.questions.length >= MAX_QUESTIONS
                                            ? 'Question limit reached.'
                                            : 'Type a question and press Enter to add it.'
                                    }
                                    maxLength={1000}
                                    disabled={
                                        publishing ||
                                        draft.questions.length >= MAX_QUESTIONS
                                    }
                                    className={managementStyles.select}
                                />
                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    disabled={
                                        publishing ||
                                        !questionInput.trim() ||
                                        draft.questions.length >= MAX_QUESTIONS
                                    }
                                    className={workspaceStyles.secondaryButton}>
                                    Add
                                </button>
                            </div>

                            {draft.questions.length > 0 ? (
                                <ol className={styles.questionList}>
                                    {draft.questions.map((question, index) => (
                                        <li
                                            key={`${index}-${question}`}
                                            className={styles.questionItem}>
                                            <span>{question}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeQuestion(index)}
                                                disabled={publishing}
                                                className={styles.removeButton}>
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <span className={managementStyles.fieldHint}>
                                    Optional - add manual questions here if you are not
                                    uploading a document.
                                </span>
                            )}
                        </label>

                        <label className={`${managementStyles.field} ${styles.fullWidth}`}>
                            <span className={managementStyles.fieldLabel}>
                                Documents and pictures
                            </span>
                            <Input
                                type="file"
                                multiple
                                accept={FILE_ACCEPT}
                                onChange={addFiles}
                                disabled={
                                    publishing || draft.files.length >= MAX_FILES
                                }
                            />
                            <span className={managementStyles.fieldHint}>
                                Up to {MAX_FILES} files, 10MB each - worksheets as pdf,
                                images, or office documents.
                            </span>

                            {draft.files.length > 0 ? (
                                <div className={styles.attachmentList}>
                                    {draft.files.map((file, index) => (
                                        <span
                                            key={`${file.name}-${index}`}
                                            title={file.name}
                                            className={styles.attachmentChip}>
                                            <strong>
                                                {file.type.startsWith('image/')
                                                    ? 'Image'
                                                    : 'File'}
                                            </strong>
                                            <span>{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                disabled={publishing}
                                                className={styles.fileChipRemove}>
                                                Remove
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                        </label>

                        <div className={managementStyles.actions}>
                            <button
                                type="submit"
                                disabled={publishing}
                                className={workspaceStyles.button}>
                                {publishing ? 'Publishing...' : 'Publish homework'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDraft(createDraft())}
                                disabled={publishing}
                                className={workspaceStyles.secondaryButton}>
                                Clear
                            </button>
                        </div>
                    </form>
                </article>

                <article className={workspaceStyles.fullPanel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Task history</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                Published homework and grading
                            </h2>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className={managementStyles.notice}>Loading homework...</p>
                    ) : homeworkList.length === 0 ? (
                        <p className={managementStyles.notice}>
                            No homework has been published yet. Guardians of your class
                            will see each task here the moment you publish it.
                        </p>
                    ) : (
                        <div className={styles.stack}>
                            {homeworkList.map(item => {
                                const expanded = expandedId === item.id
                                const responsesOpen = responsesId === item.id

                                return (
                                    <article key={item.id} className={styles.taskCard}>
                                        <div className={styles.taskHeader}>
                                            <div>
                                                <h3 className={styles.taskTitle}>
                                                    {item.title}
                                                </h3>
                                                <p className={styles.taskMeta}>
                                                    Posted{' '}
                                                    {formatDate(item.created_at) ??
                                                        'recently'}{' '}
                                                    · {item.class_name} ·{' '}
                                                    {(item.questions?.length ?? 0) +
                                                        (item.attachments?.length ?? 0) >
                                                    0
                                                        ? `${item.questions?.length ?? 0} questions · ${item.attachments?.length ?? 0} documents`
                                                        : 'Instructions only'}
                                                </p>
                                            </div>

                                            <div className={styles.badgeRow}>
                                                {item.due_date ? (
                                                    <span className={styles.dueBadge}>
                                                        Due {formatDueDate(item.due_date)}
                                                    </span>
                                                ) : null}
                                                <span className={workspaceStyles.badge}>
                                                    {item.grades?.length ?? 0}/
                                                    {roster.length} graded
                                                </span>
                                            </div>
                                        </div>

                                        {item.description ? (
                                            <p className={styles.taskBody}>
                                                {item.description}
                                            </p>
                                        ) : null}

                                        {item.questions?.length ? (
                                            <ol className={styles.questionList}>
                                                {item.questions.map(question => (
                                                    <li
                                                        key={question.id}
                                                        className={styles.questionItem}>
                                                        <span>{question.question_text}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : null}

                                        {item.attachments?.some(
                                            attachment => attachment.is_image,
                                        ) ? (
                                            <div className={styles.imageGrid}>
                                                {item.attachments
                                                    .filter(attachment => attachment.is_image)
                                                    .map(attachment => (
                                                        <a
                                                            key={attachment.id}
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title={`Open ${attachment.name}`}
                                                            className={styles.imageThumbLink}>
                                                            <Image
                                                                src={attachment.url}
                                                                alt={attachment.name}
                                                                width={480}
                                                                height={360}
                                                                className={styles.imageThumb}
                                                                unoptimized
                                                            />
                                                        </a>
                                                    ))}
                                            </div>
                                        ) : null}

                                        {item.attachments?.some(
                                            attachment => !attachment.is_image,
                                        ) ? (
                                            <div className={styles.attachmentList}>
                                                <span className={styles.attachmentLabel}>
                                                    Documents
                                                </span>
                                                {item.attachments
                                                    .filter(attachment => !attachment.is_image)
                                                    .map(attachment => (
                                                        <a
                                                            key={attachment.id}
                                                            href={attachment.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title={attachment.name}
                                                            className={styles.attachmentChip}>
                                                            <strong>File</strong>
                                                            <span>{attachment.name}</span>
                                                            <small>
                                                                {formatFileSize(
                                                                    attachment.size_in_kb,
                                                                )}
                                                            </small>
                                                        </a>
                                                    ))}
                                            </div>
                                        ) : null}

                                        <div className={managementStyles.actions}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedId(expanded ? null : item.id)
                                                }
                                                className={workspaceStyles.secondaryButton}>
                                                {expanded
                                                    ? 'Hide grading'
                                                    : `Add grades (${roster.length} learners)`}
                                            </button>
                                            {(item.submissions?.length ?? 0) > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setResponsesId(
                                                            responsesOpen ? null : item.id,
                                                        )
                                                    }
                                                    className={workspaceStyles.secondaryButton}>
                                                    {responsesOpen
                                                        ? 'Hide responses'
                                                        : `View responses (${item.submissions.length})`}
                                                </button>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={() => setPendingDelete(item)}
                                                disabled={deleting}
                                                className={styles.dangerTextButton}>
                                                Delete task
                                            </button>
                                        </div>

                                        {expanded ? (
                                            <div className={workspaceStyles.tableWrap}>
                                                <table className={workspaceStyles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>Learner</th>
                                                            <th>Grade</th>
                                                            <th>Remarks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {roster.map(student => {
                                                            const saved = item.grades.find(
                                                                entry =>
                                                                    entry.student_record_id ===
                                                                    student.id,
                                                            )

                                                            return (
                                                                <tr key={student.id}>
                                                                    <td>
                                                                        <strong>
                                                                            {student.full_name}
                                                                        </strong>
                                                                        {saved?.updated_at ? (
                                                                            <small>
                                                                                Saved{' '}
                                                                                {formatDate(
                                                                                    saved.updated_at,
                                                                                )}
                                                                            </small>
                                                                        ) : null}
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.1"
                                                                            value={gradeValueFor(
                                                                                item,
                                                                                student.id,
                                                                                'grade',
                                                                            )}
                                                                            onChange={event =>
                                                                                updateGradeField(
                                                                                    item,
                                                                                    student.id,
                                                                                    'grade',
                                                                                    event.target.value,
                                                                                )
                                                                            }
                                                                            placeholder="0 - 100"
                                                                            maxLength={60}
                                                                            disabled={
                                                                                savingGradesKey ===
                                                                                item.id
                                                                            }
                                                                            className={
                                                                                styles.gradeField
                                                                            }
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            value={gradeValueFor(
                                                                                item,
                                                                                student.id,
                                                                                'remarks',
                                                                            )}
                                                                            onChange={event =>
                                                                                updateGradeField(
                                                                                    item,
                                                                                    student.id,
                                                                                    'remarks',
                                                                                    event.target.value,
                                                                                )
                                                                            }
                                                                            placeholder="Optional comment for the guardian"
                                                                            maxLength={1000}
                                                                            disabled={
                                                                                savingGradesKey ===
                                                                                item.id
                                                                            }
                                                                            className={
                                                                                styles.gradeFieldWide
                                                                            }
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>

                                                <div className={managementStyles.actions}>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveGrades(item)}
                                                        disabled={savingGradesKey === item.id}
                                                        className={workspaceStyles.button}>
                                                        {savingGradesKey === item.id
                                                            ? 'Saving...'
                                                            : 'Save grades and notify guardians'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {responsesOpen ? (
                                            <div className={styles.stack}>
                                                {item.submissions.map(submission => (
                                                    <article
                                                        key={submission.id}
                                                        className={
                                                            styles.submissionCard
                                                        }>
                                                        <div
                                                            className={
                                                                styles.taskHeader
                                                            }>
                                                            <strong>
                                                                {
                                                                    submission.student_name
                                                                }
                                                            </strong>
                                                            <small
                                                                className={
                                                                    styles.taskMeta
                                                                }>
                                                                Submitted{' '}
                                                                {formatDate(
                                                                    submission.submitted_at,
                                                                )}
                                                            </small>
                                                        </div>

                                                        {submission.answers?.length ? (
                                                            <ol
                                                                className={
                                                                    styles.qaList
                                                                }>
                                                                {submission.answers.map(
                                                                    answerEntry => (
                                                                        <li
                                                                            key={
                                                                                answerEntry.question_id
                                                                            }
                                                                            className={
                                                                                styles.qaItem
                                                                            }>
                                                                            <p
                                                                                className={
                                                                                    styles.qaQuestion
                                                                                }>
                                                                                {item.questions?.find(
                                                                                    question =>
                                                                                        question.id ===
                                                                                        answerEntry.question_id,
                                                                                )?.question_text ??
                                                                                    'Answer'}
                                                                            </p>
                                                                            <p
                                                                                className={
                                                                                    styles.qaAnswer
                                                                                }>
                                                                                {
                                                                                    answerEntry.answer
                                                                                }
                                                                            </p>
                                                                        </li>
                                                                    ),
                                                                )}
                                                            </ol>
                                                        ) : null}

                                                        {submission.notes ? (
                                                            <p className={styles.taskBody}>
                                                                {submission.notes}
                                                            </p>
                                                        ) : null}

                                                        {submission.attachments?.some(
                                                            attachment =>
                                                                attachment.is_image,
                                                        ) ? (
                                                            <div
                                                                className={
                                                                    styles.imageGrid
                                                                }>
                                                                {submission.attachments
                                                                    .filter(
                                                                        attachment =>
                                                                            attachment.is_image,
                                                                    )
                                                                    .map(attachment => (
                                                                        <a
                                                                            key={
                                                                                attachment.id
                                                                            }
                                                                            href={
                                                                                attachment.url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            title={`Open ${attachment.name}`}
                                                                            className={
                                                                                styles.imageThumbLink
                                                                            }>
                                                                            <Image
                                                                                src={
                                                                                    attachment.url
                                                                                }
                                                                                alt={
                                                                                    attachment.name
                                                                                }
                                                                                width={
                                                                                    480
                                                                                }
                                                                                height={
                                                                                    360
                                                                                }
                                                                                className={
                                                                                    styles.imageThumb
                                                                                }
                                                                                unoptimized
                                                                            />
                                                                        </a>
                                                                    ))}
                                                            </div>
                                                        ) : null}

                                                        {submission.attachments?.some(
                                                            attachment =>
                                                                !attachment.is_image,
                                                        ) ? (
                                                            <div
                                                                className={
                                                                    styles.attachmentList
                                                                }>
                                                                {submission.attachments
                                                                    .filter(
                                                                        attachment =>
                                                                            !attachment.is_image,
                                                                    )
                                                                    .map(attachment => (
                                                                        <a
                                                                            key={
                                                                                attachment.id
                                                                            }
                                                                            href={
                                                                                attachment.url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            title={
                                                                                attachment.name
                                                                            }
                                                                            className={
                                                                                styles.attachmentChip
                                                                            }>
                                                                            <strong>
                                                                                File
                                                                            </strong>
                                                                            <span>
                                                                                {
                                                                                    attachment.name
                                                                                }
                                                                            </span>
                                                                            <small>
                                                                                {formatFileSize(
                                                                                    attachment.size_in_kb,
                                                                                )}
                                                                            </small>
                                                                        </a>
                                                                    ))}
                                                            </div>
                                                        ) : null}
                                                    </article>
                                                ))}
                                            </div>
                                        ) : null}
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </article>

                <ConfirmDialog
                    open={Boolean(pendingDelete)}
                    eyebrow="Delete homework"
                    title="Delete this homework?"
                    message={`"${pendingDelete?.title ?? ''}" will be removed along with its documents and recorded grades.`}
                    confirmLabel="Delete homework"
                    busyLabel="Deleting..."
                    tone="danger"
                    busy={deleting}
                    onClose={() => setPendingDelete(null)}
                    onConfirm={deleteHomework}
                />
        </section>
    )
}
