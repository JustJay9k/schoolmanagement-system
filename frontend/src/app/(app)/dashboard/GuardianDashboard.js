'use client'

import useSWR from 'swr'
import axios from '@/lib/axios'
import styles from './dashboard.module.css'

const fetcher = url => axios.get(url).then(response => response.data)

const formatTimestamp = value => {
    if (!value) {
        return 'Not uploaded yet'
    }

    return new Date(value).toLocaleString()
}

const GuardianDashboard = ({ user }) => {
    const { data, isLoading } = useSWR(user ? '/api/guardian/child' : null, fetcher)

    const child = data?.child ?? null
    const announcements = data?.announcements ?? []
    const performanceRecords = child?.performance_records ?? []

    if (isLoading) {
        return (
            <div className={`${styles.statusNotice} ${styles.statusIdle}`}>
                Loading learner information...
            </div>
        )
    }

    if (!child) {
        return (
            <div className={`${styles.statusNotice} ${styles.statusError}`}>
                {data?.message ??
                    'No learner record is linked to this guardian account yet.'}
            </div>
        )
    }

    return (
        <div className={styles.managementStack}>
            <section className={styles.managementCards}>
                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Learner</p>
                    <p className={styles.managementValue}>{child.full_name}</p>
                    <p className={styles.metricMeta}>
                        {child.school_track_label} · {child.class_name}
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Latest grade</p>
                    <p className={styles.managementValue}>
                        {child.latest_grade ?? 'Pending'}
                    </p>
                    <p className={styles.metricMeta}>
                        Updated {formatTimestamp(child.latest_updated_at)}
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Teacher updates</p>
                    <p className={styles.managementValue}>
                        {String(performanceRecords.length).padStart(2, '0')}
                    </p>
                    <p className={styles.metricMeta}>
                        Uploaded comments and grade records visible to this account.
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>School</p>
                    <p className={styles.managementValue}>
                        {child.school_name ?? user?.school?.name ?? 'Assigned school'}
                    </p>
                    <p className={styles.metricMeta}>
                        Notifications and announcements continue in the notices menu.
                    </p>
                </div>
            </section>

            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Learner Profile</p>
                            <h2 className={styles.panelTitle}>Basic information</h2>
                        </div>
                        <span className={styles.groupBadge}>{child.class_name}</span>
                    </div>

                    <div className={styles.bioDataGrid}>
                        {[
                            ['Student code', child.student_code ?? 'N/A'],
                            ['Age', child.age ?? 'N/A'],
                            ['Sex', child.sex ?? 'N/A'],
                            ['Birth date', child.date_of_birth ?? 'N/A'],
                            ['Guardian name', child.guardian_name ?? user?.name ?? 'N/A'],
                            ['Residence', child.residence ?? 'N/A'],
                        ].map(([label, value]) => (
                            <div key={label} className={styles.bioDataCard}>
                                <span>{label}</span>
                                <strong>{value}</strong>
                            </div>
                        ))}
                    </div>

                    <div className={styles.noteCard}>
                        <span>Latest teacher comment</span>
                        <strong>
                            {child.latest_comment?.trim() ||
                                'No teacher comment has been uploaded yet.'}
                        </strong>
                        <small>
                            Review the full history below as more teacher updates are
                            submitted.
                        </small>
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Notices</p>
                            <h2 className={styles.panelTitle}>
                                Recent notifications and announcements
                            </h2>
                        </div>
                    </div>

                    <div className={styles.alertList}>
                        {announcements.length === 0 ? (
                            <div className={styles.alertCard}>
                                <div>
                                    <strong>No notices yet</strong>
                                    <p>
                                        Older notifications will also appear in the
                                        notifications menu once they are sent.
                                    </p>
                                </div>
                                <span className={styles.alertTag}>Inbox</span>
                            </div>
                        ) : (
                            announcements.map(item => (
                                <div key={item.id} className={styles.alertCard}>
                                    <div>
                                        <strong>{item.title}</strong>
                                        <p>{item.message}</p>
                                    </div>
                                    <span className={styles.alertTag}>
                                        {item.level}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div>
                        <p className={styles.panelEyebrow}>Performance History</p>
                        <h2 className={styles.panelTitle}>
                            Teacher grades and comments
                        </h2>
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.compactTable}>
                        <thead>
                            <tr>
                                <th>Teacher</th>
                                <th>Grade</th>
                                <th>Comment</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performanceRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        No grades or teacher comments have been uploaded
                                        yet.
                                    </td>
                                </tr>
                            ) : (
                                performanceRecords.map(record => (
                                    <tr key={record.id}>
                                        <td>{record.teacher_name}</td>
                                        <td>{record.grade}</td>
                                        <td>{record.comment || 'No comment added.'}</td>
                                        <td>{formatTimestamp(record.updated_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

export default GuardianDashboard
