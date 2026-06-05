'use client'

import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import Label from '@/components/Label'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthSessionStatus from '@/app/(auth)/AuthSessionStatus'
import styles from './login.module.css'

const trustSignals = [
    'Daily attendance capture for primary and secondary tracks',
    'Secure staff access tied to Sanctum-backed sessions',
    'Fast recovery path for password reset and account support',
]

const EyeIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.eyeIcon}>
        <path d="M12 5c-5.5 0-9.6 4.4-11 7 1.4 2.6 5.5 7 11 7s9.6-4.4 11-7c-1.4-2.6-5.5-7-11-7Zm0 11c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4Zm0-6.5A2.5 2.5 0 1 0 12 15a2.5 2.5 0 0 0 0-5Z" />
    </svg>
)

const EyeOffIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.eyeIcon}>
        <path d="m2.1 4.7 1.4-1.4L20.7 20.5l-1.4 1.4-3-3c-1.3.6-2.8 1-4.3 1-5.5 0-9.6-4.4-11-7 .8-1.4 2.2-3.2 4.1-4.8l-3-3.4Zm5.6 5.6A4.9 4.9 0 0 0 7 12c1.4 2.6 3.8 5 5 5 .9 0 1.8-.2 2.7-.5l-1.7-1.7A4 4 0 0 1 10.2 10L7.7 7.6Zm2.7-2.7A8.6 8.6 0 0 1 12 9.5a2.5 2.5 0 0 1 2.5 2.5 2.6 2.6 0 0 1-.4 1.3l2 2c1.8-1.3 3-3 3.7-4.3-1.4-2.6-5.5-7-11-7a10 10 0 0 0-2.4.3Z" />
    </svg>
)

const LoginContent = () => {
    const searchParams = useSearchParams()

    const { login } = useAuth({
        middleware: 'guest',
        redirectIfAuthenticated: '/dashboard',
    })

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [shouldRemember, setShouldRemember] = useState(false)
    const [errors, setErrors] = useState([])
    const [status, setStatus] = useState(null)

    useEffect(() => {
        const resetStatus = searchParams.get('reset')
        const verified = searchParams.get('verified')

        if (verified === '1' && errors.length === 0) {
            setStatus({
                type: 'success',
                message:
                    'Your email has been verified. Sign in to continue to your staff workspace.',
            })
            return
        }

        if (resetStatus && errors.length === 0) {
            setStatus(atob(resetStatus))
            return
        }

        setStatus(null)
    }, [errors.length, searchParams])

    const submitForm = async event => {
        event.preventDefault()

        login({
            email,
            password,
            remember: shouldRemember,
            setErrors,
            setStatus,
        })
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>Staff Login</p>
                    <h2 className={styles.title}>Welcome back to Phunziro Class Management System</h2>
                </div>
                <p className={styles.copy}>
                    Sign in to manage daily registers, review alerts, and keep
                    the school day moving without paper handoffs.
                </p>
            </div>

            <div className={styles.signalGrid}>
                {trustSignals.map(signal => (
                    <div key={signal} className={styles.signalCard}>
                        {signal}
                    </div>
                ))}
            </div>

            <AuthSessionStatus className={styles.status} status={status} />

            <form onSubmit={submitForm} className={styles.form}>
                <div className={styles.field}>
                    <Label htmlFor="email">Work Email</Label>

                    <Input
                        id="email"
                        type="email"
                        value={email}
                        className={styles.input}
                        onChange={event => setEmail(event.target.value)}
                        placeholder="teacher@pcms.school"
                        required
                        autoFocus
                    />

                    <InputError messages={errors.email} className="mt-2" />
                </div>

                <div className={styles.field}>
                    <div className={styles.passwordHeading}>
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password" className={styles.inlineLink}>
                            Forgot password?
                        </Link>
                    </div>

                    <div className={styles.passwordField}>
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            className={styles.passwordInput}
                            onChange={event => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                        />

                        <button
                            type="button"
                            className={styles.passwordToggle}
                            aria-pressed={showPassword}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            title={showPassword ? 'Hide password' : 'Show password'}
                            onClick={() => setShowPassword(current => !current)}
                        >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>

                    <InputError messages={errors.password} className="mt-2" />
                </div>

                <label htmlFor="remember_me" className={styles.rememberRow}>
                    <input
                        id="remember_me"
                        type="checkbox"
                        name="remember"
                        className={styles.checkbox}
                        checked={shouldRemember}
                        onChange={event =>
                            setShouldRemember(event.target.checked)
                        }
                    />

                    <span>
                        Keep me signed in on this device
                    </span>
                </label>

                <div className={styles.actions}>
                    <p className={styles.helperText}>
                        Need a new staff account? Ask an administrator to create
                        or verify your access.
                    </p>

                    <Button className={styles.submitButton}>Enter workspace</Button>
                </div>
            </form>
        </div>
    )
}

const Login = () => {
    return (
        <Suspense fallback={<div className={styles.loadingState}>Loading sign-in options...</div>}>
            <LoginContent />
        </Suspense>
    )
}

export default Login
