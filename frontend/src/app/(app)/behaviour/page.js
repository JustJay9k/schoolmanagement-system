import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

const incidentRows = [
    ['Late arrival', '12 this week', 'Mostly transport-related'],
    ['Uniform issue', '6 this week', 'Primary upper section'],
    ['Missed prep task', '4 this week', 'Secondary intervention list'],
    ['Disruptive conduct', '2 this week', 'Leadership review required'],
]

const behaviourActions = [
    {
        title: 'Escalation routing',
        detail: 'Three incidents are waiting for pastoral or head of section acknowledgement.',
        meta: '3 pending',
    },
    {
        title: 'Parent communication',
        detail: 'Two log entries need guardian summaries before the end of day.',
        meta: 'Due today',
    },
]

export default function BehaviourPage() {
    return (
        <WorkspacePageShell
            eyebrow="Pastoral"
            title="Behaviour log and escalation flow"
            description="The behaviour menu now opens its own workspace for incident tracking, parent communication, and disciplinary follow-up."
        >
            <section className={styles.statGrid}>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Open behaviour cases</p>
                    <p className={styles.statValue}>05</p>
                    <p className={styles.statNote}>Cases that still require an action, note, or escalation.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Detention queue</p>
                    <p className={styles.statValue}>02</p>
                    <p className={styles.statNote}>Students waiting for final confirmation and attendance sign-off.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Resolved this week</p>
                    <p className={styles.statValue}>14</p>
                    <p className={styles.statNote}>Completed conduct records with documented outcomes.</p>
                </article>
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.fullPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Trends</p>
                            <h2 className={styles.panelTitle}>Behaviour categories this week</h2>
                        </div>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Volume</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidentRows.map(row => (
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
                            <p className={styles.panelEyebrow}>Follow-up</p>
                            <h2 className={styles.panelTitle}>Required actions</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        {behaviourActions.map(item => (
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
