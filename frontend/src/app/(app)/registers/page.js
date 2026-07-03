import Link from 'next/link'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

export default function RegistersPage() {
    return (
        <WorkspacePageShell
            eyebrow="Register Centre"
            title="Attendance register workflows"
            description="Open the live teacher register, review attendance reporting, and manage register-related work without relying on demo dashboard data."
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
            <section className={styles.panelGrid}>
                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Register Entry</p>
                            <h2 className={styles.panelTitle}>Capture attendance in the dashboard</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <div className={styles.listItem}>
                            <div>
                                <strong>Teachers</strong>
                                <p>
                                    Use the main dashboard to mark attendance and
                                    add quick student notes for the assigned class.
                                </p>
                            </div>
                        </div>

                        <div className={styles.listItem}>
                            <div>
                                <strong>Head teachers</strong>
                                <p>
                                    Review linked management tools for students,
                                    gradebook, subjects, allocations, and timetables.
                                </p>
                            </div>
                        </div>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Related Pages</p>
                            <h2 className={styles.panelTitle}>Where register work now lives</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/dashboard" className={styles.listItem}>
                            <div>
                                <strong>Dashboard</strong>
                                <p>Live teacher register entry and learner profile view.</p>
                            </div>
                        </Link>

                        <Link href="/attendance-reports" className={styles.listItem}>
                            <div>
                                <strong>Attendance Reports</strong>
                                <p>Attendance reporting workspace and export destination.</p>
                            </div>
                        </Link>
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
