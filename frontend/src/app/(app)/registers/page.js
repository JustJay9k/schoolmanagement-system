'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import registerStyles from './registers.module.css'
import axios from '@/lib/axios'
import { useAuth } from '@/hooks/auth'
import { useToast } from '@/components/ToastProvider'
import {
    canManageManagementWorkspace,
    formatRoleLabel,
    isTeacherUser,
} from '@/lib/userAccess'

const attendanceOptions = ['P', 'L', 'S', 'A', 'E']
const attendanceLabels = {
    P: 'Present',
    L: 'Late',
    S: 'Sick',
    A: 'Absent',
    E: 'Excused',
}

const createEmptyTrackSchedule = labelPrefix => [
    {
        label: `${labelPrefix} 1`,
        registration_enabled: true,
        start_time: '',
        end_time: '',
    },
]

const replaceReport = (reports, nextReport) =>
    reports.map(report => (report.id === nextReport.id ? nextReport : report))

const formatReportDate = value => {
    if (!value) {
        return 'Today'
    }

    const parsed = new Date(`${value}T00:00:00`)

    if (Number.isNaN(parsed.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(parsed)
}

const formatPeriodWindow = period => {
    const start = period?.start_time ?? ''
    const end = period?.end_time ?? ''

    return start && end ? `${start} - ${end}` : 'Time not set'
}

const buildReportSummary = entries => {
    const counts = { P: 0, L: 0, S: 0, A: 0, E: 0 }

    ;(entries ?? []).forEach(entry => {
        if (Object.hasOwn(counts, entry.status)) {
            counts[entry.status] += 1
        }
    })

    return {
        total_students: (entries ?? []).length,
        counts,
    }
}

const getStatusCount = (summary, status) => summary?.counts?.[status] ?? 0

export default function RegistersPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const { showToast } = useToast()
    const searchParams = useSearchParams()
    const [scheduleByTrack, setScheduleByTrack] = useState(null)
    const [defaultScheduleByTrack, setDefaultScheduleByTrack] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useState(null)
    const [teacherReports, setTeacherReports] = useState([])
    const [teacherReportsLoading, setTeacherReportsLoading] = useState(true)
    const [teacherReportsError, setTeacherReportsError] = useState(null)
    const [selectedTeacherReportId, setSelectedTeacherReportId] = useState(null)
    const [reportSaving, setReportSaving] = useState(false)
    const [reportSubmitting, setReportSubmitting] = useState(false)
    const [managementReports, setManagementReports] = useState([])
    const [managementTeachers, setManagementTeachers] = useState([])
    const [managementReportsLoading, setManagementReportsLoading] = useState(true)
    const [managementReportsError, setManagementReportsError] = useState(null)
    const [selectedManagementReportId, setSelectedManagementReportId] = useState(null)

    const managementMode = canManageManagementWorkspace(user)
    const teacherMode = isTeacherUser(user)
    const requestedReportId = Number(searchParams.get('report') ?? 0) || null

    const loadSchedule = async () => {
        if (!managementMode) {
            setLoading(false)
            return
        }

        setLoading(true)

        try {
            const response = await axios.get('/api/management/register-schedule')

            setScheduleByTrack(response.data?.scheduleByTrack ?? null)
            setDefaultScheduleByTrack(response.data?.defaultScheduleByTrack ?? null)
            setLoadError(null)
        } catch (error) {
            setLoadError(
                error?.response?.data?.message ??
                    'Unable to load register settings right now.',
            )
        } finally {
            setLoading(false)
        }
    }

    const loadTeacherReports = async () => {
        if (!teacherMode) {
            setTeacherReportsLoading(false)
            return
        }

        setTeacherReportsLoading(true)

        try {
            const response = await axios.get('/api/teacher/register-reports')
            const reports = response.data?.reports ?? []

            setTeacherReports(reports)
            setTeacherReportsError(null)
            setSelectedTeacherReportId(current => {
                if (requestedReportId && reports.some(report => report.id === requestedReportId)) {
                    return requestedReportId
                }

                if (current && reports.some(report => report.id === current)) {
                    return current
                }

                return reports[0]?.id ?? null
            })
        } catch (error) {
            setTeacherReportsError(
                error?.response?.data?.message ??
                    'Unable to load your register reports right now.',
            )
        } finally {
            setTeacherReportsLoading(false)
        }
    }

    const loadManagementReports = async () => {
        if (!managementMode) {
            setManagementReportsLoading(false)
            return
        }

        setManagementReportsLoading(true)

        try {
            const response = await axios.get('/api/management/register-reports')
            const reports = response.data?.reports ?? []

            setManagementReports(reports)
            setManagementTeachers(response.data?.teachers ?? [])
            setManagementReportsError(null)
            setSelectedManagementReportId(current => {
                if (current && reports.some(report => report.id === current)) {
                    return current
                }

                return reports[0]?.id ?? null
            })
        } catch (error) {
            setManagementReportsError(
                error?.response?.data?.message ??
                    'Unable to load school register reports right now.',
            )
        } finally {
            setManagementReportsLoading(false)
        }
    }

    useEffect(() => {
        if (!user) {
            return
        }

        loadSchedule()
        loadTeacherReports()
        loadManagementReports()
    }, [managementMode, teacherMode, user])

    useEffect(() => {
        if (!requestedReportId || !teacherReports.some(report => report.id === requestedReportId)) {
            return
        }

        setSelectedTeacherReportId(requestedReportId)
    }, [requestedReportId, teacherReports])

    const updatePeriod = (track, index, field, value) => {
        setScheduleByTrack(current => ({
            ...current,
            [track]: (current?.[track] ?? []).map((period, periodIndex) =>
                periodIndex === index ? { ...period, [field]: value } : period,
            ),
        }))
    }

    const addPeriod = track => {
        setScheduleByTrack(current => ({
            ...current,
            [track]: [
                ...(current?.[track] ?? []),
                {
                    label: track === 'primary' ? 'Block period' : 'Period',
                    registration_enabled: false,
                    start_time: '',
                    end_time: '',
                },
            ],
        }))
    }

    const removePeriod = (track, index) => {
        setScheduleByTrack(current => {
            const periods = current?.[track] ?? []

            return {
                ...current,
                [track]:
                    periods.length === 1
                        ? periods
                        : periods.filter((_, periodIndex) => periodIndex !== index),
            }
        })
    }

    const resetToDefault = () => {
        setScheduleByTrack(
            defaultScheduleByTrack ?? {
                primary: createEmptyTrackSchedule('Primary period'),
                secondary: createEmptyTrackSchedule('Secondary period'),
            },
        )
    }

    const saveSchedule = async () => {
        setSaving(true)

        try {
            const response = await axios.put('/api/management/register-schedule', {
                schedule_by_track: scheduleByTrack,
            })

            setScheduleByTrack(response.data?.scheduleByTrack ?? scheduleByTrack)
            setLoadError(null)
            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Register schedule updated successfully.',
            })
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.errors?.schedule_by_track?.[0] ??
                    error?.response?.data?.message ??
                    'Unable to update the register schedule.',
            })
        } finally {
            setSaving(false)
        }
    }

    const updateTeacherReportEntry = (studentId, field, value) => {
        setTeacherReports(current =>
            current.map(report =>
                report.id !== selectedTeacherReportId
                    ? report
                    : (() => {
                          const entries = (report.entries ?? []).map(entry =>
                              entry.student_id === studentId
                                  ? { ...entry, [field]: value }
                                  : entry,
                          )

                          return {
                              ...report,
                              entries,
                              summary: buildReportSummary(entries),
                          }
                      })(),
            ),
        )
    }

    const saveTeacherReport = async () => {
        const report = teacherReports.find(item => item.id === selectedTeacherReportId)

        if (!report || report.status === 'submitted') {
            return
        }

        setReportSaving(true)

        try {
            const response = await axios.put(`/api/teacher/register-reports/${report.id}`, {
                school_track: report.school_track,
                class_name: report.class_name,
                periods: report.periods ?? [],
                entries: (report.entries ?? []).map(entry => ({
                    student_id: entry.student_id,
                    status: entry.status,
                    note: entry.note ?? '',
                })),
            })

            const nextReport = response.data?.report ?? report

            setTeacherReports(current => replaceReport(current, nextReport))
            showToast({
                type: 'success',
                message:
                    response.data?.message ?? 'Register draft updated successfully.',
            })
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to update the register draft right now.',
            })
        } finally {
            setReportSaving(false)
        }
    }

    const submitTeacherReport = async () => {
        const report = teacherReports.find(item => item.id === selectedTeacherReportId)

        if (!report || report.status === 'submitted') {
            return
        }

        setReportSubmitting(true)

        try {
            const response = await axios.post(
                `/api/teacher/register-reports/${report.id}/submit`,
            )

            const nextReport = response.data?.report ?? report

            setTeacherReports(current => replaceReport(current, nextReport))
            showToast({
                type: 'success',
                message:
                    response.data?.message ??
                    'Register sent to the head teacher successfully.',
            })
        } catch (error) {
            showToast({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to send this register to the head teacher right now.',
            })
        } finally {
            setReportSubmitting(false)
        }
    }

    const summaryCards = useMemo(() => {
        const primaryPeriods = scheduleByTrack?.primary ?? []
        const secondaryPeriods = scheduleByTrack?.secondary ?? []

        return [
            ['Primary periods', primaryPeriods.length],
            [
                'Primary register windows',
                primaryPeriods.filter(period => period.registration_enabled).length,
            ],
            ['Secondary periods', secondaryPeriods.length],
            [
                'Secondary register windows',
                secondaryPeriods.filter(period => period.registration_enabled).length,
            ],
        ]
    }, [scheduleByTrack])

    const selectedTeacherReport =
        teacherReports.find(report => report.id === selectedTeacherReportId) ?? null
    const selectedManagementReport =
        managementReports.find(report => report.id === selectedManagementReportId) ?? null

    if (!user) {
        return null
    }

    return (
        <WorkspacePageShell
            eyebrow="Register Centre"
            title="Attendance register workflows"
            description={
                managementMode
                    ? 'Head teachers can control daily registration periods and review submitted teacher reports from their own school only.'
                    : teacherMode
                      ? 'Save attendance as a draft from the dashboard, review it here, then send it to the head teacher when it is ready.'
                      : 'Open the live teacher register, review attendance reporting, and manage register-related work without relying on demo dashboard data.'
            }
            actions={
                <>
                    <Link href="/dashboard" className={workspaceStyles.button}>
                        Open live register
                    </Link>
                    <Link
                        href="/attendance-reports"
                        className={workspaceStyles.secondaryButton}>
                        View reports
                    </Link>
                </>
            }>
            {managementMode ? (
                <section className={registerStyles.stack}>
                    {loadError ? (
                        <article className={workspaceStyles.fullPanel}>
                            <p
                                className={`${managementStyles.notice} ${managementStyles.dangerText}`}>
                                {loadError}
                            </p>
                        </article>
                    ) : null}

                    <section className={managementStyles.statsGrid}>
                        {summaryCards.map(([label, value]) => (
                            <article key={label} className={workspaceStyles.statCard}>
                                <p className={workspaceStyles.statLabel}>{label}</p>
                                <p className={workspaceStyles.statValue}>{value}</p>
                            </article>
                        ))}
                    </section>

                    <section className={workspaceStyles.panelGrid}>
                        <article className={workspaceStyles.fullPanel}>
                            <div className={workspaceStyles.panelHeader}>
                                <div>
                                    <p className={workspaceStyles.panelEyebrow}>
                                        School Inbox
                                    </p>
                                    <h2 className={workspaceStyles.panelTitle}>
                                        Teacher register reports
                                    </h2>
                                </div>
                                <span className={workspaceStyles.badge}>
                                    {managementTeachers.length} teachers
                                </span>
                            </div>

                            {managementReportsError ? (
                                <p
                                    className={`${managementStyles.notice} ${managementStyles.dangerText}`}>
                                    {managementReportsError}
                                </p>
                            ) : managementReportsLoading ? (
                                <p className={managementStyles.muted}>
                                    Loading school register reports...
                                </p>
                            ) : managementReports.length === 0 ? (
                                <p className={managementStyles.muted}>
                                    No register reports have been submitted or saved in this school yet.
                                </p>
                            ) : (
                                <div className={registerStyles.reportLayout}>
                                    <div className={registerStyles.reportList}>
                                        {managementReports.map(report => (
                                            <button
                                                key={report.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedManagementReportId(report.id)
                                                }
                                                className={`${registerStyles.reportListButton} ${
                                                    selectedManagementReportId === report.id
                                                        ? registerStyles.reportListButtonActive
                                                        : ''
                                                }`}>
                                                <div className={registerStyles.reportListTop}>
                                                    <strong>{report.teacher_name}</strong>
                                                    <span className={workspaceStyles.badge}>
                                                        {report.status}
                                                    </span>
                                                </div>
                                                <p>
                                                    {report.class_name} •{' '}
                                                    {report.school_track}
                                                </p>
                                                <small>
                                                    {formatReportDate(report.report_date)}
                                                </small>
                                            </button>
                                        ))}
                                    </div>

                                    {selectedManagementReport ? (
                                        <div className={registerStyles.reportDetail}>
                                            <div className={registerStyles.reportSummaryGrid}>
                                                {attendanceOptions.map(option => (
                                                    <div
                                                        key={option}
                                                        className={registerStyles.reportSummaryCard}>
                                                        <span>{attendanceLabels[option]}</span>
                                                        <strong>
                                                            {getStatusCount(
                                                                selectedManagementReport.summary,
                                                                option,
                                                            )}
                                                        </strong>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className={workspaceStyles.list}>
                                                <div className={workspaceStyles.listItem}>
                                                    <div>
                                                        <strong>Teacher</strong>
                                                        <p>{selectedManagementReport.teacher_name}</p>
                                                    </div>
                                                </div>
                                                <div className={workspaceStyles.listItem}>
                                                    <div>
                                                        <strong>Class</strong>
                                                        <p>
                                                            {selectedManagementReport.class_name} •{' '}
                                                            {selectedManagementReport.school_track}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={workspaceStyles.listItem}>
                                                    <div>
                                                        <strong>Submitted</strong>
                                                        <p>
                                                            {selectedManagementReport.submitted_at
                                                                ? new Date(
                                                                      selectedManagementReport.submitted_at,
                                                                  ).toLocaleString()
                                                                : 'Draft only'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={registerStyles.periodPills}>
                                                {(selectedManagementReport.periods ?? []).map(
                                                    (period, index) => (
                                                        <div
                                                            key={`${period.label}-${index}`}
                                                            className={registerStyles.periodPill}>
                                                            <strong>{period.label}</strong>
                                                            <small>
                                                                {formatPeriodWindow(period)}
                                                            </small>
                                                        </div>
                                                    ),
                                                )}
                                            </div>

                                            <div className={registerStyles.entriesTableWrap}>
                                                <table className={workspaceStyles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>Learner</th>
                                                            <th>Code</th>
                                                            <th>Status</th>
                                                            <th>Note</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(selectedManagementReport.entries ?? []).map(
                                                            entry => (
                                                                <tr key={entry.student_id}>
                                                                    <td>{entry.student_name}</td>
                                                                    <td>
                                                                        {entry.student_code ||
                                                                            'N/A'}
                                                                    </td>
                                                                    <td>
                                                                        {
                                                                            attendanceLabels[
                                                                                entry.status
                                                                            ]
                                                                        }
                                                                    </td>
                                                                    <td>
                                                                        {entry.note?.trim() ||
                                                                            'No note'}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </article>

                        <article className={workspaceStyles.fullPanel}>
                            <div className={workspaceStyles.panelHeader}>
                                <div>
                                    <p className={workspaceStyles.panelEyebrow}>
                                        Management
                                    </p>
                                    <h2 className={workspaceStyles.panelTitle}>
                                        Daily registration schedule
                                    </h2>
                                </div>
                            </div>

                            {loading || !scheduleByTrack ? (
                                <p className={managementStyles.muted}>
                                    Loading register configuration...
                                </p>
                            ) : (
                                <div className={registerStyles.trackGrid}>
                                    {[
                                        ['primary', 'Primary section'],
                                        ['secondary', 'Secondary section'],
                                    ].map(([track, label]) => (
                                        <article
                                            key={track}
                                            className={registerStyles.trackPanel}>
                                            <div className={registerStyles.trackHeader}>
                                                <div>
                                                    <p className={workspaceStyles.panelEyebrow}>
                                                        {label}
                                                    </p>
                                                    <h3 className={registerStyles.trackTitle}>
                                                        {label} periods
                                                    </h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addPeriod(track)}
                                                    className={
                                                        managementStyles.secondaryButton
                                                    }>
                                                    Add period
                                                </button>
                                            </div>

                                            <div className={registerStyles.periodGrid}>
                                                {(scheduleByTrack?.[track] ?? []).map(
                                                    (period, index) => (
                                                        <div
                                                            key={`${track}-${index}`}
                                                            className={
                                                                registerStyles.periodCard
                                                            }>
                                                            <div
                                                                className={
                                                                    registerStyles.periodCardHeader
                                                                }>
                                                                <span
                                                                    className={
                                                                        workspaceStyles.badge
                                                                    }>
                                                                    Period {index + 1}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removePeriod(track, index)
                                                                    }
                                                                    disabled={
                                                                        (scheduleByTrack?.[
                                                                            track
                                                                        ] ?? []).length === 1
                                                                    }
                                                                    className={
                                                                        managementStyles.dangerButton
                                                                    }>
                                                                    Remove
                                                                </button>
                                                            </div>

                                                            <label
                                                                className={managementStyles.field}>
                                                                <span
                                                                    className={
                                                                        managementStyles.fieldLabel
                                                                    }>
                                                                    Period label
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    value={period.label}
                                                                    onChange={event =>
                                                                        updatePeriod(
                                                                            track,
                                                                            index,
                                                                            'label',
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    className={
                                                                        registerStyles.periodInput
                                                                    }
                                                                />
                                                            </label>

                                                            <div
                                                                className={
                                                                    registerStyles.timeGrid
                                                                }>
                                                                <label
                                                                    className={
                                                                        managementStyles.field
                                                                    }>
                                                                    <span
                                                                        className={
                                                                            managementStyles.fieldLabel
                                                                        }>
                                                                        Start time
                                                                    </span>
                                                                    <input
                                                                        type="time"
                                                                        value={
                                                                            period.start_time ??
                                                                            ''
                                                                        }
                                                                        onChange={event =>
                                                                            updatePeriod(
                                                                                track,
                                                                                index,
                                                                                'start_time',
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        className={
                                                                            registerStyles.periodInput
                                                                        }
                                                                    />
                                                                </label>

                                                                <label
                                                                    className={
                                                                        managementStyles.field
                                                                    }>
                                                                    <span
                                                                        className={
                                                                            managementStyles.fieldLabel
                                                                        }>
                                                                        End time
                                                                    </span>
                                                                    <input
                                                                        type="time"
                                                                        value={
                                                                            period.end_time ??
                                                                            ''
                                                                        }
                                                                        onChange={event =>
                                                                            updatePeriod(
                                                                                track,
                                                                                index,
                                                                                'end_time',
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        className={
                                                                            registerStyles.periodInput
                                                                        }
                                                                    />
                                                                </label>
                                                            </div>

                                                            <label
                                                                className={
                                                                    registerStyles.toggleRow
                                                                }>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={Boolean(
                                                                        period.registration_enabled,
                                                                    )}
                                                                    onChange={event =>
                                                                        updatePeriod(
                                                                            track,
                                                                            index,
                                                                            'registration_enabled',
                                                                            event.target.checked,
                                                                        )
                                                                    }
                                                                    className={
                                                                        registerStyles.toggleInput
                                                                    }
                                                                />
                                                                <span>
                                                                    <strong>
                                                                        Use this period
                                                                        for attendance
                                                                        registration
                                                                    </strong>
                                                                    <small>
                                                                        Enabled
                                                                        periods
                                                                        appear as
                                                                        register
                                                                        columns on
                                                                        teacher
                                                                        dashboards.
                                                                    </small>
                                                                </span>
                                                            </label>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}

                            <div className={managementStyles.actions}>
                                <button
                                    type="button"
                                    onClick={saveSchedule}
                                    disabled={loading || saving || !scheduleByTrack}
                                    className={workspaceStyles.button}>
                                    {saving ? 'Saving...' : 'Save register schedule'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetToDefault}
                                    disabled={loading || saving || !defaultScheduleByTrack}
                                    className={managementStyles.secondaryButton}>
                                    Reset to defaults
                                </button>
                                <button
                                    type="button"
                                    onClick={loadSchedule}
                                    disabled={loading || saving}
                                    className={managementStyles.secondaryButton}>
                                    Refresh
                                </button>
                            </div>
                        </article>
                    </section>
                </section>
            ) : teacherMode ? (
                <section className={workspaceStyles.panelGrid}>
                    <article className={workspaceStyles.fullPanel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Teacher Review
                                </p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    Your register drafts and submissions
                                </h2>
                            </div>
                        </div>

                        {teacherReportsError ? (
                            <p
                                className={`${managementStyles.notice} ${managementStyles.dangerText}`}>
                                {teacherReportsError}
                            </p>
                        ) : teacherReportsLoading ? (
                            <p className={managementStyles.muted}>
                                Loading your register reports...
                            </p>
                        ) : teacherReports.length === 0 ? (
                            <div className={workspaceStyles.list}>
                                <div className={workspaceStyles.listItem}>
                                    <div>
                                        <strong>No register draft yet</strong>
                                        <p>
                                            Use the dashboard to mark attendance and click
                                            `Submit Register` to save a review draft here.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={registerStyles.reportLayout}>
                                <div className={registerStyles.reportList}>
                                    {teacherReports.map(report => (
                                        <button
                                            key={report.id}
                                            type="button"
                                            onClick={() => setSelectedTeacherReportId(report.id)}
                                            className={`${registerStyles.reportListButton} ${
                                                selectedTeacherReportId === report.id
                                                    ? registerStyles.reportListButtonActive
                                                    : ''
                                            }`}>
                                            <div className={registerStyles.reportListTop}>
                                                <strong>{report.class_name}</strong>
                                                <span className={workspaceStyles.badge}>
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p>{formatReportDate(report.report_date)}</p>
                                            <small>{report.school_track}</small>
                                        </button>
                                    ))}
                                </div>

                                {selectedTeacherReport ? (
                                    <div className={registerStyles.reportDetail}>
                                        <div className={workspaceStyles.panelHeader}>
                                            <div>
                                                <p className={workspaceStyles.panelEyebrow}>
                                                    Report Detail
                                                </p>
                                                <h3 className={registerStyles.trackTitle}>
                                                    {selectedTeacherReport.class_name} •{' '}
                                                    {formatReportDate(
                                                        selectedTeacherReport.report_date,
                                                    )}
                                                </h3>
                                            </div>
                                            <span className={workspaceStyles.badge}>
                                                {selectedTeacherReport.status === 'submitted'
                                                    ? 'Locked'
                                                    : 'Editable'}
                                            </span>
                                        </div>

                                        <div className={registerStyles.reportSummaryGrid}>
                                            {attendanceOptions.map(option => (
                                                <div
                                                    key={option}
                                                    className={registerStyles.reportSummaryCard}>
                                                    <span>{attendanceLabels[option]}</span>
                                                    <strong>
                                                        {getStatusCount(
                                                            selectedTeacherReport.summary,
                                                            option,
                                                        )}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>

                                        <div className={registerStyles.periodPills}>
                                            {(selectedTeacherReport.periods ?? []).map(
                                                (period, index) => (
                                                    <div
                                                        key={`${period.label}-${index}`}
                                                        className={registerStyles.periodPill}>
                                                        <strong>{period.label}</strong>
                                                        <small>{formatPeriodWindow(period)}</small>
                                                    </div>
                                                ),
                                            )}
                                        </div>

                                        <div className={registerStyles.entriesTableWrap}>
                                            <table className={workspaceStyles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>Learner</th>
                                                        <th>Code</th>
                                                        <th>Status</th>
                                                        <th>Note</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(selectedTeacherReport.entries ?? []).map(
                                                        entry => (
                                                            <tr key={entry.student_id}>
                                                                <td>{entry.student_name}</td>
                                                                <td>
                                                                    {entry.student_code || 'N/A'}
                                                                </td>
                                                                <td>
                                                                    <div
                                                                        className={
                                                                            registerStyles.statusButtonRow
                                                                        }>
                                                                        {attendanceOptions.map(
                                                                            option => (
                                                                                <button
                                                                                    key={option}
                                                                                    type="button"
                                                                                    disabled={
                                                                                        selectedTeacherReport.status ===
                                                                                            'submitted' ||
                                                                                        reportSaving ||
                                                                                        reportSubmitting
                                                                                    }
                                                                                    onClick={() =>
                                                                                        updateTeacherReportEntry(
                                                                                            entry.student_id,
                                                                                            'status',
                                                                                            option,
                                                                                        )
                                                                                    }
                                                                                    className={`${registerStyles.statusButton} ${
                                                                                        entry.status ===
                                                                                        option
                                                                                            ? registerStyles.statusButtonActive
                                                                                            : ''
                                                                                    }`}>
                                                                                    {option}
                                                                                </button>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="text"
                                                                        value={entry.note ?? ''}
                                                                        onChange={event =>
                                                                            updateTeacherReportEntry(
                                                                                entry.student_id,
                                                                                'note',
                                                                                event.target.value,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            selectedTeacherReport.status ===
                                                                                'submitted' ||
                                                                            reportSaving ||
                                                                            reportSubmitting
                                                                        }
                                                                        className={
                                                                            registerStyles.periodInput
                                                                        }
                                                                        placeholder="Add note"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className={managementStyles.actions}>
                                            <button
                                                type="button"
                                                onClick={saveTeacherReport}
                                                disabled={
                                                    selectedTeacherReport.status === 'submitted' ||
                                                    reportSaving ||
                                                    reportSubmitting
                                                }
                                                className={workspaceStyles.button}>
                                                {reportSaving
                                                    ? 'Saving...'
                                                    : 'Save draft changes'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitTeacherReport}
                                                disabled={
                                                    selectedTeacherReport.status === 'submitted' ||
                                                    reportSaving ||
                                                    reportSubmitting
                                                }
                                                className={managementStyles.secondaryButton}>
                                                {reportSubmitting
                                                    ? 'Sending...'
                                                    : 'Send to head teacher'}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </article>
                </section>
            ) : (
                <section className={workspaceStyles.panelGrid}>
                    <article className={workspaceStyles.panel}>
                        <div className={workspaceStyles.panelHeader}>
                            <div>
                                <p className={workspaceStyles.panelEyebrow}>
                                    Register Access
                                </p>
                                <h2 className={workspaceStyles.panelTitle}>
                                    This workspace is role-limited
                                </h2>
                            </div>
                        </div>

                        <div className={workspaceStyles.list}>
                            <div className={workspaceStyles.listItem}>
                                <div>
                                    <strong>Current account</strong>
                                    <p>
                                        This account is signed in as{' '}
                                        {formatRoleLabel(user?.role)}. Register report
                                        review is available to teacher and head teacher
                                        accounts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>
            )}
        </WorkspacePageShell>
    )
}
