'use client'

import { useState } from 'react'

const teacherSnapshots = {
    primary: {
        className: 'Standard 5 - East',
        submissionLabel: 'AM register complete: 1/2 sessions',
        upcomingLabel: 'PM literacy block starts at 13:10',
        metrics: [
            { label: 'Present', value: '31' },
            { label: 'Late', value: '04' },
            { label: 'Medical notes', value: '03' },
            { label: 'Escalations', value: '01' },
        ],
        timetable: [
            ['08:00', 'Morning register', 'Class teacher'],
            ['09:00', 'Mathematics', 'M. Banda'],
            ['13:10', 'Literacy block', 'L. Phiri'],
            ['15:00', 'PM register', 'Class teacher'],
        ],
    },
    secondary: {
        className: 'Form 2 - North',
        submissionLabel: 'Register submissions complete: 2/6 periods',
        upcomingLabel: 'Period 3 Chemistry starts at 10:40',
        metrics: [
            { label: 'Present', value: '27' },
            { label: 'Late', value: '02' },
            { label: 'Excused', value: '01' },
            { label: 'Missing periods', value: '04' },
        ],
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
            name: 'Martha K.',
            status: 'P',
            note: 'Breakfast voucher issued',
            counts: { late: 2, sick: 1, absent: 0 },
        },
        {
            id: 2,
            name: 'Samuel N.',
            status: 'L',
            note: 'Arrived after transport delay',
            counts: { late: 6, sick: 0, absent: 1 },
        },
        {
            id: 3,
            name: 'Fatsani J.',
            status: 'S',
            note: 'Clinic note submitted',
            counts: { late: 0, sick: 3, absent: 1 },
        },
        {
            id: 4,
            name: 'Ruth B.',
            status: 'P',
            note: '',
            counts: { late: 1, sick: 0, absent: 0 },
        },
    ],
    secondary: [
        {
            id: 11,
            name: 'Prince L.',
            status: 'P',
            note: 'Present for double science block',
            counts: { late: 1, sick: 0, absent: 0 },
        },
        {
            id: 12,
            name: 'Tadala S.',
            status: 'A',
            note: 'Guardian follow-up requested',
            counts: { late: 0, sick: 0, absent: 5 },
        },
        {
            id: 13,
            name: 'Yamikani D.',
            status: 'E',
            note: 'On debate assignment',
            counts: { late: 3, sick: 0, absent: 0 },
        },
        {
            id: 14,
            name: 'Natasha P.',
            status: 'L',
            note: 'Late from assembly duty',
            counts: { late: 4, sick: 0, absent: 0 },
        },
    ],
}

