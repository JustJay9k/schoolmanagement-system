'use client'

import Link from 'next/link'
import LoginLinks from '@/app/LoginLinks'
import LandingFooter from '@/app/LandingFooter'

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

const aboutFeatures = [
    {
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
        ),
        title: 'Built for trust',
        description: 'Role-based access, audit trails, and data isolation give administrators confidence that sensitive student information stays protected.',
    },
    {
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
        ),
        title: 'Real-time analytics',
        description: 'Live dashboards surface attendance completion rates, chronic-absence patterns, and financial positions without manual report generation.',
    },
    {
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: 'One-tap speed',
        description: 'Optimized interfaces let teachers capture registers, log incidents, and submit data in seconds — even on low-bandwidth connections.',
    },
    {
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-4.179 2.25m0 0L12 17.25l-5.571-3m11.142 0l4.179 2.25L12 21.75l-9.75-5.25 4.179-2.25" />
            </svg>
        ),
        title: 'Scalable architecture',
        description: 'A headless API-first design means PCMS adapts to single-campus primaries and multi-site secondary networks alike.',
    },
]

const pricingTiers = [
    {
        name: 'Starter',
        price: 'Free',
        period: '',
        description: 'Perfect for small schools getting started with digital class management.',
        features: [
            'Up to 200 students',
            'Basic attendance tracking',
            'Single campus',
            'Email support',
            'Core reporting',
        ],
        cta: 'Get started free',
        highlighted: false,
    },
    {
        name: 'Professional',
        price: 'MWK 45,000',
        period: '/ month',
        description: 'For growing schools that need full operational visibility and control.',
        features: [
            'Up to 2,000 students',
            'Full attendance + discipline',
            'Timetable management',
            'Fee tracking & invoicing',
            'Priority support',
            'Advanced analytics',
        ],
        cta: 'Start free trial',
        highlighted: true,
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'Multi-site networks with dedicated support, SLAs, and custom integrations.',
        features: [
            'Unlimited students',
            'Multi-campus support',
            'Custom API integrations',
            'Dedicated account manager',
            'On-premise option',
            'Custom training',
        ],
        cta: 'Contact sales',
        highlighted: false,
    },
]

