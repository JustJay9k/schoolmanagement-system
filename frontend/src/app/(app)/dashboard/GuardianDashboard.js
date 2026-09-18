'use client'

import { Fragment, useMemo, useState } from 'react'
import useSWR from 'swr'
import axios from '@/lib/axios'
import GradeLetterBadge from '@/components/GradeLetterBadge'
import GradeScaleLegend from '@/components/GradeScaleLegend'
import { buildClassTermGroups } from '@/lib/performanceHistory'
import styles from './dashboard.module.css'

const fetcher = url => axios.get(url).then(response => response.data)

function ChevronIcon({ open }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`${styles.chevron} ${
                open ? styles.chevronOpen : ''
            }`}
            aria-hidden="true">
            <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
            />
        </svg>
    )
}

const formatCurrency = value =>
    new Intl.NumberFormat('en-MW', {
        style: 'currency',
        currency: 'MWK',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0))

const formatPaidStatus = value => (value ? 'Paid' : 'Not paid')

const attendanceStatusClasses = {
    P: 'present',
    L: 'late',
    S: 'sick',
    A: 'absent',
    E: 'excused',
}

const renderSubjectGrades = (record, bands) => {
    const subjectGrades = record?.subject_grades ?? []

    if (subjectGrades.length === 0) {
        return record?.grade_summary ?? record?.grade ?? 'Pending'
    }

    return (
        <div className={styles.subjectGradeSummary}>
            {subjectGrades.map(subjectGrade => (
                <div
                    key={`${record.id}-${subjectGrade.subject_id}`}
                    className={styles.subjectGradeSummaryItem}
                >
                    <span>{subjectGrade.subject_name}</span>
                    <span className={styles.subjectGradeSummaryValue}>
                        <strong>{subjectGrade.grade}</strong>
                        <GradeLetterBadge
                            grade={subjectGrade.grade}
                            bands={bands}
                        />
                    </span>
                    {subjectGrade.remarks ? (
                        <span className={styles.subjectGradeSummaryRemark}>
                            {subjectGrade.remarks}
                        </span>
                    ) : null}
                </div>
            ))}
        </div>
    )
}

