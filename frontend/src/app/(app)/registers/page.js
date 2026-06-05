import Link from 'next/link'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

const registerQueues = [
    {
        title: 'Morning register collection',
        detail: '12 classes are open for submission between 07:30 and 08:15.',
        meta: 'Window active',
    },
    {
        title: 'Period register follow-up',
        detail: 'Science block still needs four secondary submissions before break.',
        meta: '4 pending',
    },
    {
        title: 'Export and archive',
        detail: 'Yesterday’s registers are ready for compliance export and audit review.',
        meta: 'Ready now',
    },
]

const quickActions = [
    ['Open live dashboard', 'Use the main dashboard to capture attendance and student notes.'],
    ['Review exceptions', 'Check late, sick, absent, and excused learners before lock.'],
    ['Prepare export pack', 'Bundle the selected date range for leadership review.'],
]

export default function RegistersPage() {
    return (
        <WorkspacePageShell
            eyebrow="Register Centre"
            title="Attendance register workflows"
            description="This page gives the register menu a real destination for submission, exception handling, and export tasks instead of bouncing back to a dashboard section."
            actions={
                <>
                    <Link href="/dashboard" className={styles.button}>
                        Open live register
                    </Link>
                    <Link href="/attendance-reports" className={styles.secondaryButton}>
                        View reports
                    </Link>
                </>
            }>
            <section className={styles.statGrid}>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Registers due today</p>
                    <p className={styles.statValue}>26</p>
                    <p className={styles.statNote}>AM, PM, and scheduled period collections.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Awaiting submission</p>
                    <p className={styles.statValue}>04</p>
                    <p className={styles.statNote}>Secondary science, arts, and one primary homeroom.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Export status</p>
                    <p className={styles.statValue}>Ready</p>
                    <p className={styles.statNote}>Yesterday’s register pack can be downloaded or archived.</p>
                </article>
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Queue</p>
                            <h2 className={styles.panelTitle}>Today&apos;s register jobs</h2>
                        </div>
                        <span className={styles.badge}>Operational</span>
                    </div>

                    <div className={styles.list}>
                        {registerQueues.map(item => (
                            <div key={item.title} className={styles.listItem}>
                                <div>
                                    <strong>{item.title}</strong>
                                    <p>{item.detail}</p>
                                </div>
                                <span className={styles.badge}>{item.meta}</span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Tasks</p>
                            <h2 className={styles.panelTitle}>Operator checklist</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        {quickActions.map(([title, detail]) => (
                            <div key={title} className={styles.listItem}>
                                <div>
                                    <strong>{title}</strong>
                                    <p>{detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
