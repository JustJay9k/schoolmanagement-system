'use client'

import AuthSessionStatus from '@/app/(auth)/AuthSessionStatus'
import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import Label from '@/components/Label'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const Page = () => {
    const { register } = useAuth({
        middleware: 'guest',
        redirectIfAuthenticated: '/dashboard',
    })

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [schoolTrack, setSchoolTrack] = useState('')
    const [assignedClassName, setAssignedClassName] = useState('')
    const [registrationOptions, setRegistrationOptions] = useState({
        tracks: {},
        availableClassesByTrack: {},
    })
    const [isLoadingOptions, setIsLoadingOptions] = useState(true)
    const [errors, setErrors] = useState([])
    const [status, setStatus] = useState(null)

    useEffect(() => {
        let isMounted = true

        const loadRegistrationOptions = async () => {
            try {
                const response = await axios.get('/register/options')

                if (!isMounted) {
                    return
                }

                setRegistrationOptions({
                    tracks: response.data?.tracks ?? {},
                    availableClassesByTrack:
                        response.data?.availableClassesByTrack ?? {},
                })
            } catch (error) {
                if (!isMounted) {
                    return
                }

                setStatus({
                    type: 'error',
                    message:
                        'Unable to load the available class list. Refresh the page and try again.',
                })
            } finally {
                if (isMounted) {
                    setIsLoadingOptions(false)
                }
            }
        }

        loadRegistrationOptions()

        return () => {
            isMounted = false
        }
    }, [])

    const availableClasses =
        registrationOptions.availableClassesByTrack?.[schoolTrack] ?? []
    const showClassPicker = schoolTrack !== ''

    const submitForm = event => {
        event.preventDefault()

        register({
            name,
            email,
            school_track: schoolTrack,
            assigned_class_name: assignedClassName,
            password,
            password_confirmation: passwordConfirmation,
            setErrors,
            setStatus,
        })
    }

    return (
        <>
            <AuthSessionStatus className="mb-4" status={status} />

            <form onSubmit={submitForm}>
                <div className="mb-5 rounded-3xl border border-[var(--line)] bg-[var(--surface-raised)] px-4 py-4 text-sm text-[var(--muted)] shadow-sm">
                    New self-registrations create teacher accounts. Choose
                    whether you belong to the primary or secondary section, then
                    claim the single class you will manage.
                </div>

                <div>
                    <Label htmlFor="name">Name</Label>

                    <Input
                        id="name"
                        type="text"
                        value={name}
                        className="block mt-1 w-full"
                        onChange={event => setName(event.target.value)}
                        required
                        autoFocus
                    />

                    <InputError messages={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <Label htmlFor="email">Email</Label>

                    <Input
                        id="email"
                        type="email"
                        value={email}
                        className="block mt-1 w-full"
                        onChange={event => setEmail(event.target.value)}
                        required
                    />

                    <InputError messages={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <Label>School Track</Label>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {Object.entries(registrationOptions.tracks).map(
                            ([trackValue, trackLabel]) => (
                                <label
                                    key={trackValue}
                                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]">
                                    <input
                                        type="radio"
                                        name="schoolTrack"
                                        value={trackValue}
                                        checked={schoolTrack === trackValue}
                                        onChange={event => {
                                            setSchoolTrack(event.target.value)
                                            setAssignedClassName('')
                                        }}
                                        className="mt-1 h-4 w-4 accent-[var(--accent)]"
                                    />
                                    <span className="grid gap-1">
                                        <span className="font-semibold">
                                            {trackLabel}
                                        </span>
                                        <span className="text-xs text-[var(--muted)]">
                                            Your dashboard and registers will be
                                            limited to this section only.
                                        </span>
                                    </span>
                                </label>
                            ),
                        )}
                    </div>

                    <InputError messages={errors.school_track} className="mt-2" />
                </div>

                {showClassPicker ? (
                    <div className="mt-4">
                        <Label htmlFor="assignedClassName">Class</Label>

                        <select
                            id="assignedClassName"
                            value={assignedClassName}
                            onChange={event =>
                                setAssignedClassName(event.target.value)
                            }
                            className="block w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                            required>
                            <option value="">Select your class</option>
                            {availableClasses.map(className => (
                                <option key={className} value={className}>
                                    {className}
                                </option>
                            ))}
                        </select>

                        {availableClasses.length === 0 ? (
                            <p className="mt-2 text-sm text-[var(--muted)]">
                                No unassigned classes are available in this
                                section right now. Ask the administrator to set
                                up a class for you.
                            </p>
                        ) : null}

                        <InputError
                            messages={errors.assigned_class_name}
                            className="mt-2"
                        />
                    </div>
                ) : null}

                <div className="mt-4">
                    <Label htmlFor="password">Password</Label>

                    <Input
                        id="password"
                        type="password"
                        value={password}
                        className="block mt-1 w-full"
                        onChange={event => setPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                    />

                    <InputError messages={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <Label htmlFor="passwordConfirmation">
                        Confirm Password
                    </Label>

                    <Input
                        id="passwordConfirmation"
                        type="password"
                        value={passwordConfirmation}
                        className="block mt-1 w-full"
                        onChange={event =>
                            setPasswordConfirmation(event.target.value)
                        }
                        required
                    />

                    <InputError
                        messages={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="flex items-center justify-end mt-4">
                    <Link
                        href="/login"
                        className="underline text-sm text-gray-600 hover:text-gray-900">
                        Already registered?
                    </Link>

                    <Button
                        className="ml-4"
                        disabled={
                            isLoadingOptions ||
                            schoolTrack === '' ||
                            assignedClassName === ''
                        }>
                        Register
                    </Button>
                </div>
            </form>
        </>
    )
}

export default Page
