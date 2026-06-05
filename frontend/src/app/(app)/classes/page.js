import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

const classRows = [
    ['Standard 5 East', '31 learners', 'Mrs Banda', 'Room P-03'],
    ['Standard 7 West', '28 learners', 'Mr Tembo', 'Room P-07'],
    ['Form 2 North', '34 learners', 'Ms Mbewe', 'Room S-11'],
    ['Form 4 Science', '26 learners', 'Mr Phiri', 'Lab 2'],
]

const capacityNotes = [
    {
        title: 'Primary section balance',
        detail: 'Two rooms are within three seats of their recommended cap.',
        meta: 'Monitor',
    },
    {
        title: 'Secondary specialist rooms',
        detail: 'Lab 2 and the ICT studio are locked to timetable-managed capacity.',
        meta: 'Pinned',
    },
]

export default function ClassesPage() {
    return (
        <WorkspacePageShell
            eyebrow="Academic Structure"
            title="Classes and room allocations"
            description="The classes menu now opens a dedicated screen for group structure, room placement, and staffing coverage instead of pointing at a shared dashboard fragment."
        >
            <section className={styles.statGrid}>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Active classes</p>
                    <p className={styles.statValue}>18</p>
                    <p className={styles.statNote}>Primary and secondary teaching groups currently published.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Vacant rooms</p>
                    <p className={styles.statValue}>03</p>
                    <p className={styles.statNote}>Available for ad-hoc interventions and exam seating.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Cover requests</p>
                    <p className={styles.statValue}>02</p>
                    <p className={styles.statNote}>Awaiting approval for this week’s schedule adjustments.</p>
                </article>
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.fullPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Live register</p>
                            <h2 className={styles.panelTitle}>Published class groups</h2>
                        </div>
                        <span className={styles.badge}>18 groups</span>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Class</th>
                                    <th>Size</th>
                                    <th>Tutor</th>
                                    <th>Room</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classRows.map(row => (
                                    <tr key={row[0]}>
                                        {row.map(cell => (
                                            <td key={cell}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Capacity</p>
                            <h2 className={styles.panelTitle}>Allocation notes</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        {capacityNotes.map(item => (
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
            </section>
        </WorkspacePageShell>
    )
}
