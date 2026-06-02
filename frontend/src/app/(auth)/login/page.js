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

const LoginContent = () => {
    const searchParams = useSearchParams()

    const { login } = useAuth({
        middleware: 'guest',
        redirectIfAuthenticated: '/dashboard',
    })

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [shouldRemember, setShouldRemember] = useState(false)
    const [errors, setErrors] = useState([])
    const [status, setStatus] = useState(null)

    useEffect(() => {
        const resetStatus = searchParams.get('reset')

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
                    <h2 className={styles.title}>Welcome back to Beacon School OS</h2>
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
                        placeholder="teacher@beaconacademy.edu"
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

                    <Input
                        id="password"
                        type="password"
                        value={password}
                        className={styles.input}
                        onChange={event => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                    />

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
