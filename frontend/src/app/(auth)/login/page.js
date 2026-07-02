'use client'

import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import Label from '@/components/Label'
import PasswordInput from '@/components/PasswordInput'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthSessionStatus from '@/app/(auth)/AuthSessionStatus'
import styles from './login.module.css'

const trustSignals = [
    'Daily attendance capture for primary and secondary tracks',
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

    const handleFormKeyDown = event => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
            return
        }

        if (event.target.tagName !== 'INPUT' || event.target.type === 'checkbox') {
            return
        }

        event.preventDefault()
        event.currentTarget.requestSubmit()
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

            <form
                onSubmit={submitForm}
                onKeyDown={handleFormKeyDown}
                className={styles.form}>
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
                        <PasswordInput
                            id="password"
                            value={password}
                            className={styles.passwordInput}
                            onChange={event => setPassword(event.target.value)}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                        />
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
                        Don&apos;t have an account yet? Create one here or ask an
                        administrator to verify your access if you run into any
                        approval issues.
                    </p>

                    <div className={styles.actionRow}>
                        <Button className={styles.submitButton}>Enter workspace</Button>
                        <Link href="/register" className={styles.secondaryAction}>
                            Create account
                        </Link>
                    </div>
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