const managementMetrics = {
    primary: [
        { label: 'Class compliance', value: '94%', note: '18 of 19 AM/PM registers submitted' },
        { label: 'Chronic absence watch', value: '09', note: 'Students above weekly threshold' },
        { label: 'Outstanding balances', value: 'MWK 2.1M', note: 'Primary fee balances this month' },
    ],
    secondary: [
        { label: 'Period compliance', value: '88%', note: '132 of 150 expected period registers submitted' },
        { label: 'Teacher escalations', value: '06', note: 'Missing period logs or coverage issues' },
        { label: 'Outstanding balances', value: 'MWK 4.8M', note: 'Secondary fee balances this month' },
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

const SectionHeading = ({ eyebrow, title, copy }) => (
    <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
            {eyebrow}
        </p>
        <h2 className="font-[var(--font-display)] text-3xl text-[var(--ink)]">
            {title}
        </h2>
        {copy ? <p className="max-w-3xl text-sm text-[var(--muted)]">{copy}</p> : null}
    </div>
)

const MetricCard = ({ label, value, note, accent = false }) => (
    <div
        className={`rounded-[28px] border p-5 ${
            accent
                ? 'border-transparent bg-[linear-gradient(180deg,rgba(18,50,57,0.98),rgba(11,93,87,0.94))] text-white shadow-[0_22px_60px_rgba(18,50,57,0.18)]'
                : 'border-[var(--line)] bg-white/80 text-[var(--ink)] shadow-[0_18px_45px_rgba(18,50,57,0.08)]'
        }`}>
        <p className={`text-xs uppercase tracking-[0.24em] ${accent ? 'text-white/68' : 'text-[var(--muted)]'}`}>
            {label}
        </p>
        <p className="mt-3 font-[var(--font-display)] text-4xl">{value}</p>
        <p className={`mt-3 text-sm ${accent ? 'text-white/78' : 'text-[var(--muted)]'}`}>{note}</p>
    </div>
)

const Dashboard = () => {
    const [activeRole, setActiveRole] = useState('teacher')
    const [activeTrack, setActiveTrack] = useState('primary')
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
            setTimeout(() => resolve(message), 650)
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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section
                id="dashboard-overview"
                className="overflow-hidden rounded-[36px] border border-white/70 bg-[rgba(255,252,246,0.82)] p-6 shadow-[0_28px_70px_rgba(18,50,57,0.12)] backdrop-blur sm:p-8">
                <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                        <div className="inline-flex rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
                            Live school operations workspace
                        </div>

                        <div className="space-y-4">
                            <h1 className="max-w-3xl font-[var(--font-display)] text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
                                One dashboard for class capture and leadership control.
                            </h1>
                            <p className="max-w-2xl text-base text-[var(--muted)] sm:text-lg">
                                Toggle between the teacher-facing attendance flow and the management-facing compliance layer while keeping the same unified data model underneath.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-[28px] border border-[var(--line)] bg-white/85 p-5">
                                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                    Role mode
                                </p>
                                <div className="mt-4 flex gap-2 rounded-full bg-[var(--canvas-deep)] p-1.5">
                                    {[
                                        ['teacher', 'Class Teacher'],
                                        ['management', 'Head Teacher / HOD'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            onClick={() => setActiveRole(value)}
                                            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                activeRole === value
                                                    ? 'bg-[var(--ink)] text-white'
                                                    : 'text-[var(--muted)]'
                                            }`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-[var(--line)] bg-white/85 p-5">
                                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                    School track
                                </p>
                                <div className="mt-4 flex gap-2 rounded-full bg-[var(--canvas-deep)] p-1.5">
                                    {[
                                        ['primary', 'Primary'],
                                        ['secondary', 'Secondary'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            onClick={() => setActiveTrack(value)}
                                            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                                                activeTrack === value
                                                    ? 'bg-[var(--signal)] text-white'
                                                    : 'text-[var(--muted)]'
                                            }`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <MetricCard
                            label="Active class"
                            value={activeSnapshot.className}
                            note={activeSnapshot.upcomingLabel}
                            accent
                        />
                        <MetricCard
                            label="Submission status"
                            value={activeTrack === 'primary' ? 'AM/PM' : '2/6'}
                            note={activeSnapshot.submissionLabel}
                        />
                        {activeSnapshot.metrics.slice(0, 2).map(metric => (
                            <MetricCard
                                key={metric.label}
                                label={metric.label}
                                value={metric.value}
                                note="Updated from the latest register snapshot."
                            />
                        ))}
                    </div>
                </div>
            </section>

            {activeRole === 'teacher' ? (
                <div className="mt-8 space-y-8">
                    <section id="register-center" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="Attendance Register"
                                title={
                                    activeTrack === 'primary'
                                        ? 'Capture AM/PM attendance in one grid'
                                        : 'Capture period attendance against timetable slots'
                                }
                                copy="These interactions mimic the same state transitions your axios-powered register payloads will use when wired to the Laravel API."
                            />

                            <div className="mt-6 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                        <tr>
                                            <th className="pb-4 pr-4">Student</th>
                                            <th className="pb-4 pr-4">Status</th>
                                            <th className="pb-4">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--line)]">
                                        {activeRegister.map(student => (
                                            <tr key={student.id}>
                                                <td className="py-4 pr-4 align-top">
                                                    <button
                                                        onClick={() =>
                                                            setSelectedStudent(current => ({
                                                                ...current,
                                                                [activeTrack]: student.id,
                                                            }))
                                                        }
                                                        className="text-left">
                                                        <p className="font-semibold text-[var(--ink)]">
                                                            {student.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[var(--muted)]">
                                                            Late: {student.counts.late} • Sick: {student.counts.sick} • Absent: {student.counts.absent}
                                                        </p>
                                                    </button>
                                                </td>
                                                <td className="py-4 pr-4 align-top">
                                                    <div className="flex flex-wrap gap-2">
                                                        {attendanceOptions.map(option => (
                                                            <button
                                                                key={option}
                                                                onClick={() =>
                                                                    updateAttendance(student.id, option)
                                                                }
                                                                className={`h-10 min-w-10 rounded-2xl border px-3 text-sm font-semibold transition ${
                                                                    student.status === option
                                                                        ? 'border-transparent bg-[var(--ink)] text-white'
                                                                        : 'border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]'
                                                                }`}>
                                                                {option}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-4 align-top">
                                                    <input
                                                        value={student.note}
                                                        onChange={event =>
                                                            updateNote(student.id, event.target.value)
                                                        }
                                                        placeholder="Add medical, meal, or context note"
                                                        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-[var(--canvas)]/80 p-5 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-[var(--ink)]">
                                        {registerStatus.message}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                                        Transport state: {registerStatus.tone}
                                    </p>
                                </div>
                                <button
                                    onClick={submitRegister}
                                    className="inline-flex items-center justify-center rounded-full bg-[var(--signal)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c46d05]">
                                    Submit {activeTrack === 'primary' ? 'daily' : 'period'} register
                                </button>
                            </div>
                        </div>

                        <div id="students" className="space-y-6">
                            <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                                <SectionHeading
                                    eyebrow="Student Profile Explorer"
                                    title={activeStudent.name}
                                    copy="High-level attendance history and pastoral context to support fast classroom decisions."
                                />

                                <div className="mt-6 grid gap-3">
                                    <MetricCard
                                        label="Late count"
                                        value={String(activeStudent.counts.late).padStart(2, '0')}
                                        note="Rolling four-week trend"
                                    />
                                    <MetricCard
                                        label="Sick count"
                                        value={String(activeStudent.counts.sick).padStart(2, '0')}
                                        note="Medical notes and health follow-up"
                                    />
                                    <MetricCard
                                        label="Absent count"
                                        value={String(activeStudent.counts.absent).padStart(2, '0')}
                                        note="Guardian or welfare escalation risk"
                                    />
                                </div>
                            </div>

                            <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,50,57,0.98),rgba(11,93,87,0.94))] p-6 text-white shadow-[0_24px_60px_rgba(18,50,57,0.16)]">
                                <p className="text-xs uppercase tracking-[0.24em] text-white/64">
                                    Today schedule
                                </p>
                                <div className="mt-5 space-y-3">
                                    {activeSnapshot.timetable.map(slot => (
                                        <div
                                            key={slot.join('-')}
                                            className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/8 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-semibold">{slot[1]}</p>
                                                <p className="text-xs text-white/70">{slot[2]}</p>
                                            </div>
                                            <p className="text-sm font-semibold text-white/82">
                                                {slot[0]}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="discipline" className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="Discipline Tracker"
                                title="Log conduct quickly without leaving the dashboard"
                                copy="Designed for fast teacher-side interventions that can later roll up into leadership-level behavior reporting."
                            />

                            <form onSubmit={submitDiscipline} className="mt-6 space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                                        Student
                                    </label>
                                    <div className="rounded-2xl border border-[var(--line)] bg-[var(--canvas)]/70 px-4 py-3 text-sm font-medium text-[var(--ink)]">
                                        {activeStudent.name}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                                        Incident type
                                    </label>
                                    <select
                                        value={disciplineEntry.incident}
                                        onChange={event =>
                                            setDisciplineEntry(current => ({
                                                ...current,
                                                incident: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]">
                                        <option>Late arrival</option>
                                        <option>Uniform issue</option>
                                        <option>Missed prep task</option>
                                        <option>Disruptive conduct</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                                        Incident notes
                                    </label>
                                    <textarea
                                        value={disciplineEntry.note}
                                        onChange={event =>
                                            setDisciplineEntry(current => ({
                                                ...current,
                                                note: event.target.value,
                                            }))
                                        }
                                        rows={4}
                                        placeholder="Describe the incident, assigned detention, or guardian action."
                                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]">
                                    Log discipline entry
                                </button>
                            </form>

                            <p className="mt-4 text-sm text-[var(--muted)]">
                                {disciplineStatus}
                            </p>
                        </div>

                        <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="Teacher Highlights"
                                title="Context blocks teachers can act on immediately"
                                copy="Focused cards for upcoming lessons, missing submissions, and special-case notes that need follow-up."
                            />

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {activeSnapshot.metrics.map(metric => (
                                    <MetricCard
                                        key={metric.label}
                                        label={metric.label}
                                        value={metric.value}
                                        note="Current active class snapshot"
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            ) : (
                <div className="mt-8 space-y-8">
                    <section className="grid gap-4 md:grid-cols-3">
                        {managementMetrics[activeTrack].map((metric, index) => (
                            <MetricCard
                                key={metric.label}
                                label={metric.label}
                                value={metric.value}
                                note={metric.note}
                                accent={index === 0}
                            />
                        ))}
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="Alerts & Escalations"
                                title="Critical items that leadership should not miss"
                                copy="Incoming flags from register completion, chronic absenteeism, and financial variance rules."
                            />

                            <div className="mt-6 space-y-4">
                                {alertFeed.map(alert => (
                                    <div
                                        key={alert.title}
                                        className="rounded-[28px] border border-[var(--line)] bg-[var(--panel-strong)] p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-base font-semibold text-[var(--ink)]">
                                                    {alert.title}
                                                </p>
                                                <p className="mt-2 text-sm text-[var(--muted)]">
                                                    {alert.detail}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                                                {alert.severity}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div id="timetable" className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="Timetable Management Center"
                                title="Create, edit, and review class allocations"
                                copy="A scheduling surface ready for CRUD-backed forms that define sections, subjects, staff, and time slots."
                            />

                            <div className="mt-6 grid gap-4">
                                {activeSnapshot.timetable.map(slot => (
                                    <div
                                        key={slot.join('-')}
                                        className="grid gap-3 rounded-[28px] border border-[var(--line)] bg-[var(--canvas)]/75 p-4 md:grid-cols-[110px_1fr_140px] md:items-center">
                                        <p className="text-sm font-semibold text-[var(--ink)]">
                                            {slot[0]}
                                        </p>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--ink)]">
                                                {slot[1]}
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                                {slot[2]}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 md:justify-end">
                                            <button className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)]">
                                                Edit
                                            </button>
                                            <button className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)]">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-white">
                                    Create slot
                                </button>
                                <button className="rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]">
                                    Publish revision
                                </button>
                            </div>
                        </div>
                    </section>

                    <section id="finance" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="School Financial Ledger"
                                title="Searchable account picture by student"
                                copy="Fee visibility aligned to student records so leadership can combine attendance, welfare, and finance follow-up from one workspace."
                            />

                            <div className="mt-6 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                        <tr>
                                            <th className="pb-4 pr-4">Student</th>
                                            <th className="pb-4 pr-4">Class</th>
                                            <th className="pb-4 pr-4">Invoiced</th>
                                            <th className="pb-4 pr-4">Paid</th>
                                            <th className="pb-4">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--line)]">
                                        {ledgerRows.map(row => (
                                            <tr key={row.student}>
                                                <td className="py-4 pr-4 font-semibold text-[var(--ink)]">
                                                    {row.student}
                                                </td>
                                                <td className="py-4 pr-4 text-[var(--muted)]">
                                                    {row.className}
                                                </td>
                                                <td className="py-4 pr-4 text-[var(--muted)]">
                                                    {row.invoiced}
                                                </td>
                                                <td className="py-4 pr-4 text-[var(--muted)]">
                                                    {row.paid}
                                                </td>
                                                <td className="py-4 font-semibold text-[var(--danger)]">
                                                    {row.balance}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                            <SectionHeading
                                eyebrow="Payment Capture"
                                title="Record a payment against a student"
                                copy="Mock state mirrors the success and error transitions you will later wire to secured payment endpoints."
                            />

                            <form onSubmit={submitPayment} className="mt-6 space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                                        Student
                                    </label>
                                    <select
                                        value={paymentEntry.student}
                                        onChange={event =>
                                            setPaymentEntry(current => ({
                                                ...current,
                                                student: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]">
                                        {ledgerRows.map(row => (
                                            <option key={row.student}>{row.student}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                                        Amount received
                                    </label>
                                    <input
                                        value={paymentEntry.amount}
                                        onChange={event =>
                                            setPaymentEntry(current => ({
                                                ...current,
                                                amount: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                                        Method
                                    </label>
                                    <select
                                        value={paymentEntry.method}
                                        onChange={event =>
                                            setPaymentEntry(current => ({
                                                ...current,
                                                method: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(15,118,110,0.12)]">
                                        <option>Bank transfer</option>
                                        <option>Cash office</option>
                                        <option>Mobile money</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="rounded-full bg-[var(--signal)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#c46d05]">
                                    Record payment
                                </button>
                            </form>

                            <p className="mt-4 text-sm text-[var(--muted)]">
                                {paymentStatus}
                            </p>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

export default Dashboard