const GuardianDashboard = ({ user }) => {
    const { data, isLoading } = useSWR(
        user ? '/api/guardian/child' : null,
        fetcher,
    )

    const child = data?.child ?? null
    const announcements = data?.announcements ?? []
    const performanceRecords = child?.performance_records ?? []
    const todayAttendance = child?.today_attendance ?? null
    const attendanceClass = todayAttendance?.code
        ? styles[attendanceStatusClasses[todayAttendance.code]]
        : styles.statusBadgeMuted

    const gradeHistory = useMemo(
        () => buildClassTermGroups(performanceRecords),
        [performanceRecords],
    )

    const [collapsedClasses, setCollapsedClasses] = useState(
        () => new Set(),
    )
    const [collapsedTerms, setCollapsedTerms] = useState(() => new Set())

    const toggleClassGroup = key =>
        setCollapsedClasses(current => {
            const next = new Set(current)

            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }

            return next
        })

    const toggleTermGroup = key =>
        setCollapsedTerms(current => {
            const next = new Set(current)

            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }

            return next
        })

    const collapseAllHistory = () => {
        setCollapsedClasses(new Set(gradeHistory.map(group => group.key)))
        setCollapsedTerms(
            new Set(
                gradeHistory.flatMap(group =>
                    group.terms.map(term => `${group.key}:${term.key}`),
                ),
            ),
        )
    }

    const expandAllHistory = () => {
        setCollapsedClasses(new Set())
        setCollapsedTerms(new Set())
    }

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
                    <p className={styles.metricLabel}>Today's registration</p>
                    <p className={styles.managementValue}>
                        <span
                            className={`${styles.statusBadge} ${styles.attendanceStatus} ${attendanceClass}`}>
                            {todayAttendance?.label ?? 'Not submitted'}
                        </span>
                    </p>
                    <p className={styles.metricMeta}>
                        {todayAttendance?.label
                            ? 'Submitted by the class teacher.'
                            : 'Waiting for the class teacher to submit.'}
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Latest grade update</p>
                    <p className={styles.managementValue}>
                        {child.latest_grade_summary ??
                            child.latest_grade ??
                            'Pending'}
                    </p>
                    <p className={styles.metricMeta}>
                        {child.latest_assessment_period_name
                            ? `${child.latest_assessment_period_name} | `
                            : 'No assessment period recorded'}
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Latest test position</p>
                    <p className={styles.managementValue}>
                        {child.latest_class_position != null
                            ? `#${child.latest_class_position}`
                            : '—'}
                        {child.latest_total_class_students != null
                            ? ` / ${child.latest_total_class_students}`
                            : ''}
                    </p>
                    <p className={styles.metricMeta}>
                        {child.latest_average_score != null ? (
                            <span className={styles.averageWithBadge}>
                                Average score {child.latest_average_score}%
                                <GradeLetterBadge
                                    grade={`${child.latest_average_score}%`}
                                    bands={child?.grade_bands}
                                />
                            </span>
                        ) : (
                            'No scores recorded yet'
                        )}
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Teacher updates</p>
                    <p className={styles.managementValue}>
                        {String(performanceRecords.length).padStart(2, '0')}
                    </p>
                    <p className={styles.metricMeta}>
                        Uploaded comments and grade records visible to this
                        account.
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>School</p>
                    <p className={styles.managementValue}>
                        {child.school_name ??
                            user?.school?.name ??
                            'Assigned school'}
                    </p>
                    <p className={styles.metricMeta}>
                        Notifications and announcements continue in the notices
                        menu.
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>School fees balance</p>
                    <p className={styles.managementValue}>
                        {formatCurrency(child.fees_balance ?? 0)}
                    </p>
                    <p className={styles.metricMeta}>
                        {Number(child.fees_balance ?? 0) > 0
                            ? 'Outstanding balance recorded by finance.'
                            : 'No outstanding school fees recorded.'}
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Books payment</p>
                    <p className={styles.managementValue}>
                        {formatPaidStatus(Boolean(child.books_paid))}
                    </p>
                    <p className={styles.metricMeta}>
                        Status recorded by the finance office.
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Uniform payment</p>
                    <p className={styles.managementValue}>
                        {formatPaidStatus(Boolean(child.uniform_paid))}
                    </p>
                    <p className={styles.metricMeta}>
                        Status recorded by the finance office.
                    </p>
                </div>

                <div className={styles.managementCard}>
                    <p className={styles.metricLabel}>Bus fare payment</p>
                    <p className={styles.managementValue}>
                        {formatPaidStatus(Boolean(child.bus_fare_paid))}
                    </p>
                    <p className={styles.metricMeta}>
                        Status recorded by the finance office.
                    </p>
                </div>
            </section>

            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>
                                Learner Profile
                            </p>
                            <h2 className={styles.panelTitle}>
                                Basic information
                            </h2>
                        </div>
                        <span className={styles.groupBadge}>
                            {child.class_name}
                        </span>
                    </div>

                    <div className={styles.bioDataGrid}>
                        {[
                            ['Student code', child.student_code ?? 'N/A'],
                            ['Age', child.age ?? 'N/A'],
                            ['Sex', child.sex ?? 'N/A'],
                            ['Birth date', child.date_of_birth ?? 'N/A'],
                            [
                                'Guardian name',
                                child.guardian_name ?? user?.name ?? 'N/A',
                            ],
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
                            Review the full history below as more teacher
                            updates are submitted.
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
                                        Older notifications will also appear in
                                        the notifications menu once they are
                                        sent.
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
                        <p className={styles.panelEyebrow}>
                            Performance History
                        </p>
                        <h2 className={styles.panelTitle}>
                            Teacher grades and comments
                        </h2>
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    {performanceRecords.length > 0 ? (
                        <>
                            <GradeScaleLegend bands={child?.grade_bands} />
                            <div className={styles.historyToolbar}>
                                <span className={styles.historyToolbarMeta}>
                                    {performanceRecords.length} graded record
                                    {performanceRecords.length === 1 ? '' : 's'}
                                </span>
                                <div
                                    className={
                                        styles.historyToolbarActions
                                    }>
                                    <button
                                        type="button"
                                        className={styles.historyToolbarButton}
                                        onClick={expandAllHistory}>
                                        Expand all
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.historyToolbarButton}
                                        onClick={collapseAllHistory}>
                                        Collapse all
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : null}
                    <table className={styles.compactTable}>
                        <thead>
                            <tr>
                                <th>Assessment period</th>
                                <th>Teacher</th>
                                <th>Position</th>
                                <th>Average</th>
                                <th>Subjects and grades</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performanceRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        No grades or teacher comments have been
                                        uploaded yet.
                                    </td>
                                </tr>
                            ) : (
                                gradeHistory.map(classGroup => {
                                    const classIsCollapsed =
                                        collapsedClasses.has(classGroup.key)

                                    return (
                                        <Fragment key={classGroup.key}>
                                            <tr
                                                className={
                                                    styles.classGroupRow
                                                }>
                                                <td colSpan={6}>
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.classGroupToggle
                                                        }
                                                        onClick={() =>
                                                            toggleClassGroup(
                                                                classGroup.key,
                                                            )
                                                        }
                                                        aria-expanded={
                                                            !classIsCollapsed
                                                        }>
                                                        <ChevronIcon
                                                            open={
                                                                !classIsCollapsed
                                                            }
                                                        />
                                                        <span
                                                            className={
                                                                styles.classGroupName
                                                            }>
                                                            {classGroup.label}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.classGroupMeta
                                                            }>
                                                            {
                                                                classGroup.terms.length
                                                            }{' '}
                                                            term
                                                            {classGroup.terms
                                                                .length === 1
                                                                ? ''
                                                                : 's'}
                                                            {` · ${classGroup.terms.reduce(
                                                                (sum, term) =>
                                                                    sum +
                                                                    term.records
                                                                        .length,
                                                                0,
                                                            )} record${
                                                                classGroup.terms.reduce(
                                                                    (sum, term) =>
                                                                        sum +
                                                                        term
                                                                            .records
                                                                            .length,
                                                                    0,
                                                                ) === 1
                                                                    ? ''
                                                                    : 's'
                                                            }`}
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>

                                            {!classIsCollapsed
                                                ? classGroup.terms.map(
                                                      termGroup => {
                                                          const termIsCollapsed =
                                                              collapsedTerms.has(
                                                                  `${classGroup.key}:${termGroup.key}`,
                                                              )

                                                          return (
                                                              <Fragment
                                                                  key={
                                                                      termGroup.key
                                                                  }>
                                                                  <tr
                                                                      className={
                                                                          styles.termGroupRow
                                                                      }>
                                                                      <td
                                                                          colSpan={
                                                                              6
                                                                          }>
                                                                          <button
                                                                              type="button"
                                                                              className={
                                                                                  styles.termGroupToggle
                                                                              }
                                                                              onClick={() =>
                                                                                  toggleTermGroup(
                                                                                      `${classGroup.key}:${termGroup.key}`,
                                                                                  )
                                                                              }
                                                                              aria-expanded={
                                                                                  !termIsCollapsed
                                                                              }>
                                                                              <ChevronIcon
                                                                                  open={
                                                                                      !termIsCollapsed
                                                                                  }
                                                                              />
                                                                              <span
                                                                                  className={
                                                                                      styles.termGroupName
                                                                                  }>
                                                                                  {
                                                                                      termGroup.label
                                                                                  }
                                                                              </span>
                                                                              <span
                                                                                  className={
                                                                                      styles.termGroupMeta
                                                                                  }>
                                                                                  {
                                                                                      termGroup.records.length
                                                                                  }{' '}
                                                                                  record
                                                                                  {termGroup.records
                                                                                      .length ===
                                                                                  1
                                                                                      ? ''
                                                                                      : 's'}
                                                                              </span>
                                                                          </button>
                                                                      </td>
                                                                  </tr>

                                                                  {!termIsCollapsed
                                                                      ? termGroup.records.map(
                                                                            record => (
                                                                                <tr
                                                                                    key={
                                                                                        record.id
                                                                                    }>
                                                                                    <td>
                                                                                        {record.assessment_period_name ||
                                                                                            'General'}
                                                                                    </td>
                                                                                    <td>
                                                                                        {
                                                                                            record.teacher_name
                                                                                        }
                                                                                    </td>
                                                                                    <td>
                                                                                        {record.class_position !=
                                                                                        null
                                                                                            ? `${record.class_position}${
                                                                                                  record.total_class_students !=
                                                                                                  null
                                                                                                      ? ` of ${record.total_class_students}`
                                                                                                      : ''
                                                                                              }`
                                                                                            : '—'}
                                                                                    </td>
                                                                                    <td>
                                                                                        {record.average_score !=
                                                                                        null ? (
                                                                                            <span
                                                                                                className={
                                                                                                    styles.averageWithBadge
                                                                                                }>
                                                                                                {
                                                                                                    record.average_score
                                                                                                }
                                                                                                %
                                                                                                <GradeLetterBadge
                                                                                                    grade={`${record.average_score}%`}
                                                                                                    bands={
                                                                                                        child
                                                                                                            ?.grade_bands
                                                                                                    }
                                                                                                />
                                                                                            </span>
                                                                                        ) : (
                                                                                            '—'
                                                                                        )}
                                                                                    </td>
                                                                                    <td>
                                                                                        {renderSubjectGrades(
                                                                                            record,
                                                                                            child
                                                                                                ?.grade_bands,
                                                                                        )}
                                                                                    </td>
                                                                                    <td>
                                                                                        {record.comment ||
                                                                                            'No comment added.'}
                                                                                    </td>
                                                                                </tr>
                                                                            ),
                                                                        )
                                                                      : null}
                                                              </Fragment>
                                                          )
                                                      },
                                                  )
                                                : null}
                                        </Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

export default GuardianDashboard
