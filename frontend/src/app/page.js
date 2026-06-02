import Link from 'next/link'
import LoginLinks from '@/app/LoginLinks'

const tracks = [
    {
        title: 'Primary track',
        description:
            'Daily registers optimized for AM and PM attendance, class ownership, and pastoral follow-up.',
        points: ['AM/PM split registers', 'Meal and medical notes', 'Homeroom completion snapshots'],
    },
    {
        title: 'Secondary track',
        description:
            'Period-aware attendance tied to subject timetables, teacher allocation, and escalation thresholds.',
        points: ['Period-by-period capture', 'Subject and staff cross-reference', 'Missed-register compliance tracking'],
    },
]

const roleCards = [
    {
        role: 'Class Teacher',
        heading: 'Run attendance, student context, and discipline from one screen',
        copy: 'Fast roster actions, profile drill-downs, and incident logging keep classroom administration moving even on crowded tablets.',
    },
    {
        role: 'Head Teacher / HOD',
        heading: 'Review completion, timetable quality, and financial pressure live',
        copy: 'A leadership layer focused on compliance heatmaps, payment position, and timetable control rather than manual report chasing.',
    },
]

const workflowSteps = [
    'Select school track and active class allocation.',
    'Capture register status with one-tap controls and attach exceptions as notes.',
    'Submit to the backend logic engine for validation, compliance counting, and analytics refresh.',
]

const Home = () => {
    return (
        <div className="relative overflow-hidden">
            <LoginLinks />

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-28">
                <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                    <div className="space-y-8">
                        <div className="inline-flex rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)] shadow-sm backdrop-blur">
                            K-12 digital registering and school operations
                        </div>

                        <div className="space-y-5">
                            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl leading-[0.94] text-balance text-[var(--ink)] sm:text-6xl lg:text-7xl">
                                Attendance first. Leadership visibility built
                                in.
                            </h1>
                            <p className="max-w-2xl text-lg text-[var(--muted)] sm:text-xl">
                                Beacon School OS unifies primary and secondary
                                attendance flows, student insight, discipline,
                                timetable control, and fee tracking in one fast
                                headless interface.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(18,50,57,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]">
                                Create staff account
                            </Link>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--ink)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]">
                                Preview workspace
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-x-10 top-8 h-56 rounded-full bg-[rgba(15,118,110,0.14)] blur-3xl" />
                        <div className="relative overflow-hidden rounded-[36px] border border-white/60 bg-[rgba(255,252,246,0.82)] p-6 shadow-[0_30px_80px_rgba(18,50,57,0.14)] backdrop-blur sm:p-8">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[
                                    {
                                        label: 'Today',
                                        value: '92.4%',
                                        note: 'Register completion across all tracked classes',
                                    },
                                    {
                                        label: 'Escalations',
                                        value: '07',
                                        note: 'Late chronic absence or missing submission alerts',
                                    },
                                    {
                                        label: 'Outstanding',
                                        value: 'MWK 4.8M',
                                        note: 'Live tuition balance awaiting follow-up',
                                    },
                                    {
                                        label: 'Timetable load',
                                        value: '116',
                                        note: 'Scheduled lessons mapped to staff and sections',
                                    },
                                ].map(item => (
                                    <div
                                        key={item.label}
                                        className="rounded-3xl border border-[var(--line)] bg-white/78 p-5">
                                        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                            {item.label}
                                        </p>
                                        <p className="mt-3 font-[var(--font-display)] text-4xl text-[var(--ink)]">
                                            {item.value}
                                        </p>
                                        <p className="mt-3 text-sm text-[var(--muted)]">
                                            {item.note}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-16 grid gap-6 lg:grid-cols-2">
                    {roleCards.map(card => (
                        <div
                            key={card.role}
                            className="rounded-[32px] border border-[var(--line)] bg-[rgba(255,252,246,0.72)] p-7 shadow-[0_18px_45px_rgba(18,50,57,0.08)] backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--signal)]">
                                {card.role}
                            </p>
                            <h2 className="mt-4 font-[var(--font-display)] text-3xl text-[var(--ink)]">
                                {card.heading}
                            </h2>
                            <p className="mt-4 max-w-2xl text-[var(--muted)]">
                                {card.copy}
                            </p>
                        </div>
                    ))}
                </section>

                <section className="mt-16 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(18,50,57,0.98),rgba(11,93,87,0.94))] p-8 text-white shadow-[0_28px_65px_rgba(18,50,57,0.16)]">
                        <p className="text-xs uppercase tracking-[0.28em] text-white/68">
                            Submission workflow
                        </p>
                        <h2 className="mt-4 max-w-lg font-[var(--font-display)] text-3xl text-balance">
                            Every UI action points cleanly to an API-backed
                            system logic engine.
                        </h2>

                        <div className="mt-8 space-y-4">
                            {workflowSteps.map((step, index) => (
                                <div
                                    key={step}
                                    className="flex gap-4 rounded-3xl border border-white/12 bg-white/8 p-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/14 text-sm font-semibold">
                                        0{index + 1}
                                    </div>
                                    <p className="text-sm text-white/84">
                                        {step}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {tracks.map(track => (
                            <div
                                key={track.title}
                                className="rounded-[32px] border border-[var(--line)] bg-white/76 p-7 shadow-[0_18px_45px_rgba(18,50,57,0.08)]">
                                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                                    Structural split
                                </p>
                                <h3 className="mt-3 font-[var(--font-display)] text-2xl text-[var(--ink)]">
                                    {track.title}
                                </h3>
                                <p className="mt-4 text-sm text-[var(--muted)]">
                                    {track.description}
                                </p>
                                <div className="mt-6 space-y-3">
                                    {track.points.map(point => (
                                        <div
                                            key={point}
                                            className="rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)]/45 px-4 py-3 text-sm font-medium text-[var(--ink)]">
                                            {point}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Home
