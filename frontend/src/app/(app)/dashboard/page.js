'use client'

import { useMemo, useState } from 'react'
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

const teacherSnapshots = {
    primary: {
        className: 'Standard 5 - East',
        submissionLabel: 'AM register complete: 1/2 sessions',
        upcomingLabel: 'PM literacy block starts at 13:10',
        timetable: [
            ['08:00', 'Morning Register', 'Class teacher'],
            ['09:00', 'Mathematics', 'M. Banda'],
            ['13:10', 'Literacy Block', 'L. Phiri'],
            ['15:00', 'PM Register', 'Class teacher'],
        ],
    },
    secondary: {
        className: 'Year 10 - English (10A)',
        submissionLabel: 'Register submissions complete: 2/6 periods',
        upcomingLabel: 'Period 3 Chemistry starts at 10:40',
        timetable: [
            ['08:00', 'Period 1 English', 'R. Mbewe'],
            ['09:20', 'Period 2 Mathematics', 'P. Moyo'],
            ['10:40', 'Period 3 Chemistry', 'T. Mkandawire'],
            ['14:00', 'Period 5 Geography', 'S. Zulu'],
        ],
    },
}

const registerData = {
    primary: [
        {
            id: 1,
            name: 'Martha Kalua',
            tutorGroup: '5E',
            status: 'P',
            note: 'Breakfast voucher issued',
            counts: { late: 2, sick: 1, absent: 0 },
        },
        {
            id: 2,
            name: 'Samuel Nkhoma',
            tutorGroup: '5E',
            status: 'L',
            note: 'Arrived after transport delay',
            counts: { late: 6, sick: 0, absent: 1 },
        },
        {
            id: 3,
            name: 'Fatsani Jere',
            tutorGroup: '5E',
            status: 'S',
            note: 'Clinic note submitted',
            counts: { late: 0, sick: 3, absent: 1 },
        },
        {
            id: 4,
            name: 'Ruth Banda',
            tutorGroup: '5E',
            status: 'P',
            note: '',
            counts: { late: 1, sick: 0, absent: 0 },
        },
        {
            id: 5,
            name: 'Thoko Zulu',
            tutorGroup: '5E',
            status: 'E',
            note: 'District reading event',
            counts: { late: 0, sick: 0, absent: 1 },
        },
        {
            id: 6,
            name: 'Peter Mbewe',
            tutorGroup: '5E',
            status: 'P',
            note: '',
            counts: { late: 1, sick: 0, absent: 0 },
        },
    ],
    secondary: [
        {
            id: 11,
            name: 'Prince Lungu',
            tutorGroup: '10A',
            status: 'P',
            note: 'Present for double science block',
            counts: { late: 1, sick: 0, absent: 0 },
        },
        {
            id: 12,
            name: 'Tadala Soko',
            tutorGroup: '10A',
            status: 'A',
            note: 'Guardian follow-up requested',
            counts: { late: 0, sick: 0, absent: 5 },
        },
        {
            id: 13,
            name: 'Yamikani Daka',
            tutorGroup: '10A',
            status: 'E',
            note: 'On debate assignment',
            counts: { late: 3, sick: 0, absent: 0 },
        },
        {
            id: 14,
            name: 'Natasha Phiri',
            tutorGroup: '10A',
            status: 'L',
            note: 'Late from assembly duty',
            counts: { late: 4, sick: 0, absent: 0 },
        },
        {
            id: 15,
            name: 'Aisha Moyo',
            tutorGroup: '10A',
            status: 'P',
            note: '',
            counts: { late: 1, sick: 0, absent: 0 },
        },
        {
            id: 16,
            name: 'Brian Chirwa',
            tutorGroup: '10A',
            status: 'P',
            note: '',
            counts: { late: 0, sick: 0, absent: 1 },
        },
        {
            id: 17,
            name: 'Esther Juma',
            tutorGroup: '10A',
            status: 'L',
            note: 'Late to P2 (5 mins)',
            counts: { late: 5, sick: 0, absent: 0 },
        },
        {
            id: 18,
            name: 'Moses Tembo',
            tutorGroup: '10A',
            status: 'P',
            note: '',
            counts: { late: 1, sick: 0, absent: 0 },
        },
    ],
}

