import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import styles from '@/app/(app)/workspace-page.module.css'

const reportRows = [
    ['Daily summary', 'Every school day at 16:15', 'Operations inbox and leadership digest'],
    ['Weekly risk report', 'Fridays at 17:00', 'Safeguarding and form tutor follow-up'],
    ['Fee-linked attendance', 'Mondays at 08:00', 'Bursar and head of section review'],
]

const insights = [
    {
        title: 'Secondary compliance dip',
        detail: 'Period 4 completion dropped 6% this week, mainly in practical subjects.',
        meta: 'Requires review',
    },
    {
        title: 'Primary attendance stable',
        detail: 'AM attendance remains above 94% across the last ten school days.',
        meta: 'Healthy',
    },
]

export default function AttendanceReportsPage() {
    return (
        <WorkspacePageShell
            eyebrow="Reporting"
            title="Attendance reporting and exports"
            description="Attendance Reports now has a dedicated destination for scheduled summaries, compliance tracking, and operational insight."
        >
            <section className={styles.statGrid}>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Latest attendance rate</p>
                    <p className={styles.statValue}>91.8%</p>
                    <p className={styles.statNote}>Combined in-person attendance across the last completed day.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Reports scheduled</p>
                    <p className={styles.statValue}>07</p>
                    <p className={styles.statNote}>Automated outputs routed to staff lists and compliance folders.</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statLabel}>Export backlog</p>
                    <p className={styles.statValue}>0</p>
                    <p className={styles.statNote}>No outstanding manual export requests at the moment.</p>
                </article>
            </section>

            <section className={styles.panelGrid}>
                <article className={styles.fullPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Schedules</p>
                            <h2 className={styles.panelTitle}>Published attendance outputs</h2>
                        </div>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Report</th>
                                    <th>Schedule</th>
                                    <th>Recipients</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map(row => (
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
                            <p className={styles.panelEyebrow}>Insight feed</p>
                            <h2 className={styles.panelTitle}>Current signals</h2>
                        </div>
                    </div>

                    <div className={styles.list}>
                        {insights.map(item => (
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
