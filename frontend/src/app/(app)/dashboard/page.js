'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import GuardianDashboard from './GuardianDashboard'
import styles from './dashboard.module.css'

const statusMeta = {
    P: {
        label: 'Present',
        short: 'P',
        chipClass: styles.present,
        softClass: styles.presentSoft,
    },
    L: {
        label: 'Late',
        short: 'L',
        chipClass: styles.late,
        softClass: styles.lateSoft,
    },
    S: {
        label: 'Sick',
        short: 'S',
        chipClass: styles.sick,
        softClass: styles.sickSoft,
    },
    A: {
        label: 'Absent',
        short: 'A',
        chipClass: styles.absent,
        softClass: styles.absentSoft,
    },
    E: {
        label: 'Excused',
        short: 'E',
        chipClass: styles.excused,
        softClass: styles.excusedSoft,
    },
}

const attendanceOptions = ['P', 'L', 'S', 'A', 'E']
const trackLabels = {
    primary: 'Primary',
    secondary: 'Secondary',
}

const roleLabels = {
    admin: 'Administrator',
    management: 'Head Teacher / Management',
    staff: 'Operations Staff',
    teacher: 'Teacher',
    accountant: 'Accountant',
    student: 'Student',
    guardian: 'Guardian',
}

const createAssignedFixtureFallback = (track, className) => ({
    id: `${track}-${className}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    className,
    tutorGroup: className,
    teacherLabel: 'Assigned teacher',
    submissionLabel: 'No register template has been loaded for this class yet.',
    upcomingLabel: 'Timetable and learner data will appear here when available.',
    timetable: [],
    students: [],
})

const sessionColumns = {
    primary: [
        { label: 'AM' },
        { label: 'PM' },
        { label: 'Block 1', sub: 'Literacy' },
        { label: 'Block 2', sub: 'Maths' },
        { label: 'Block 3', sub: 'Health' },
        { label: 'Block 4', sub: 'Games' },
    ],
    secondary: [
        { label: 'AM' },
        { label: 'PM' },
        { label: 'Period 1', sub: '09:00-10:00' },
        { label: 'Period 2', sub: '10:00-11:00' },
        { label: 'Period 3', sub: '11:15-12:15' },
        { label: 'Period 4', sub: '13:15-14:15' },
    ],
}

const normalizeRole = role => {
    if (typeof role === 'string') {
        return role.toLowerCase()
    }

    if (role && typeof role === 'object') {
        if (typeof role.value === 'string') {
            return role.value.toLowerCase()
        }

        if (typeof role.name === 'string') {
            return role.name.toLowerCase()
        }
    }

    return 'staff'
}

const normalizeTrack = track => {
    if (typeof track !== 'string') {
        return null
    }

    const normalized = track.toLowerCase()

    return normalized === 'primary' || normalized === 'secondary'
        ? normalized
        : null
}

const formatRoleLabel = role => roleLabels[role] ?? 'School staff account'

const initials = name =>
    name
        .split(' ')
        .slice(0, 2)
        .map(part => part[0])
        .join('')

const formatShare = (value, total) =>
    total === 0 ? '0%' : `${Math.round((value / total) * 1000) / 10}%`

const formatBirthDate = value => {
    if (!value) {
        return 'Not recorded'
    }

    const birthDate = new Date(`${value}T00:00:00`)

    if (Number.isNaN(birthDate.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(birthDate)
}

const teacherDashboardFetcher = url => axios.get(url).then(response => response.data)

const getAgeFromBirthDate = value => {
    if (!value) {
        return 'Not recorded'
    }

    const birthDate = new Date(`${value}T00:00:00`)

    if (Number.isNaN(birthDate.getTime())) {
        return 'Not recorded'
    }

    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDifference = today.getMonth() - birthDate.getMonth()

    if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
        age -= 1
    }

    return age >= 0 ? `${age} years` : 'Not recorded'
}

const buildSessionStates = (student, track) => {
    const sessionCount = sessionColumns[track]?.length ?? 0

    if (!student.status) {
        return Array.from({ length: sessionCount }, () => null)
    }

    if (student.status === 'P') return ['P', 'P', 'P', 'P', 'P', 'P']
    if (student.status === 'A') return ['A', 'A', 'A', 'A', 'A', 'A']
    if (student.status === 'S') return ['S', 'S', 'S', 'S', 'S', 'S']
    if (student.status === 'E') return ['P', 'P', 'P', 'P', 'E', 'P']

    return track === 'secondary'
        ? ['P', 'P', 'P', 'L', 'P', 'P']
        : ['L', 'P', 'P', 'P', 'P', 'P']
}

const getCounts = students =>
    students.reduce(
        (result, student) => {
            if (statusMeta[student.status]) {
                result[student.status] += 1
            }

            return result
        },
        { P: 0, L: 0, S: 0, A: 0, E: 0 },
    )

const getAttendanceRate = counts => {
    const total = counts.P + counts.L + counts.S + counts.A + counts.E
    const attending = counts.P + counts.L + counts.E

    return total ? Math.round((attending / total) * 1000) / 10 : 0
}

const createTeacherDashboardStudent = student => ({
    id: student.id,
    name: student.full_name,
    tutorGroup: student.class_name || 'Assigned class',
    birthDate: student.date_of_birth ?? '',
    gender: student.sex ?? 'Not recorded',
    ageLabel:
        typeof student.age === 'number' && student.age >= 0
            ? `${student.age} years`
            : 'Not recorded',
    counts: {
        late: 0,
        sick: 0,
        absent: 0,
    },
    status: '',
    note: student.performance?.comment ?? '',
    studentCode: student.student_code ?? '',
    guardianName: student.guardian_name ?? '',
    disabilityName:
        typeof student.disability_name === 'string'
            ? student.disability_name.trim()
            : '',
})

const StatusCell = ({ status }) => {
    const meta = statusMeta[status]

    if (!meta) {
        return (
            <span className={`${styles.statusBadge} ${styles.statusBadgeMuted}`}>
                -
            </span>
        )
    }

    return <span className={`${styles.statusBadge} ${meta.chipClass}`}>{meta.short}</span>
}

const UserIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.userIcon}>
        <path
            d="M20 19.5c-1.7-3-4.6-4.5-8-4.5s-6.3 1.5-8 4.5M12 12.5a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const toggleSidebar = () => {
    window.dispatchEvent(new Event('pcms-toggle-sidebar'))
}

const Dashboard = () => {
    const { user } = useAuth({ middleware: 'auth' })
    const userRole = normalizeRole(user?.role)
    const userTrack = normalizeTrack(user?.school_track)
    const assignedClassName =
        typeof user?.assigned_class_name === 'string'
            ? user.assigned_class_name.trim()
            : ''
    const teacherAssignmentLabel =
        userTrack === 'secondary'
            ? assignedClassName || 'Subject teacher only'
            : assignedClassName || 'Class assignment required'
    const teacherOnlyView = userRole === 'teacher'
    const adminOnlyView = userRole === 'admin'
    const managementView = userRole === 'management'
    const financeView = userRole === 'accountant'
    const guardianView = userRole === 'guardian'
    const currentDateLabel = useMemo(
        () =>
            new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }),
        [],
    )

    const [activeTrack, setActiveTrack] = useState(userTrack ?? 'secondary')
    const [registerState, setRegisterState] = useState({})
    const [selectedStudentId, setSelectedStudentId] = useState(null)
    const [registerStatus, setRegisterStatus] = useState({
        tone: 'idle',
        message: 'Nothing submitted yet.',
    })
    const [disciplineEntry, setDisciplineEntry] = useState({
        incident: 'Late arrival',
        note: '',
    })
    const [disciplineStatus, setDisciplineStatus] = useState('Awaiting teacher action.')
    const { data: teacherDashboardData, isLoading: teacherDashboardLoading } =
        useSWR(
            teacherOnlyView && assignedClassName !== ''
                ? '/api/teacher/gradebook'
                : null,
            teacherDashboardFetcher,
        )
    const { data: dashboardNotifications } = useSWR(
        user ? '/api/notifications' : null,
        teacherDashboardFetcher,
    )
    const dashboardUnreadNotifications =
        dashboardNotifications?.summary?.unread ?? 0

    useEffect(() => {
        if (teacherOnlyView && userTrack) {
            setActiveTrack(userTrack)
        }
    }, [teacherOnlyView, userTrack])

    const resolvedAssignedClassName =
        teacherDashboardData?.scope?.locked_class_name || assignedClassName
    const teacherStudentsFromApi = useMemo(
        () =>
            (teacherDashboardData?.students ?? []).map(
                createTeacherDashboardStudent,
            ),
        [teacherDashboardData],
    )

    const assignedFixture = useMemo(() => {
        if (!teacherOnlyView || !userTrack || resolvedAssignedClassName === '') {
            return null
        }

        return createAssignedFixtureFallback(
            userTrack,
            resolvedAssignedClassName,
        )
    }, [resolvedAssignedClassName, teacherOnlyView, userTrack])

    useEffect(() => {
        if (!teacherOnlyView || !assignedFixture) {
            return
        }

        setRegisterState(current => ({
            ...current,
            [assignedFixture.id]: teacherStudentsFromApi,
        }))
    }, [assignedFixture, teacherOnlyView, teacherStudentsFromApi])

    const currentTeacherStudents = assignedFixture
        ? registerState[assignedFixture.id] ?? []
        : []

    useEffect(() => {
        setSelectedStudentId(currentTeacherStudents[0]?.id ?? null)
    }, [currentTeacherStudents])

    const activeStudent =
        currentTeacherStudents.find(student => student.id === selectedStudentId) ??
        currentTeacherStudents[0] ??
        null

    const teacherCounts = useMemo(
        () => getCounts(currentTeacherStudents),
        [currentTeacherStudents],
    )
    const activeStudentBioData = activeStudent
        ? [
              {
                  label: 'Birth date',
                  value: formatBirthDate(activeStudent.birthDate),
              },
              {
                  label: 'Gender',
                  value: activeStudent.gender ?? 'Not recorded',
              },
              {
                  label: 'Age',
                  value:
                      activeStudent.ageLabel ||
                      getAgeFromBirthDate(activeStudent.birthDate),
              },
              {
                  label: 'Disability',
                  value: activeStudent.disabilityName || 'No disability',
              },
          ]
        : []

    const summaryCards = [
        {
            status: 'P',
            value: teacherCounts.P,
            share: formatShare(teacherCounts.P, currentTeacherStudents.length),
        },
        {
            status: 'A',
            value: teacherCounts.A,
            share: formatShare(teacherCounts.A, currentTeacherStudents.length),
        },
        {
            status: 'L',
            value: teacherCounts.L,
            share: formatShare(teacherCounts.L, currentTeacherStudents.length),
        },
        {
            status: 'E',
            value: teacherCounts.E,
            share: formatShare(teacherCounts.E, currentTeacherStudents.length),
        },
        {
            status: 'S',
            value: teacherCounts.S,
            share: formatShare(teacherCounts.S, currentTeacherStudents.length),
        },
    ]

    const teacherAttendanceRate = getAttendanceRate(teacherCounts)

    const pageEyebrow = teacherOnlyView
        ? 'Assigned Class Register'
        : adminOnlyView
          ? 'System Administration'
          : financeView
            ? 'Finance Workspace'
            : guardianView
              ? 'Parent / Guardian Portal'
            : 'Management Workspace'
    const pageTitle = teacherOnlyView
        ? assignedFixture?.className ??
          (userTrack === 'secondary'
              ? 'Subject Teacher Workspace'
              : 'Class assignment required')
        : adminOnlyView
          ? 'System Control Center'
          : financeView
            ? 'Finance Desk'
            : guardianView
              ? user?.linked_student_record?.full_name ?? 'Guardian Dashboard'
            : 'Head Teacher Workspace'
    const pageRoleLabel = formatRoleLabel(userRole)
    const pageMeta = teacherOnlyView
        ? assignedFixture
            ? `${trackLabels[activeTrack]} teacher dashboard for ${assignedFixture.className}`
            : userTrack === 'secondary'
              ? 'Secondary subject teacher dashboard with no form class assigned yet.'
              : 'Teacher account needs a class assignment.'
        : adminOnlyView
          ? 'Administrator workspace for access control, school structure, and system-level oversight.'
          : financeView
            ? 'Open the finance desk and school shop from this workspace.'
            : guardianView
              ? 'View the linked learner profile, teacher comments, uploaded grades, and account notices.'
            : 'Open operational management tools without relying on demo dashboard data.'

    const updateAttendance = (studentId, status) => {
        if (!assignedFixture) {
            return
        }

        setRegisterState(current => ({
            ...current,
            [assignedFixture.id]: (current[assignedFixture.id] ?? []).map(student =>
                student.id === studentId ? { ...student, status } : student,
            ),
        }))
    }

    const updateNote = (studentId, note) => {
        if (!assignedFixture) {
            return
        }

        setRegisterState(current => ({
            ...current,
            [assignedFixture.id]: (current[assignedFixture.id] ?? []).map(student =>
                student.id === studentId ? { ...student, note } : student,
            ),
        }))
    }

    const simulateRequest = message =>
        new Promise(resolve => {
            setTimeout(() => resolve(message), 550)
        })

    const submitRegister = async () => {
        if (!assignedFixture) {
            setRegisterStatus({
                tone: 'error',
                message:
                    userTrack === 'secondary'
                        ? 'Your account does not have a form class yet, so there is no class register to submit.'
                        : 'Your account does not yet have a class assignment.',
            })
            return
        }

        if (currentTeacherStudents.length === 0) {
            setRegisterStatus({
                tone: 'error',
                message: 'Your class is already assigned, but no learner records are loaded for it yet.',
            })
            return
        }

        setRegisterStatus({
            tone: 'loading',
            message: 'Submitting register payload to the system logic engine...',
        })

        const missingStatus = currentTeacherStudents.some(student => !student.status)

        if (missingStatus) {
            setRegisterStatus({
                tone: 'error',
                message: 'Every learner must have an attendance status before submission.',
            })
            return
        }

        await simulateRequest(true)

        setRegisterStatus({
            tone: 'success',
            message:
                activeTrack === 'primary'
                    ? `${assignedFixture.className} AM register posted successfully.`
                    : `${assignedFixture.className} period register posted successfully.`,
        })
    }

    const markAllPresent = () => {
        if (!assignedFixture) {
            return
        }

        setRegisterState(current => ({
            ...current,
            [assignedFixture.id]: (current[assignedFixture.id] ?? []).map(student => ({
                ...student,
                status: 'P',
            })),
        }))

        setRegisterStatus({
            tone: 'success',
            message: 'All learners marked present. Review notes before final submission.',
        })
    }

    const exportRegister = async () => {
        setRegisterStatus({
            tone: 'loading',
            message: teacherOnlyView
                ? 'Preparing class register export package...'
                : 'Preparing school overview export package...',
        })
        await simulateRequest(true)
        setRegisterStatus({
            tone: 'success',
            message: teacherOnlyView
                ? 'Class export package prepared for review.'
                : 'Management export package prepared for review.',
        })
    }

    const submitDiscipline = async event => {
        event.preventDefault()

        if (!activeStudent || !assignedFixture) {
            setDisciplineStatus('Assign a teacher to a class before logging discipline.')
            return
        }

        if (!disciplineEntry.note.trim()) {
            setDisciplineStatus('Add an incident note before logging the case.')
            return
        }

        setDisciplineStatus('Logging conduct entry...')
        await simulateRequest(true)
        setDisciplineStatus(
            `${activeStudent.name} logged for ${disciplineEntry.incident.toLowerCase()}. Detention workflow sent to the backend queue.`,
        )
        setDisciplineEntry(current => ({ ...current, note: '' }))
    }

    const renderTeacherView = () => (
        <>
            <section className={styles.metricsRow}>
                {summaryCards.map(card => (
                    <div key={card.status} className={`${styles.metricCard} ${statusMeta[card.status].softClass}`}>
                        <div className={styles.metricIconWrap}>
                            <span className={`${styles.statusBadge} ${statusMeta[card.status].chipClass}`}>
                                {statusMeta[card.status].short}
                            </span>
                        </div>
                        <div>
                            <p className={styles.metricLabel}>{statusMeta[card.status].label}</p>
                            <p className={styles.metricValue}>{card.value}</p>
                            <p className={styles.metricMeta}>{card.share}</p>
                        </div>
                    </div>
                ))}

                <div className={styles.overallCard}>
                    <div
                        className={styles.donut}
                        style={{
                            background: `conic-gradient(var(--accent) 0 ${teacherAttendanceRate}%, var(--surface-tint) ${teacherAttendanceRate}% 100%)`,
                        }}>
                        <div className={styles.donutInner} />
                    </div>
                    <div>
                        <p className={styles.metricLabel}>Attendance</p>
                        <p className={styles.overallValue}>{teacherAttendanceRate}%</p>
                        <p className={styles.metricMeta}>Overall</p>
                    </div>
                </div>
            </section>

            <div
                className={`${styles.statusNotice} ${
                    !assignedFixture
                        ? styles.statusError
                        : registerStatus.tone === 'success'
                          ? styles.statusSuccess
                          : registerStatus.tone === 'error'
                            ? styles.statusError
                            : registerStatus.tone === 'loading'
                              ? styles.statusLoading
                              : styles.statusIdle
                }`}>
                {!assignedFixture
                    ? userTrack === 'secondary'
                        ? 'This secondary teacher account does not have a form class yet. Subject teaching can continue, and the Head Master can allocate a form class when needed.'
                        : 'This teacher account is not yet assigned to a class.'
                    : teacherDashboardLoading
                      ? 'Loading learner records from the school database...'
                    : currentTeacherStudents.length === 0
                      ? 'Your class assignment is already saved. Learner records for this class have not been loaded into the dashboard yet.'
                      : registerStatus.message}
            </div>

            <section id="register-center" className={styles.tableCard}>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Student Name</th>
                                <th>Tutor Group</th>
                                <th>Quick Status</th>
                                {sessionColumns[activeTrack].map(column => (
                                    <th key={column.label}>
                                        <div className={styles.columnHeading}>
                                            <span>{column.label}</span>
                                            {column.sub ? <small>{column.sub}</small> : null}
                                        </div>
                                    </th>
                                ))}
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTeacherStudents.map((student, index) => {
                                const sessions = buildSessionStates(student, activeTrack)
                                const isSelected = activeStudent?.id === student.id

                                return (
                                    <tr
                                        key={student.id}
                                        className={isSelected ? styles.selectedRow : ''}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedStudentId(student.id)}
                                                className={styles.studentButton}>
                                                <span className={styles.studentAvatar}>
                                                    {initials(student.name)}
                                                </span>
                                                <span>
                                                    <strong>{student.name}</strong>
                                                    <small>
                                                        Code:{' '}
                                                        {student.studentCode || 'N/A'} |{' '}
                                                        {student.gender || 'N/A'} |{' '}
                                                        {student.ageLabel || 'Not recorded'}
                                                    </small>
                                                </span>
                                            </button>
                                        </td>
                                        <td>{student.tutorGroup}</td>
                                        <td>
                                            <div className={styles.quickStatus}>
                                                {attendanceOptions.map(option => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => updateAttendance(student.id, option)}
                                                        className={`${styles.quickStatusButton} ${
                                                            student.status === option
                                                                ? statusMeta[option].chipClass
                                                                : ''
                                                        }`}>
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        {sessions.map((status, sessionIndex) => (
                                            <td key={`${student.id}-${sessionIndex}`}>
                                                <StatusCell status={status} />
                                            </td>
                                        ))}
                                        <td>
                                            <input
                                                className={styles.noteInput}
                                                value={student.note}
                                                onChange={event =>
                                                    updateNote(student.id, event.target.value)
                                                }
                                                placeholder="Add note"
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className={styles.tableFooter}>
                    <div className={styles.legend}>
                        {attendanceOptions.map(option => (
                            <div key={option} className={styles.legendItem}>
                                <span className={`${styles.statusBadge} ${statusMeta[option].chipClass}`}>
                                    {option}
                                </span>
                                <span>{statusMeta[option].label}</span>
                            </div>
                        ))}
                    </div>
                    <p className={styles.footerMeta}>
                        Showing 1-{currentTeacherStudents.length} of {currentTeacherStudents.length} learners
                    </p>
                </div>
            </section>

            {activeStudent ? (
                <section className={styles.lowerGrid}>
                    <div id="students" className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelEyebrow}>Student Profile</p>
                                <h2 className={styles.panelTitle}>{activeStudent.name}</h2>
                            </div>
                            <span className={styles.groupBadge}>{activeStudent.tutorGroup}</span>
                        </div>
                        <div className={styles.profileStats}>
                            <div className={styles.profileStat}>
                                <span>Student code</span>
                                <strong>{activeStudent.studentCode || 'N/A'}</strong>
                            </div>
                            <div className={styles.profileStat}>
                                <span>Sex</span>
                                <strong>{activeStudent.gender || 'N/A'}</strong>
                            </div>
                            <div className={styles.profileStat}>
                                <span>Guardian</span>
                                <strong>{activeStudent.guardianName || 'N/A'}</strong>
                            </div>
                        </div>

                        <div className={styles.bioDataGrid}>
                            {activeStudentBioData.map(item => (
                                <div key={item.label} className={styles.bioDataCard}>
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </div>
                            ))}
                        </div>

                        <div className={styles.noteCard}>
                            <span>Latest note</span>
                            <strong>
                                {activeStudent.note?.trim() ||
                                    'No teacher note or comment is recorded for this learner yet.'}
                            </strong>
                            <small>
                                This summary uses the latest saved teacher comment for the learner.
                            </small>
                        </div>
                    </div>

                    <div id="discipline" className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelEyebrow}>Discipline Tracker</p>
                                <h2 className={styles.panelTitle}>Log classroom conduct</h2>
                            </div>
                        </div>

                        <form onSubmit={submitDiscipline} className={styles.formGrid}>
                            <label className={styles.fieldLabel}>
                                <span>Student</span>
                                <div className={styles.staticField}>{activeStudent.name}</div>
                            </label>

                            <label className={styles.fieldLabel}>
                                <span>Incident type</span>
                                <select
                                    value={disciplineEntry.incident}
                                    onChange={event =>
                                        setDisciplineEntry(current => ({
                                            ...current,
                                            incident: event.target.value,
                                        }))
                                    }
                                    className={styles.selectField}>
                                    <option>Late arrival</option>
                                    <option>Uniform issue</option>
                                    <option>Missed prep task</option>
                                    <option>Disruptive conduct</option>
                                </select>
                            </label>

                            <label className={styles.fieldLabel}>
                                <span>Incident notes</span>
                                <textarea
                                    value={disciplineEntry.note}
                                    onChange={event =>
                                        setDisciplineEntry(current => ({
                                            ...current,
                                            note: event.target.value,
                                        }))
                                    }
                                    rows={4}
                                    className={styles.textArea}
                                    placeholder="Describe the incident, detention, or parent action."
                                />
                            </label>

                            <button type="submit" className={styles.primaryAction}>
                                Log discipline entry
                            </button>
                        </form>

                        <p className={styles.helperMessage}>{disciplineStatus}</p>
                    </div>
                </section>
            ) : null}
        </>
    )

        const renderManagementView = () => (
        <div className={styles.managementStack}>
            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Core Tools</p>
                            <h2 className={styles.panelTitle}>Operational workspaces</h2>
                        </div>
                    </div>

                    <div className={styles.alertList}>
                        <a href="/students" className={styles.alertCard}>
                            <div>
                                <strong>Students</strong>
                                <p>Create, update, and review learner records.</p>
                            </div>
                            <span className={styles.alertTag}>Open</span>
                        </a>

                        <a href="/gradebook" className={styles.alertCard}>
                            <div>
                                <strong>Gradebook</strong>
                                <p>Review assessment periods and subject grades.</p>
                            </div>
                            <span className={styles.alertTag}>Open</span>
                        </a>

                        <a href="/management/timetables" className={styles.alertCard}>
                            <div>
                                <strong>Timetables</strong>
                                <p>Create and assign class timetables.</p>
                            </div>
                            <span className={styles.alertTag}>Open</span>
                        </a>
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Setup</p>
                            <h2 className={styles.panelTitle}>Structure and allocations</h2>
                        </div>
                    </div>

                    <div className={styles.alertList}>
                        <a href="/management/subjects" className={styles.alertCard}>
                            <div>
                                <strong>Subjects</strong>
                                <p>Maintain the subject list used across the school.</p>
                            </div>
                            <span className={styles.alertTag}>Setup</span>
                        </a>

                        <a href="/management/form-teachers" className={styles.alertCard}>
                            <div>
                                <strong>Teacher Allocations</strong>
                                <p>Assign teachers to classes and subjects.</p>
                            </div>
                            <span className={styles.alertTag}>Setup</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    )

    const renderAdminView = () => (
        <div className={styles.managementStack}>
            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>System Controls</p>
                            <h2 className={styles.panelTitle}>Administrator-only actions</h2>
                        </div>
                    </div>

                    <div className={styles.alertList}>
                        <a href="/admin/users" className={styles.alertCard}>
                            <div>
                                <strong>User Accounts</strong>
                                <p>Create accounts, assign roles, and control access.</p>
                            </div>
                            <span className={styles.alertTag}>Admin</span>
                        </a>

                        <a href="/admin/school-structure" className={styles.alertCard}>
                            <div>
                                <strong>School Structure</strong>
                                <p>Set up the class structure used across the portal.</p>
                            </div>
                            <span className={styles.alertTag}>Admin</span>
                        </a>

                        <a href="/admin/settings" className={styles.alertCard}>
                            <div>
                                <strong>System Settings</strong>
                                <p>Review platform-level settings and controls.</p>
                            </div>
                            <span className={styles.alertTag}>Admin</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    )

    const renderFinanceView = () => (
        <div className={styles.managementStack}>
            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Finance Workspace</p>
                            <h2 className={styles.panelTitle}>Accountant tools</h2>
                        </div>
                    </div>

                    <div className={styles.alertList}>
                        <a href="/finance" className={styles.alertCard}>
                            <div>
                                <strong>Student finance desk</strong>
                                <p>Update balances, book payments, and uniform payments.</p>
                            </div>
                            <span className={styles.alertTag}>Finance</span>
                        </a>

                        <a href="/finance/merchandise" className={styles.alertCard}>
                            <div>
                                <strong>School merchandise</strong>
                                <p>Manage uniforms, books, shirts, and other school items.</p>
                            </div>
                            <span className={styles.alertTag}>Shop</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    )

    const renderUnsupportedView = () => (
        <div className={`${styles.statusNotice} ${styles.statusError}`}>
            This account does not have a staff dashboard assigned. Ask an administrator to set the correct role for this user.
        </div>
    )

    return (
        <div className={styles.page}>
            <header className={styles.topBar}>
                <div className={styles.titleGroup}>
                    <button
                        type="button"
                        className={styles.menuGlyph}
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar">
                        <span />
                        <span />
                        <span />
                    </button>
                    <div>
                        <p className={styles.pageEyebrow}>{pageEyebrow}</p>
                        <h1 className={styles.pageTitle}>{pageTitle}</h1>
                    </div>
                </div>

                <div className={styles.topBarRight}>
                    <div className={styles.searchBox}>
                        <svg viewBox="0 0 24 24" className={styles.searchIcon} aria-hidden="true">
                            <path
                                d="M11 5a6 6 0 104.3 10.2l3.3 3.3 1.4-1.4-3.3-3.3A6 6 0 0011 5z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                        <input
                            className={styles.searchInput}
                            placeholder={
                                teacherOnlyView
                                    ? 'Search students in your class...'
                                    : financeView
                                      ? 'Search finance workspace...'
                                    : guardianView
                                      ? 'Search learner updates...'
                                      : adminOnlyView
                                        ? 'Search admin tools...'
                                        : 'Search management tools...'
                            }
                        />
                    </div>

                    <button className={styles.bellButton} aria-label="Notifications">
                        <svg viewBox="0 0 24 24" className={styles.searchIcon} aria-hidden="true">
                            <path
                                d="M12 4.5a4.5 4.5 0 00-4.5 4.5v2.1c0 .8-.2 1.7-.7 2.4L5.6 15a1 1 0 00.8 1.5h11.2a1 1 0 00.8-1.5l-1.2-1.5c-.5-.7-.7-1.6-.7-2.4V9A4.5 4.5 0 0012 4.5zM10 18.5a2.1 2.1 0 004 0"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        {dashboardUnreadNotifications > 0 ? (
                            <span className={styles.bellDot}>
                                {dashboardUnreadNotifications}
                            </span>
                        ) : null}
                    </button>

                    <div className={styles.userMenu} tabIndex={-1}>
                        <button
                            type="button"
                            className={styles.userTrigger}
                            aria-label="User account details"
                            aria-describedby="user-account-popover">
                            <span className={styles.userAvatar}>
                                <UserIcon />
                            </span>
                        </button>

                        <div id="user-account-popover" className={styles.userPopover} role="tooltip">
                            <p className={styles.userName}>{user?.name ?? 'School Staff'}</p>
                            <p className={styles.userRole}>{pageRoleLabel}</p>
                            <p className={styles.userMeta}>{pageMeta}</p>
                        </div>
                    </div>
                </div>
            </header>

            <section className={styles.toolbar}>
                <div className={styles.filterRow}>
                    <button type="button" className={styles.filterControl}>
                        <span className={styles.filterLabel}>Date</span>
                        <span>{currentDateLabel}</span>
                    </button>

                    <button type="button" className={styles.filterControl}>
                        <span className={styles.filterLabel}>
                            {guardianView ? 'Learner scope' : 'Class scope'}
                        </span>
                        <span>
                            {teacherOnlyView
                                ? assignedFixture?.className ??
                                  teacherAssignmentLabel
                                : adminOnlyView
                                  ? 'System administration'
                                  : financeView
                                    ? 'Finance tools and merchandise'
                                  : guardianView
                                    ? user?.linked_student_record?.full_name ??
                                      'Awaiting learner link'
                                  : 'Management tools and setup'}
                        </span>
                    </button>

                    {teacherOnlyView ? (
                        <div className={styles.segmentedControl}>
                            {Object.entries(trackLabels).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setActiveTrack(value)}
                                    className={`${styles.segmentButton} ${
                                        activeTrack === value ? styles.segmentActive : ''
                                    }`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className={styles.actionRow}>
                    {teacherOnlyView ? (
                        <>
                            <button type="button" onClick={markAllPresent} className={styles.primaryAction}>
                                Mark All
                            </button>
                            <button type="button" onClick={submitRegister} className={styles.primaryGhost}>
                                Submit Register
                            </button>
                        </>
                    ) : null}

                    {teacherOnlyView ? (
                        <button
                            type="button"
                            onClick={exportRegister}
                            className={styles.secondaryAction}>
                            Export
                        </button>
                    ) : null}
                </div>
            </section>

            {teacherOnlyView
                ? renderTeacherView()
                : adminOnlyView
                  ? renderAdminView()
                  : financeView
                    ? renderFinanceView()
                  : guardianView
                    ? <GuardianDashboard user={user} />
                  : managementView
                    ? renderManagementView()
                    : renderUnsupportedView()}
        </div>
    )
}

export default Dashboard