const Home = () => {
    return (
        <div className="relative overflow-hidden">
            <LoginLinks />

            {/* ═══════════════ HERO ═══════════════ */}
            <div id="hero" className="relative bg-cover bg-center scroll-mt-16" style={{ backgroundImage: "url('/images/schoolclassroom.jpg')" }}>
                <div className="absolute inset-0 bg-black/50" />
                <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-32 relative z-10 text-white">
                <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                    <div className="space-y-8">
                        <div className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-sm backdrop-blur">
                            K-12 digital registering and school operations
                        </div>

                        <div className="space-y-5">
                            <h1 className="max-w-4xl font-[var(--font-display)] text-5xl leading-[0.94] sm:text-6xl lg:text-7xl text-white">
                                Attendance first. Leadership visibility built
                                in.
                            </h1>
                            <p className="max-w-2xl text-lg text-white/90 sm:text-xl">
                                Phunziro Class Management System (PCMS) unifies primary and secondary
                                attendance flows, student insight, discipline,
                                timetable control, and fee tracking in one fast
                                headless interface.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_18px_45px_var(--shadow-strong)] transition hover:-translate-y-0.5 hover:brightness-105">
                                Create staff account
                            </Link>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/16 hover:text-white">
                                Get Started
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-x-10 top-8 h-56 rounded-full bg-[rgba(var(--accent-rgb),0.14)] blur-3xl" />
                        <div className="relative overflow-hidden rounded-[36px] border border-[var(--line)] bg-[var(--surface-card)] p-6 shadow-[0_30px_80px_var(--shadow-strong)] backdrop-blur sm:p-8">
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
                                        tabIndex={0}
                                        className="rounded-3xl border border-[var(--line)] bg-[var(--surface-raised)] p-5 transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-105 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">
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
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
                {/* ═══════════════ ROLE CARDS ═══════════════ */}
                <section className="mt-16 grid gap-6 lg:grid-cols-2">
                    {roleCards.map(card => (
                        <div
                            key={card.role}
                            tabIndex={0}
                            className="rounded-[32px] border border-[var(--line)] bg-[var(--surface-card)] p-7 shadow-[0_18px_45px_var(--shadow-soft)] backdrop-blur transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-[0_30px_80px_var(--shadow-strong)] hover:border-[var(--accent)] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">
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

                {/* ═══════════════ WORKFLOW + TRACKS ═══════════════ */}
                <section className="mt-16 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] p-8 text-[var(--accent-contrast)] shadow-[0_28px_65px_var(--shadow-strong)]">
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
                                    tabIndex={0}
                                    className="flex gap-4 rounded-3xl border border-white/12 bg-white/8 p-4 transition-transform duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:scale-105 cursor-pointer focus:outline-none focus:ring-4 focus:ring-white/10">
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
                                tabIndex={0}
                                className="rounded-[32px] border border-[var(--line)] bg-[var(--surface-raised)] p-7 shadow-[0_18px_45px_var(--shadow-soft)] transition-transform duration-200 ease-out transform-gpu hover:-translate-y-1 hover:scale-105 hover:shadow-[0_30px_80px_var(--shadow-strong)] hover:border-[var(--accent)] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]">
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

            {/* ═══════════════ ABOUT ═══════════════ */}
            <section id="about" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--surface-card)]/40 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                            About PCMS
                        </p>
                        <h2 className="mt-4 font-[var(--font-display)] text-4xl text-[var(--ink)] sm:text-5xl">
                            Purpose-built for Malawian schools
                        </h2>
                        <p className="mt-5 text-[var(--muted)] sm:text-lg">
                            PCMS was designed from the ground up for the realities of K-12 education —
                            unreliable connectivity, shared devices, multi-role staff, and compliance
                            pressure. Every screen, every flow, every report serves the classroom first.
                        </p>
                    </div>

                    <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {aboutFeatures.map(feature => (
                            <div
                                key={feature.title}
                                className="group rounded-[28px] border border-[var(--line)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_32px_var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_24px_56px_var(--shadow-strong)]">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-tint)] text-[var(--accent)] transition-colors duration-300 group-hover:bg-[var(--surface-tint-strong)]">
                                    {feature.icon}
                                </div>
                                <h3 className="mt-5 font-[var(--font-display)] text-lg font-semibold text-[var(--ink)]">
                                    {feature.title}
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ PRICING ═══════════════ */}
            <section id="pricing" className="scroll-mt-20">
                <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                            Pricing
                        </p>
                        <h2 className="mt-4 font-[var(--font-display)] text-4xl text-[var(--ink)] sm:text-5xl">
                            Plans that grow with your school
                        </h2>
                        <p className="mt-5 text-[var(--muted)] sm:text-lg">
                            Start free. Upgrade when you need timetable control, financial tracking,
                            and multi-campus support.
                        </p>
                    </div>

                    <div className="mt-16 grid gap-6 lg:grid-cols-3">
                        {pricingTiers.map(tier => (
                            <div
                                key={tier.name}
                                className={`relative flex flex-col rounded-[32px] border p-8 shadow-[0_18px_45px_var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_var(--shadow-strong)] ${
                                    tier.highlighted
                                        ? 'border-[var(--accent)] bg-[var(--surface-card-strong)] ring-1 ring-[var(--accent)]/20'
                                        : 'border-[var(--line)] bg-[var(--surface-card)]'
                                }`}>
                                {tier.highlighted && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-4 py-1 text-xs font-semibold text-[var(--accent-contrast)] shadow-[0_4px_16px_var(--shadow-strong)]">
                                        Most popular
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                                        {tier.name}
                                    </p>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="font-[var(--font-display)] text-4xl font-bold text-[var(--ink)]">
                                            {tier.price}
                                        </span>
                                        {tier.period && (
                                            <span className="text-sm text-[var(--muted)]">
                                                {tier.period}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-4 text-sm text-[var(--muted)]">
                                        {tier.description}
                                    </p>
                                </div>

                                <div className="mt-8 h-px bg-[var(--line)]" />

                                <ul className="mt-8 flex-1 space-y-4">
                                    {tier.features.map(feature => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-3 text-sm text-[var(--ink)]">
                                            <svg
                                                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2.5}>
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M4.5 12.75l6 6 9-13.5"
                                                />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href={tier.highlighted ? '/register' : '#contact'}
                                    className={`mt-8 block rounded-full px-6 py-3 text-center text-sm font-semibold transition hover:-translate-y-0.5 ${
                                        tier.highlighted
                                            ? 'bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] text-[var(--accent-contrast)] shadow-[0_18px_45px_var(--shadow-strong)] hover:brightness-105'
                                            : 'border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                                    }`}>
                                    {tier.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════ CONTACT ═══════════════ */}
            <section id="contact" className="scroll-mt-20 border-t border-[var(--line)] bg-[var(--surface-card)]/40 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                    <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-start">
                        {/* Left – info */}
                        <div className="space-y-8">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                                    Contact us
                                </p>
                                <h2 className="mt-4 font-[var(--font-display)] text-4xl text-[var(--ink)] sm:text-5xl">
                                    Get in touch
                                </h2>
                                <p className="mt-5 max-w-md text-[var(--muted)]">
                                    Have questions about PCMS, need a demo, or want to discuss
                                    enterprise pricing? We&apos;d love to hear from you.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    {
                                        icon: (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                            </svg>
                                        ),
                                        label: 'support@pcms.mw',
                                    },
                                    {
                                        icon: (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                            </svg>
                                        ),
                                        label: '+265 999 123 456',
                                    },
                                    {
                                        icon: (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                            </svg>
                                        ),
                                        label: 'Lilongwe, Malawi',
                                    },
                                ].map(item => (
                                    <div
                                        key={item.label}
                                        className="flex items-center gap-4 text-sm text-[var(--muted)]">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-tint)] text-[var(--accent)]">
                                            {item.icon}
                                        </div>
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right – form */}
                        <div className="rounded-[32px] border border-[var(--line)] bg-[var(--surface-card-strong)] p-8 shadow-[0_18px_45px_var(--shadow-soft)]">
                            <form
                                onSubmit={e => e.preventDefault()}
                                className="space-y-6">
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="contact-first"
                                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                            First name
                                        </label>
                                        <input
                                            id="contact-first"
                                            type="text"
                                            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                                            placeholder="Jane"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="contact-last"
                                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                            Last name
                                        </label>
                                        <input
                                            id="contact-last"
                                            type="text"
                                            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                                            placeholder="Mbewe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="contact-email"
                                        className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                        Email
                                    </label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                                        placeholder="jane@school.mw"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="contact-message"
                                        className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                                        Message
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        rows={5}
                                        className="w-full resize-none rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                                        placeholder="Tell us about your school and what you need…"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full rounded-full bg-[linear-gradient(180deg,var(--accent),var(--accent-strong))] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] shadow-[0_18px_45px_var(--shadow-strong)] transition hover:-translate-y-0.5 hover:brightness-105">
                                    Send message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <LandingFooter />
        </div>
    )
}

export default Home
