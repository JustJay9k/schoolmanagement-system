'use client'

import { useState } from 'react'

const EyeIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[1.1rem] w-[1.1rem] fill-current">
        <path d="M12 5c-5.5 0-9.6 4.4-11 7 1.4 2.6 5.5 7 11 7s9.6-4.4 11-7c-1.4-2.6-5.5-7-11-7Zm0 11c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4Zm0-6.5A2.5 2.5 0 1 0 12 15a2.5 2.5 0 0 0 0-5Z" />
    </svg>
)

const EyeOffIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[1.1rem] w-[1.1rem] fill-current">
        <path d="m2.1 4.7 1.4-1.4L20.7 20.5l-1.4 1.4-3-3c-1.3.6-2.8 1-4.3 1-5.5 0-9.6-4.4-11-7 .8-1.4 2.2-3.2 4.1-4.8l-3-3.4Zm5.6 5.6A4.9 4.9 0 0 0 7 12c1.4 2.6 3.8 5 5 5 .9 0 1.8-.2 2.7-.5l-1.7-1.7A4 4 0 0 1 10.2 10L7.7 7.6Zm2.7-2.7A8.6 8.6 0 0 1 12 9.5a2.5 2.5 0 0 1 2.5 2.5 2.6 2.6 0 0 1-.4 1.3l2 2c1.8-1.3 3-3 3.7-4.3-1.4-2.6-5.5-7-11-7a10 10 0 0 0-2.4.3Z" />
    </svg>
)

const PasswordInput = ({ disabled = false, className = '', ...props }) => {
    const [visible, setVisible] = useState(false)

    return (
        <div className="relative">
            <input
                {...props}
                type={visible ? 'text' : 'password'}
                disabled={disabled}
                className={`w-full rounded-[0.8rem] border border-[var(--line)] bg-[var(--surface-field)] px-3 py-2 pr-11 text-[0.84rem] text-[var(--ink)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
            />
            <button
                type="button"
                disabled={disabled}
                aria-pressed={visible}
                aria-label={visible ? 'Hide password' : 'Show password'}
                title={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible(current => !current)}
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-transparent text-[var(--signal)] transition hover:bg-[var(--surface-tint)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring-strong)] disabled:cursor-not-allowed disabled:opacity-60">
                {visible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
        </div>
    )
}

export default PasswordInput