const managementMetrics = {
    primary: [
        {
            label: 'Class compliance',
            value: '94%',
            note: '18 of 19 AM/PM registers submitted',
        },
        {
            label: 'Chronic absence watch',
            value: '09',
            note: 'Students above weekly threshold',
        },
        {
            label: 'Outstanding balances',
            value: 'MWK 2.1M',
            note: 'Primary fee balances this month',
        },
    ],
    secondary: [
        {
            label: 'Period compliance',
            value: '88%',
            note: '132 of 150 expected period registers submitted',
        },
        {
            label: 'Teacher escalations',
            value: '06',
            note: 'Missing period logs or coverage issues',
        },
        {
            label: 'Outstanding balances',
            value: 'MWK 4.8M',
            note: 'Secondary fee balances this month',
        },
    ],
}

const alertFeed = [
    {
        title: 'Form 2 North missed Period 4 register yesterday',
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
]

const ledgerRows = [
    {
        student: 'Chikondi M.',
        className: 'Form 4',
        invoiced: 'MWK 480,000',
        paid: 'MWK 420,000',
        balance: 'MWK 60,000',
    },
    {
        student: 'Mwai K.',
        className: 'Standard 7',
        invoiced: 'MWK 280,000',
        paid: 'MWK 280,000',
        balance: 'MWK 0',
    },
    {
        student: 'Josephine T.',
        className: 'Form 1',
        invoiced: 'MWK 360,000',
        paid: 'MWK 240,000',
        balance: 'MWK 120,000',
    },
]

const attendanceOptions = ['P', 'L', 'S', 'A', 'E']

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

const StatusCell = ({ status }) => {
    const meta = statusMeta[status]

    return <span className={`${styles.statusBadge} ${meta.chipClass}`}>{meta.short}</span>
}

const Dashboard = () => {
    const { user } = useAuth({ middleware: 'auth' })

    const [activeRole, setActiveRole] = useState('teacher')
    const [activeTrack, setActiveTrack] = useState('secondary')
    const [registerState, setRegisterState] = useState(registerData)
    const [selectedStudent, setSelectedStudent] = useState({
        primary: registerData.primary[0].id,
        secondary: registerData.secondary[0].id,
    })
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
        student: 'Chikondi M.',
        amount: '60000',
        method: 'Bank transfer',
    })
    const [paymentStatus, setPaymentStatus] = useState('No payment recorded in this session.')

    const activeSnapshot = teacherSnapshots[activeTrack]
    const activeRegister = registerState[activeTrack]
    const activeStudent =
        activeRegister.find(student => student.id === selectedStudent[activeTrack]) ??
        activeRegister[0]

    const counts = useMemo(
        () =>
            activeRegister.reduce(
                (result, student) => {
                    result[student.status] += 1
                    return result
                },
                { P: 0, L: 0, S: 0, A: 0, E: 0 },
            ),
        [activeRegister],
    )

    const attendanceRate = useMemo(() => {
        const attending = counts.P + counts.L + counts.E
        return activeRegister.length
            ? Math.round((attending / activeRegister.length) * 1000) / 10
            : 0
    }, [activeRegister.length, counts])

    const summaryCards = [
        {
            status: 'P',
            value: counts.P,
            share: formatShare(counts.P, activeRegister.length),
        },
        {
            status: 'A',
            value: counts.A,
            share: formatShare(counts.A, activeRegister.length),
        },
        {
            status: 'L',
            value: counts.L,
            share: formatShare(counts.L, activeRegister.length),
        },
        {
            status: 'E',
            value: counts.E,
            share: formatShare(counts.E, activeRegister.length),
        },
        {
            status: 'S',
            value: counts.S,
            share: formatShare(counts.S, activeRegister.length),
        },
    ]

    const updateAttendance = (studentId, status) => {
        setRegisterState(current => ({
            ...current,
            [activeTrack]: current[activeTrack].map(student =>
                student.id === studentId ? { ...student, status } : student,
            ),
        }))
    }

    const updateNote = (studentId, note) => {
        setRegisterState(current => ({
            ...current,
            [activeTrack]: current[activeTrack].map(student =>
                student.id === studentId ? { ...student, note } : student,
            ),
        }))
    }

    const simulateRequest = message =>
        new Promise(resolve => {
            setTimeout(() => resolve(message), 550)
        })

    const submitRegister = async () => {
        setRegisterStatus({
            tone: 'loading',
            message: 'Submitting register payload to the system logic engine...',
        })

        const missingStatus = activeRegister.some(student => !student.status)

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
                    ? 'AM register posted successfully. Compliance dashboard refreshed.'
                    : 'Period register posted successfully. Timetable-linked attendance refreshed.',
        })
    }

    const markAllPresent = () => {
        setRegisterState(current => ({
            ...current,
            [activeTrack]: current[activeTrack].map(student => ({
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
            message: 'Preparing export package...',
        })
        await simulateRequest(true)
        setRegisterStatus({
            tone: 'success',
            message: 'Export package prepared for attendance review.',
        })
    }

    const submitDiscipline = async event => {
        event.preventDefault()

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

    return (
        <div className={styles.page}>
            <header className={styles.topBar}>
                <div className={styles.titleGroup}>
                    <button className={styles.menuGlyph} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </button>
                    <div>
                        <p className={styles.pageEyebrow}>
                            {activeRole === 'teacher' ? 'Live Register' : 'Leadership Dashboard'}
                        </p>
                        <h1 className={styles.pageTitle}>
                            {activeTrack === 'primary' ? 'Primary Register' : 'Secondary Register'}
                        </h1>
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
                            placeholder="Search students..."
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

                    <div className={styles.userBadge}>
                        <div className={styles.userAvatar}>{initials(user?.name ?? 'MS')}</div>
                        <div className={styles.userCopy}>
                            <p className={styles.userName}>{user?.name ?? 'Miss Smith'}</p>
                            <p className={styles.userRole}>
                                {activeTrack === 'secondary' ? 'English Teacher' : 'Class Teacher'}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <section className={styles.toolbar}>
                <div className={styles.filterRow}>
                    <button className={styles.filterControl}>
                        <span className={styles.filterLabel}>Date</span>
                        <span>Tuesday, 21 May 2024</span>
                    </button>
                    <button className={styles.filterControl}>
                        <span className={styles.filterLabel}>Class</span>
                        <span>{activeSnapshot.className}</span>
                    </button>
                    <div className={styles.segmentedControl}>
                        {[
                            ['teacher', 'Teacher'],
                            ['management', 'Management'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setActiveRole(value)}
                                className={`${styles.segmentButton} ${
                                    activeRole === value ? styles.segmentActive : ''
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className={styles.segmentedControl}>
                        {[
                            ['primary', 'Primary'],
                            ['secondary', 'Secondary'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => setActiveTrack(value)}
                                className={`${styles.segmentButton} ${
                                    activeTrack === value ? styles.segmentActive : ''
                                }`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.actionRow}>
                    {activeRole === 'teacher' ? (
                        <>
                            <button onClick={markAllPresent} className={styles.primaryAction}>
                                Mark All
                            </button>
                            <button onClick={submitRegister} className={styles.primaryGhost}>
                                Submit Register
                            </button>
                        </>
                    ) : null}
                    <button onClick={exportRegister} className={styles.secondaryAction}>
                        Export
                    </button>
                </div>
            </section>

            {activeRole === 'teacher' ? (
                <>
                    <section className={styles.metricsRow}>
                        {summaryCards.map(card => (
                            <div
                                key={card.status}
                                className={`${styles.metricCard} ${
                                    statusMeta[card.status].softClass
                                }`}>
                                <div className={styles.metricIconWrap}>
                                    <span
                                        className={`${styles.statusBadge} ${statusMeta[card.status].chipClass}`}>
                                        {statusMeta[card.status].short}
                                    </span>
                                </div>
                                <div>
                                    <p className={styles.metricLabel}>
                                        {statusMeta[card.status].label}
                                    </p>
                                    <p className={styles.metricValue}>{card.value}</p>
                                    <p className={styles.metricMeta}>{card.share}</p>
                                </div>
                            </div>
                        ))}

                        <div className={styles.overallCard}>
                            <div
                                className={styles.donut}
                                style={{
                                    background: `conic-gradient(#42c96a ${attendanceRate}%, #e8effb ${attendanceRate}% 100%)`,
                                }}>
                                <div className={styles.donutInner} />
                            </div>
                            <div>
                                <p className={styles.metricLabel}>Attendance</p>
                                <p className={styles.overallValue}>{attendanceRate}%</p>
                                <p className={styles.metricMeta}>Overall</p>
                            </div>
                        </div>
                    </section>

                    <div
                        className={`${styles.statusNotice} ${
                            registerStatus.tone === 'success'
                                ? styles.statusSuccess
                                : registerStatus.tone === 'error'
                                  ? styles.statusError
                                  : registerStatus.tone === 'loading'
                                    ? styles.statusLoading
                                    : styles.statusIdle
                        }`}>
                        {registerStatus.message}
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
                                                    {column.sub ? (
                                                        <small>{column.sub}</small>
                                                    ) : null}
                                                </div>
                                            </th>
                                        ))}
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeRegister.map((student, index) => {
                                        const sessions = buildSessionStates(student, activeTrack)
                                        const isSelected =
                                            student.id === selectedStudent[activeTrack]

                                        return (
                                            <tr
                                                key={student.id}
                                                className={isSelected ? styles.selectedRow : ''}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <button
                                                        onClick={() =>
                                                            setSelectedStudent(current => ({
                                                                ...current,
                                                                [activeTrack]: student.id,
                                                            }))
                                                        }
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
                                                                onClick={() =>
                                                                    updateAttendance(
                                                                        student.id,
                                                                        option,
                                                                    )
                                                                }
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
                                                            updateNote(
                                                                student.id,
                                                                event.target.value,
                                                            )
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
                                        <span
                                            className={`${styles.statusBadge} ${statusMeta[option].chipClass}`}>
                                            {option}
                                        </span>
                                        <span>{statusMeta[option].label}</span>
                                    </div>
                                ))}
                            </div>
                            <p className={styles.footerMeta}>
                                Showing 1-{activeRegister.length} of {activeRegister.length} learners
                            </p>
                        </div>
                    </section>

                    <section className={styles.lowerGrid}>
                        <div id="students" className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <p className={styles.panelEyebrow}>Student Profile</p>
                                    <h2 className={styles.panelTitle}>{activeStudent.name}</h2>
                                </div>
                                <span className={styles.groupBadge}>
                                    {activeStudent.tutorGroup}
                                </span>
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
                                {activeSnapshot.timetable.map(slot => (
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
                </>
            ) : (
                <div className={styles.managementStack}>
                    <section id="analytics" className={styles.managementCards}>
                        {managementMetrics[activeTrack].map(metric => (
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
                                    <p className={styles.panelEyebrow}>Alerts & Escalations</p>
                                    <h2 className={styles.panelTitle}>Critical follow-up</h2>
                                </div>
                            </div>

                            <div className={styles.alertList}>
                                {alertFeed.map(alert => (
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

                        <div id="timetable" className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <p className={styles.panelEyebrow}>Timetable Management</p>
                                    <h2 className={styles.panelTitle}>Class allocations</h2>
                                </div>
                            </div>

                            <div className={styles.timetableCards}>
                                {activeSnapshot.timetable.map(slot => (
                                    <div key={slot.join('-')} className={styles.timetableCard}>
                                        <div>
                                            <strong>{slot[1]}</strong>
                                            <small>{slot[2]}</small>
                                        </div>
                                        <span>{slot[0]}</span>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.inlineActions}>
                                <button className={styles.primaryAction}>Create slot</button>
                                <button className={styles.secondaryAction}>Publish revision</button>
                            </div>
                        </div>
                    </section>

                    <section id="finance" className={styles.lowerGrid}>
                        <div className={styles.panel}>
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
                                        {ledgerRows.map(row => (
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
                                        {ledgerRows.map(row => (
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
                    </section>
                </div>
            )}
        </div>
    )
}

export default Dashboard
