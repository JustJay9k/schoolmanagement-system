import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

const studentWatchlist = [
    {
        name: 'Tadala Soko',
        detail: 'Five absences this term triggered an attendance intervention.',
        meta: 'Attendance risk',
    },
    {
        name: 'Martha Kalua',
        detail: 'Breakfast support and transport notes are attached to the profile.',
        meta: 'Welfare support',
    },
    {
        name: 'Brian Chirwa',
        detail: 'One unpaid balance review and a parent meeting are pending.',
        meta: 'Finance follow-up',
    },
]

const profileBlocks = [
    ['Profiles synced', '612', 'Student records currently visible to staff users.'],
    ['Guardians verified', '88%', 'Guardian contact and consent records confirmed this term.'],
    ['Medical alerts', '17', 'Learners with flags that should surface during register capture.'],
]

export default function StudentsPage() {
    return (
        <WorkspacePageShell
            eyebrow="Student Records"
            title="Student profiles and support flags"
            description="This screen gives the students menu its own destination for profile access, interventions, and safeguarding context."
        >
            <section className={styles.statGrid}>
                {profileBlocks.map(([label, value, note]) => (
                    <article key={label} className={styles.statCard}>
                        <p className={styles.statLabel}>{label}</p>
                        <p className={styles.statValue}>{value}</p>
                        <p className={styles.statNote}>{note}</p>
                    </article>
                ))}
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.fullPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Watchlist</p>
                            <h2 className={styles.panelTitle}>Students needing follow-up</h2>
                        </div>
                        <span className={styles.badge}>3 active cases</span>
                    </div>

                    <div className={styles.list}>
                        {studentWatchlist.map(item => (
                            <div key={item.name} className={styles.listItem}>
                                <div>
                                    <strong>{item.name}</strong>
                                    <p>{item.detail}</p>
                                </div>
                                <span className={styles.badge}>{item.meta}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </WorkspacePageShell>
    )
}
