import Link from 'next/link'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

export default function AttendanceReportsPage() {
    return (
        <WorkspacePageShell
            eyebrow="Reporting"
            title="Attendance reporting and exports"
            description="This workspace no longer shows sample attendance figures. Use it as the reporting destination connected to the live register and notification workflows."
        >
            <section className={styles.panelGrid}>
                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Source Data</p>
                            <h2 className={styles.panelTitle}>Attendance starts in the register</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/dashboard" className={styles.listItem}>
                            <div>
                                <strong>Teacher dashboard</strong>
                                <p>Capture live attendance in the assigned class register.</p>
                            </div>
                        </Link>

                        <Link href="/registers" className={styles.listItem}>
                            <div>
                                <strong>Register Centre</strong>
                                <p>Return to the register workspace for attendance-related tasks.</p>
                            </div>
                        </Link>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Operational Follow-up</p>
                            <h2 className={styles.panelTitle}>Use related workspaces</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/notifications" className={styles.listItem}>
                            <div>
                                <strong>Notifications</strong>
                                <p>Review attendance-related alerts and announcements.</p>
                            </div>
                        </Link>
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
