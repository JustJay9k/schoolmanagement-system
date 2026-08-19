import Link from 'next/link'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

export default function ClassesPage() {
    return (
        <WorkspacePageShell
            eyebrow="Academic Structure"
            title="Classes and room allocations"
            description="This page now routes class-related work to the real student, school structure, and teacher allocation workspaces instead of showing sample class data."
        >
            <section className={styles.panelGrid}>
                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Class Records</p>
                            <h2 className={styles.panelTitle}>Use live school data</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/students" className={styles.listItem}>
                            <div>
                                <strong>Students</strong>
                                <p>Review learner records and class placement from the live register.</p>
                            </div>
                        </Link>

                        <Link href="/management/form-teachers" className={styles.listItem}>
                            <div>
                                <strong>Teacher Allocations</strong>
                                <p>Assign teachers to classes and subjects from the management workspace.</p>
                            </div>
                        </Link>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Administration</p>
                            <h2 className={styles.panelTitle}>School structure tools</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        <Link href="/management/school-structure" className={styles.listItem}>
                            <div>
                                <strong>School Structure</strong>
                                <p>Maintain the class structure used throughout the portal.</p>
                            </div>
                        </Link>
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
