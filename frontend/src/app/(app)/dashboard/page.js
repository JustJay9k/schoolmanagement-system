'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/auth'
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

const createStudents = (tutorGroup, rows) =>
    rows.map((row, index) => ({
        id: row.id ?? `${tutorGroup}-${index + 1}`,
        tutorGroup,
        ...row,
    }))

const classFixtures = {
    primary: [
        {
            id: 'standard-5-east',
            className: 'Standard 5',
            tutorGroup: '5E',
            teacherLabel: 'Mrs Banda',
            submissionLabel: 'AM register complete: 1/2 sessions',
            upcomingLabel: 'PM literacy block starts at 13:10',
            timetable: [
                ['08:00', 'Morning Register', 'Class teacher'],
                ['09:00', 'Mathematics', 'M. Banda'],
                ['13:10', 'Literacy Block', 'L. Phiri'],
                ['15:00', 'PM Register', 'Class teacher'],
            ],
            students: createStudents('5E', [
                {
                    id: 1,
                    name: 'Martha Kalua',
                    status: 'P',
                    note: 'Breakfast voucher issued',
                    counts: { late: 2, sick: 1, absent: 0 },
                },
                {
                    id: 2,
                    name: 'Samuel Nkhoma',
                    status: 'L',
                    note: 'Arrived after transport delay',
                    counts: { late: 6, sick: 0, absent: 1 },
                },
                {
                    id: 3,
                    name: 'Fatsani Jere',
                    status: 'S',
                    note: 'Clinic note submitted',
                    counts: { late: 0, sick: 3, absent: 1 },
                },
                {
                    id: 4,
                    name: 'Ruth Banda',
                    status: 'P',
                    note: '',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
                {
                    id: 5,
                    name: 'Thoko Zulu',
                    status: 'E',
                    note: 'District reading event',
                    counts: { late: 0, sick: 0, absent: 1 },
                },
                {
                    id: 6,
                    name: 'Peter Mbewe',
                    status: 'P',
                    note: '',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
            ]),
        },
        {
            id: 'standard-7-west',
            className: 'Standard 7',
            tutorGroup: '7W',
            teacherLabel: 'Mr Tembo',
            submissionLabel: 'AM register complete: 2/2 sessions',
            upcomingLabel: 'Science block starts at 13:25',
            timetable: [
                ['08:00', 'Morning Register', 'Class teacher'],
                ['09:15', 'English', 'R. Zulu'],
                ['13:25', 'Science Block', 'P. Tembo'],
                ['15:00', 'PM Register', 'Class teacher'],
            ],
            students: createStudents('7W', [
                {
                    id: 101,
                    name: 'Mwai K.',
                    status: 'P',
                    note: 'Reading captain',
                    counts: { late: 0, sick: 0, absent: 0 },
                },
                {
                    id: 102,
                    name: 'Chisomo Daka',
                    status: 'P',
                    note: '',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
                {
                    id: 103,
                    name: 'Lina Sande',
                    status: 'L',
                    note: 'Late due to clinic visit',
                    counts: { late: 2, sick: 1, absent: 0 },
                },
                {
                    id: 104,
                    name: 'Hope Mwale',
                    status: 'P',
                    note: '',
                    counts: { late: 0, sick: 0, absent: 0 },
                },
                {
                    id: 105,
                    name: 'Yusuf Ali',
                    status: 'A',
                    note: 'Guardian called before assembly',
                    counts: { late: 0, sick: 0, absent: 2 },
                },
                {
                    id: 106,
                    name: 'Agnes Chirwa',
                    status: 'P',
                    note: '',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
            ]),
        },
    ],
    secondary: [
        {
            id: 'form-1',
            className: 'Form 1',
            tutorGroup: 'F1',
            teacherLabel: 'R. Mbewe',
            submissionLabel: 'Register submissions complete: 2/6 periods',
            upcomingLabel: 'Period 3 Chemistry starts at 10:40',
            timetable: [
                ['08:00', 'Period 1 English', 'R. Mbewe'],
                ['09:20', 'Period 2 Mathematics', 'P. Moyo'],
                ['10:40', 'Period 3 Chemistry', 'T. Mkandawire'],
                ['14:00', 'Period 5 Geography', 'S. Zulu'],
            ],
            students: createStudents('F1', [
                {
                    id: 201,
                    name: 'Prince Lungu',
                    status: 'P',
                    note: 'Present for double science block',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
                {
                    id: 202,
                    name: 'Tadala Soko',
                    status: 'A',
                    note: 'Guardian follow-up requested',
                    counts: { late: 0, sick: 0, absent: 5 },
                },
                {
                    id: 203,
                    name: 'Yamikani Daka',
                    status: 'E',
                    note: 'On debate assignment',
                    counts: { late: 3, sick: 0, absent: 0 },
                },
                {
                    id: 204,
                    name: 'Natasha Phiri',
                    status: 'L',
                    note: 'Late from assembly duty',
                    counts: { late: 4, sick: 0, absent: 0 },
                },
                {
                    id: 205,
                    name: 'Aisha Moyo',
                    status: 'P',
                    note: '',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
                {
                    id: 206,
                    name: 'Brian Chirwa',
                    status: 'P',
                    note: '',
                    counts: { late: 0, sick: 0, absent: 1 },
                },
                {
                    id: 207,
                    name: 'Esther Juma',
                    status: 'L',
                    note: 'Late to P2 (5 mins)',
                    counts: { late: 5, sick: 0, absent: 0 },
                },
                {
                    id: 208,
                    name: 'Moses Tembo',
                    status: 'P',
                    note: '',
                    counts: { late: 1, sick: 0, absent: 0 },
                },
            ]),
        },
        {
            id: 'form-2',
            className: 'Form 2',
            tutorGroup: 'F2',
            teacherLabel: 'C. Phiri',
            submissionLabel: 'Register submissions complete: 5/6 periods',
            upcomingLabel: 'Period 4 History starts at 13:15',
            timetable: [
                ['08:00', 'Period 1 Biology', 'C. Phiri'],
                ['09:20', 'Period 2 Chichewa', 'N. Jere'],
                ['11:15', 'Period 3 ICT', 'A. Phoso'],
                ['13:15', 'Period 4 History', 'L. Banda'],
            ],
            students: createStudents('F2', [
                {
                    id: 301,
                    name: 'Mary Nthenda',
                    status: 'P',
                    note: '',
                    counts: { late: 0, sick: 0, absent: 0 },
                },
                {
                    id: 302,
                    name: 'John Chikopa',
                    status: 'P',
                    note: 'Recovered from last week illness',
                    counts: { late: 1, sick: 1, absent: 0 },
                },
                {
                    id: 303,
                    name: 'Rebecca James',
                    status: 'L',
                    note: 'Arrived after bus delay',
                    counts: { late: 2, sick: 0, absent: 0 },
                },
                {
                    id: 304,
                    name: 'Peter Soko',
                    status: 'A',
                    note: 'No explanation submitted',
                    counts: { late: 0, sick: 0, absent: 3 },
                },
                {
                    id: 305,
                    name: 'Tiwonge Gondwe',
                    status: 'P',
                    note: '',
                    counts: { late: 0, sick: 0, absent: 0 },
                },
                {
                    id: 306,
                    name: 'Gift Nkhata',
                    status: 'S',
                    note: 'School clinic referral',
                    counts: { late: 0, sick: 2, absent: 0 },
                },
            ]),
        },
    ],
}

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

const managementAlerts = {
    primary: [
        {
            title: 'Standard 7 flagged two persistent late arrivals',
            detail: 'Pastoral follow-up is needed before Friday assembly and parent call slots.',
            severity: 'Welfare',
        },
        {
            title: 'Primary AM attendance dipped below 93%',
            detail: 'Transport delays affected both upper section classes this morning.',
            severity: 'Action now',
        },
        {
            title: 'Meal support notes increased this week',
            detail: 'Welfare support is now attached to four active primary learners.',
            severity: 'Support',
        },
    ],
    secondary: [
        {
            title: 'Form 2 missed Period 4 register yesterday',
            detail: 'No submission posted between 13:00 and 13:25. Escalate to HOD Science.',
            severity: 'Action now',
        },
        {
            title: 'Three students reached chronic absence threshold',
            detail: 'System logic engine flagged 10-day rolling attendance risk for welfare review.',
            severity: 'Welfare',
        },
        {
            title: 'Tuition balance variance increased this week',
            detail: 'Senior classes account for 62% of unpaid balances above ageing threshold.',
            severity: 'Finance',
        },
    ],
}

const ledgerRows = {
    primary: [
        {
            student: 'Mwai K.',
            className: 'Standard 7',
            invoiced: 'MWK 280,000',
            paid: 'MWK 280,000',
            balance: 'MWK 0',
        },
        {
            student: 'Martha Kalua',
            className: 'Standard 5',
            invoiced: 'MWK 260,000',
            paid: 'MWK 200,000',
            balance: 'MWK 60,000',
        },
        {
            student: 'Yusuf Ali',
            className: 'Standard 7',
            invoiced: 'MWK 280,000',
            paid: 'MWK 180,000',
            balance: 'MWK 100,000',
        },
    ],
    secondary: [
        {
            student: 'Chikondi M.',
            className: 'Form 4',
            invoiced: 'MWK 480,000',
            paid: 'MWK 420,000',
            balance: 'MWK 60,000',
        },
        {
            student: 'Josephine T.',
            className: 'Form 1',
            invoiced: 'MWK 360,000',
            paid: 'MWK 240,000',
            balance: 'MWK 120,000',
        },
        {
            student: 'Tadala Soko',
            className: 'Form 1',
            invoiced: 'MWK 420,000',
            paid: 'MWK 210,000',
            balance: 'MWK 210,000',
        },
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

const buildSessionStates = (student, track) => {
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
            result[student.status] += 1
            return result
        },
        { P: 0, L: 0, S: 0, A: 0, E: 0 },
    )

const getAttendanceRate = counts => {
    const total = counts.P + counts.L + counts.S + counts.A + counts.E
    const attending = counts.P + counts.L + counts.E

    return total ? Math.round((attending / total) * 1000) / 10 : 0
}

const flattenTrackStudents = fixtures =>
    fixtures.flatMap(fixture =>
        fixture.students.map(student => ({
            ...student,
            className: fixture.className,
            teacherLabel: fixture.teacherLabel,
        })),
    )

const buildClassSummaries = fixtures =>
    fixtures.map(fixture => {
        const counts = getCounts(fixture.students)
        return {
            id: fixture.id,
            className: fixture.className,
            teacherLabel: fixture.teacherLabel,
            learners: fixture.students.length,
            attendanceRate: getAttendanceRate(counts),
            pendingNotes: fixture.students.filter(student => student.note.trim() !== '').length,
        }
    })

const StatusCell = ({ status }) => {
    const meta = statusMeta[status]

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
    const teacherOnlyView = userRole === 'teacher'
    const managementView = ['management', 'admin', 'staff', 'accountant'].includes(userRole)

    const [activeTrack, setActiveTrack] = useState(userTrack ?? 'secondary')
    const [registerState, setRegisterState] = useState(() =>
        Object.fromEntries(
            Object.values(classFixtures)
                .flat()
                .map(fixture => [fixture.id, fixture.students]),
        ),
    )
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
    const [paymentEntry, setPaymentEntry] = useState({
        student: ledgerRows[activeTrack][0].student,
        amount: '60000',
        method: 'Bank transfer',
    })
    const [paymentStatus, setPaymentStatus] = useState('No payment recorded in this session.')

    useEffect(() => {
        if (teacherOnlyView && userTrack) {
            setActiveTrack(userTrack)
        }
    }, [teacherOnlyView, userTrack])

    useEffect(() => {
        setPaymentEntry(current => ({
            ...current,
            student: ledgerRows[activeTrack][0].student,
        }))
    }, [activeTrack])

    const assignedFixture = useMemo(() => {
        if (!teacherOnlyView || !userTrack || assignedClassName === '') {
            return null
        }

        return (
            classFixtures[userTrack].find(fixture => fixture.className === assignedClassName) ?? null
        )
    }, [assignedClassName, teacherOnlyView, userTrack])

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
    const managementFixtures = classFixtures[activeTrack]
    const managementStudents = useMemo(
        () => flattenTrackStudents(managementFixtures),
        [managementFixtures],
    )
    const managementCounts = useMemo(
        () => getCounts(managementStudents),
        [managementStudents],
    )
    const managementAttendanceRate = getAttendanceRate(managementCounts)
    const classSummaries = useMemo(
        () => buildClassSummaries(managementFixtures),
        [managementFixtures],
    )

    const managementMetrics = [
        {
            label: 'Classes in view',
            value: String(managementFixtures.length).padStart(2, '0'),
            note: `All ${trackLabels[activeTrack].toLowerCase()} class owners in the active dashboard view.`,
        },
        {
            label: 'Learners tracked',
            value: String(managementStudents.length).padStart(2, '0'),
            note: 'Combined learner count visible across every class in the selected track.',
        },
        {
            label: 'Attendance rate',
            value: `${managementAttendanceRate}%`,
            note: 'Live aggregate attendance across all visible classes.',
        },
        {
            label: 'At-risk learners',
            value: String(
                managementStudents.filter(student => student.counts.absent >= 2).length,
            ).padStart(2, '0'),
            note: 'Students requiring follow-up because absence counts are already elevated.',
        },
    ]

    const pageEyebrow = teacherOnlyView ? 'Assigned Class Register' : 'Management Dashboard'
    const pageTitle = teacherOnlyView
        ? assignedFixture?.className ?? 'Class assignment required'
        : `${trackLabels[activeTrack]} School Overview`
    const pageRoleLabel = formatRoleLabel(userRole)
    const pageMeta = teacherOnlyView
        ? assignedFixture
            ? `${trackLabels[activeTrack]} teacher dashboard for ${assignedFixture.className}`
            : 'Teacher account needs a class assignment from the admin dashboard.'
        : `${trackLabels[activeTrack]} overview across all assigned classes`

    const updateAttendance = (studentId, status) => {
        if (!assignedFixture) {
            return
        }

        setRegisterState(current => ({
            ...current,
            [assignedFixture.id]: current[assignedFixture.id].map(student =>
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
            [assignedFixture.id]: current[assignedFixture.id].map(student =>
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
                message: 'Your account does not yet have a class assignment. Ask an administrator to assign one.',
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
            [assignedFixture.id]: current[assignedFixture.id].map(student => ({
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

    const submitPayment = async event => {
        event.preventDefault()

        if (!paymentEntry.amount.trim()) {
            setPaymentStatus('Enter a payment amount before saving.')
            return
        }

        setPaymentStatus('Recording payment...')
        await simulateRequest(true)
        setPaymentStatus(
            `Payment of MWK ${Number(paymentEntry.amount).toLocaleString()} recorded for ${paymentEntry.student} via ${paymentEntry.method}.`,
        )
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
                    ? 'This teacher account is not yet assigned to a class. Use the admin dashboard to set a track and class for this user.'
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
                                                        Late: {student.counts.late} • Sick:{' '}
                                                        {student.counts.sick} • Absent:{' '}
                                                        {student.counts.absent}
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
                                <span>Late count</span>
                                <strong>{String(activeStudent.counts.late).padStart(2, '0')}</strong>
                            </div>
                            <div className={styles.profileStat}>
                                <span>Sick count</span>
                                <strong>{String(activeStudent.counts.sick).padStart(2, '0')}</strong>
                            </div>
                            <div className={styles.profileStat}>
                                <span>Absent count</span>
                                <strong>{String(activeStudent.counts.absent).padStart(2, '0')}</strong>
                            </div>
                        </div>

                        <div className={styles.scheduleList}>
                            {assignedFixture.timetable.map(slot => (
                                <div key={slot.join('-')} className={styles.scheduleItem}>
                                    <span>{slot[0]}</span>
                                    <div>
                                        <strong>{slot[1]}</strong>
                                        <small>{slot[2]}</small>
                                    </div>
                                </div>
                            ))}
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
            <section id="analytics" className={styles.managementCards}>
                {managementMetrics.map(metric => (
                    <div key={metric.label} className={styles.managementCard}>
                        <p className={styles.metricLabel}>{metric.label}</p>
                        <p className={styles.managementValue}>{metric.value}</p>
                        <p className={styles.metricMeta}>{metric.note}</p>
                    </div>
                ))}
            </section>

            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Class Ownership</p>
                            <h2 className={styles.panelTitle}>Teacher visibility map</h2>
                        </div>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.compactTable}>
                            <thead>
                                <tr>
                                    <th>Class</th>
                                    <th>Teacher</th>
                                    <th>Learners</th>
                                    <th>Attendance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classSummaries.map(summary => (
                                    <tr key={summary.id}>
                                        <td>{summary.className}</td>
                                        <td>{summary.teacherLabel}</td>
                                        <td>{summary.learners}</td>
                                        <td>{summary.attendanceRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Alerts & Escalations</p>
                            <h2 className={styles.panelTitle}>Critical follow-up</h2>
                        </div>
                    </div>

                    <div className={styles.alertList}>
                        {managementAlerts[activeTrack].map(alert => (
                            <div key={alert.title} className={styles.alertCard}>
                                <div>
                                    <strong>{alert.title}</strong>
                                    <p>{alert.detail}</p>
                                </div>
                                <span className={styles.alertTag}>{alert.severity}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.lowerGrid}>
                <div id="timetable" className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Timetable Management</p>
                            <h2 className={styles.panelTitle}>Class allocations</h2>
                        </div>
                    </div>

                    <div className={styles.timetableCards}>
                        {managementFixtures.flatMap(fixture =>
                            fixture.timetable.map(slot => (
                                <div key={`${fixture.id}-${slot.join('-')}`} className={styles.timetableCard}>
                                    <div>
                                        <strong>{slot[1]}</strong>
                                        <small>
                                            {fixture.className} • {slot[2]}
                                        </small>
                                    </div>
                                    <span>{slot[0]}</span>
                                </div>
                            )),
                        )}
                    </div>
                </div>

                <div id="finance" className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Financial Ledger</p>
                            <h2 className={styles.panelTitle}>Student accounts</h2>
                        </div>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.compactTable}>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Class</th>
                                    <th>Invoiced</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledgerRows[activeTrack].map(row => (
                                    <tr key={row.student}>
                                        <td>{row.student}</td>
                                        <td>{row.className}</td>
                                        <td>{row.invoiced}</td>
                                        <td>{row.paid}</td>
                                        <td className={styles.balanceCell}>{row.balance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className={styles.lowerGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Payment Capture</p>
                            <h2 className={styles.panelTitle}>Record a payment</h2>
                        </div>
                    </div>

                    <form onSubmit={submitPayment} className={styles.formGrid}>
                        <label className={styles.fieldLabel}>
                            <span>Student</span>
                            <select
                                value={paymentEntry.student}
                                onChange={event =>
                                    setPaymentEntry(current => ({
                                        ...current,
                                        student: event.target.value,
                                    }))
                                }
                                className={styles.selectField}>
                                {ledgerRows[activeTrack].map(row => (
                                    <option key={row.student}>{row.student}</option>
                                ))}
                            </select>
                        </label>

                        <label className={styles.fieldLabel}>
                            <span>Amount received</span>
                            <input
                                value={paymentEntry.amount}
                                onChange={event =>
                                    setPaymentEntry(current => ({
                                        ...current,
                                        amount: event.target.value,
                                    }))
                                }
                                className={styles.textField}
                            />
                        </label>

                        <label className={styles.fieldLabel}>
                            <span>Method</span>
                            <select
                                value={paymentEntry.method}
                                onChange={event =>
                                    setPaymentEntry(current => ({
                                        ...current,
                                        method: event.target.value,
                                    }))
                                }
                                className={styles.selectField}>
                                <option>Bank transfer</option>
                                <option>Cash office</option>
                                <option>Mobile money</option>
                            </select>
                        </label>

                        <button type="submit" className={styles.primaryAction}>
                            Record payment
                        </button>
                    </form>

                    <p className={styles.helperMessage}>{paymentStatus}</p>
                </div>

                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.panelEyebrow}>Register Snapshot</p>
                            <h2 className={styles.panelTitle}>Cross-class attendance mix</h2>
                        </div>
                    </div>

                    <div className={styles.profileStats}>
                        {attendanceOptions.map(option => (
                            <div key={option} className={styles.profileStat}>
                                <span>{statusMeta[option].label}</span>
                                <strong>{managementCounts[option]}</strong>
                            </div>
                        ))}
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
                                    : 'Search classes or students...'
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
                        <span className={styles.bellDot}>3</span>
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
                        <span>Tuesday, 21 May 2024</span>
                    </button>

                    <button type="button" className={styles.filterControl}>
                        <span className={styles.filterLabel}>Class scope</span>
                        <span>
                            {teacherOnlyView
                                ? assignedFixture?.className ?? 'Assignment required'
                                : `All ${trackLabels[activeTrack].toLowerCase()} classes`}
                        </span>
                    </button>

                    <div className={styles.segmentedControl}>
                        {Object.entries(trackLabels).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => {
                                    if (!teacherOnlyView) {
                                        setActiveTrack(value)
                                    }
                                }}
                                disabled={teacherOnlyView}
                                className={`${styles.segmentButton} ${
                                    activeTrack === value ? styles.segmentActive : ''
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
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

                    <button type="button" onClick={exportRegister} className={styles.secondaryAction}>
                        Export
                    </button>
                </div>
            </section>

            {teacherOnlyView
                ? renderTeacherView()
                : managementView
                  ? renderManagementView()
                  : renderUnsupportedView()}
        </div>
    )
}

export default Dashboard
