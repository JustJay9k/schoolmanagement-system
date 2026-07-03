import Link from 'next/link'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

export default function BehaviourPage() {
    return (
        <WorkspacePageShell
            eyebrow="Pastoral"
            title="Behaviour log and escalation flow"
            description="This page no longer presents sample behaviour totals. Behaviour follow-up should come from real teacher notes, notifications, and learner records."
        >
            <section className={styles.panelGrid}>
                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Teacher Actions</p>
                            <h2 className={styles.panelTitle}>Log conduct from live learner data</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/dashboard" className={styles.listItem}>
                            <div>
                                <strong>Dashboard</strong>
                                <p>Teachers can log discipline notes from the active learner profile.</p>
                            </div>
                        </Link>

                        <Link href="/students" className={styles.listItem}>
                            <div>
                                <strong>Students</strong>
                                <p>Open the learner register to review student details and context.</p>
                            </div>
                        </Link>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Communication</p>
                            <h2 className={styles.panelTitle}>Use the notification flow</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/notifications" className={styles.listItem}>
                            <div>
                                <strong>Notifications</strong>
                                <p>Track sent updates and role-based alerts from the live system.</p>
                            </div>
                        </Link>
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
