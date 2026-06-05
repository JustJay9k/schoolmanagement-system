import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

const timetableRows = [
    ['Monday', '23 lessons published', '2 room swaps pending'],
    ['Tuesday', '24 lessons published', 'No conflicts'],
    ['Wednesday', '22 lessons published', 'Assembly block affects Period 1'],
    ['Thursday', '24 lessons published', '1 staff cover request'],
    ['Friday', '21 lessons published', 'Sports rotation after lunch'],
]

const workflowNotes = [
    {
        title: 'Cover management',
        detail: 'Two requests still need approval before Thursday morning release.',
        meta: '2 pending',
    },
    {
        title: 'Room utilization',
        detail: 'ICT and science rooms are at peak usage in the secondary timetable.',
        meta: 'High load',
    },
]

export default function TimetablesPage() {
    return (
        <WorkspacePageShell
            eyebrow="Scheduling"
            title="Timetables and class coverage"
            description="The timetables menu now opens a dedicated scheduling workspace for published lessons, room conflicts, and staff cover."
        >
            <section className={styles.statGrid}>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Published lessons</p>
                    <p className={styles.statValue}>114</p>
                    <p className={styles.statNote}>All current lessons across this week’s active timetable.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Room conflicts</p>
                    <p className={styles.statValue}>01</p>
                    <p className={styles.statNote}>A single lab clash remains unresolved for Thursday.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Cover requests</p>
                    <p className={styles.statValue}>02</p>
                    <p className={styles.statNote}>Temporary replacements still awaiting confirmation.</p>
                </article>
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.fullPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Week view</p>
                            <h2 className={styles.panelTitle}>Published schedule overview</h2>
                        </div>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>Publication status</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timetableRows.map(row => (
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
                            <p className={styles.panelEyebrow}>Workflow</p>
                            <h2 className={styles.panelTitle}>Operational notes</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        {workflowNotes.map(item => (
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
