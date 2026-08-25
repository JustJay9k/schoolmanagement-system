'use client'

import { useState } from 'react'
import Image from 'next/image'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import { useAuth } from '@/hooks/auth'
import { formatRoleLabel, isGuardianUser } from '@/lib/userAccess'
import axios from '@/lib/axios'
import useSWR from 'swr'
import homeworkStyles from '@/app/(app)/gradebook/homework.module.css'

const fetcher = url => axios.get(url).then(response => response.data)

const formatDate = value =>
    value ? new Date(value).toLocaleString() : null

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

export default function GuardianHomeworkPage() {
    const { user } = useAuth({ middleware: 'auth' })

    const isGuardian = isGuardianUser(user)

    const { data, isLoading, error } = useSWR(
        isGuardian ? '/api/guardian/homework' : null,
        fetcher,
    )

    const [openQuestions, setOpenQuestions] = useState({})

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
            description="Follow every task your child's teacher publishes - instructions, questions, documents - and see the grades your child receives for each one."
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
                        [
                            'Graded tasks',
                            homework.filter(item => item.my_grade).length,
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
                        No homework has been published for this class yet. You will also
                        receive a notification whenever new work or results are posted.
                    </p>
                ) : child ? (
                    <div className={homeworkStyles.stack}>
                        {homework.map(item => {
                            const questionsOpen = openQuestions[item.id] ?? false

                            return (
                                <article key={item.id} className={homeworkStyles.taskCard}>
                                    <div className={homeworkStyles.taskHeader}>
                                        <div>
                                            <h3 className={homeworkStyles.taskTitle}>
                                                {item.title}
                                            </h3>
                                            <p className={homeworkStyles.taskMeta}>
                                                Posted{' '}
                                                {formatDate(item.created_at) ?? 'recently'} ·{' '}
                                                {item.teacher_name}
                                            </p>
                                        </div>

                                        <div className={homeworkStyles.badgeRow}>
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
                                                className={
                                                    workspaceStyles.secondaryButton
                                                }>
                                                {questionsOpen ? 'Hide questions' : 'Show questions'}
                                            </button>

                                            {questionsOpen ? (
                                                <ol className={homeworkStyles.questionList}>
                                                    {item.questions.map(question => (
                                                        <li
                                                            key={question.id}
                                                            className={
                                                                homeworkStyles.questionItem
                                                            }>
                                                            <span>{question.question_text}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : null}
                                        </>
                                    ) : null}

                                    {item.attachments?.some(
                                        attachment => attachment.is_image,
                                    ) ? (
                                        <div className={homeworkStyles.imageGrid}>
                                            {item.attachments
                                                .filter(attachment => attachment.is_image)
                                                .map(attachment => (
                                                    <a
                                                        key={attachment.id}
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={`Open ${attachment.name}`}
                                                        className={
                                                            homeworkStyles.imageThumbLink
                                                        }>
                                                        <Image
                                                            src={attachment.url}
                                                            alt={attachment.name}
                                                            width={480}
                                                            height={360}
                                                            className={
                                                                homeworkStyles.imageThumb
                                                            }
                                                            unoptimized
                                                        />
                                                    </a>
                                                ))}
                                        </div>
                                    ) : null}

                                    {item.attachments?.some(
                                        attachment => !attachment.is_image,
                                    ) ? (
                                        <div className={homeworkStyles.attachmentList}>
                                            <span className={homeworkStyles.attachmentLabel}>
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
                                                        className={homeworkStyles.attachmentChip}>
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
                                    ) : (
                                        <p className={homeworkStyles.gradePanelPending}>
                                            Not graded yet - results will appear here as soon
                                            as the teacher publishes them.
                                        </p>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                ) : null}
            </section>
        </WorkspacePageShell>
    )
}
