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
    const [schoolId, setSchoolId] = useState('')
    const [schoolName, setSchoolName] = useState('')
    const [schoolTrack, setSchoolTrack] = useState('')
    const [assignedClassName, setAssignedClassName] = useState('')
    const [registrationOptions, setRegistrationOptions] = useState({
        schools: [],
        tracks: {},
        classesByTrack: {},
        availableClassesByTrack: {},
        takenClassesByTrackBySchool: {},
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
                    schools: response.data?.schools ?? [],
                    tracks: response.data?.tracks ?? {},
                    classesByTrack: response.data?.classesByTrack ?? {},
                    availableClassesByTrack:
                        response.data?.availableClassesByTrack ?? {},
                    takenClassesByTrackBySchool:
                        response.data?.takenClassesByTrackBySchool ?? {},
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

    const matchingExistingSchool = registrationOptions.schools.find(
        option =>
            option.label.trim().toLowerCase() ===
            schoolName.trim().toLowerCase(),
    )
    const effectiveSchoolId = schoolId || matchingExistingSchool?.value || ''
    const takenClassesForSelectedSchool =
        effectiveSchoolId === ''
            ? { primary: [], secondary: [] }
            : registrationOptions.takenClassesByTrackBySchool?.[
                  effectiveSchoolId
              ] ?? { primary: [], secondary: [] }
    const availableClasses = schoolTrack
        ? (registrationOptions.classesByTrack?.[schoolTrack] ?? []).filter(
              className =>
                  !(
                      takenClassesForSelectedSchool?.[schoolTrack] ?? []
                  ).includes(className),
          )
        : []
    const showClassPicker = schoolTrack !== ''
    const requiresClassSelection = schoolTrack === 'primary'

    const submitForm = event => {
        event.preventDefault()

        register({
            name,
            email,
            school_id: schoolId,
            school_name: schoolName,
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
                    New self-registrations create teacher accounts. Start by
                    choosing the school you work for, then choose whether you
                    belong to the primary or secondary section and set your
                    class responsibility. Primary teachers must choose one
                    class. Secondary teachers can register as subject teachers
                    with no form class, or optionally claim one form class.
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
                    <Label htmlFor="schoolId">School</Label>

                    <select
                        id="schoolId"
                        value={schoolId}
                        onChange={event => {
                            setSchoolId(event.target.value)
                            setSchoolName('')
                            setAssignedClassName('')
                        }}
                        className="block w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                        required={schoolName.trim() === ''}>
                        <option value="">Select a school</option>
                        {registrationOptions.schools.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    <InputError messages={errors.school_id} className="mt-2" />
                </div>

                <div className="mt-4">
                    <Label htmlFor="schoolName">New School Name</Label>

                    <Input
                        id="schoolName"
                        type="text"
                        value={schoolName}
                        className="block mt-1 w-full"
                        onChange={event => {
                            setSchoolName(event.target.value)
                            setSchoolId('')
                            setAssignedClassName('')
                        }}
                        placeholder="Enter a new school if it is not listed"
                    />

                    <p className="mt-2 text-sm text-[var(--muted)]">
                        Leave this blank if your school is already listed above.
                    </p>

                    <InputError messages={errors.school_name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <Label>Responsible For:</Label>

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
                        <Label htmlFor="assignedClassName">
                            {requiresClassSelection
                                ? 'Class'
                                : 'Form Class (Optional)'}
                        </Label>

                        <select
                            id="assignedClassName"
                            value={assignedClassName}
                            onChange={event =>
                                setAssignedClassName(event.target.value)
                            }
                            className="block w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-field)] px-4 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--focus-ring)]"
                            required={requiresClassSelection}>
                            <option value="">
                                {requiresClassSelection
                                    ? 'Select your class'
                                    : 'Register as a subject teacher only'}
                            </option>
                            {availableClasses.map(className => (
                                <option key={className} value={className}>
                                    {className}
                                </option>
                            ))}
                        </select>

                        {availableClasses.length === 0 && requiresClassSelection ? (
                            <p className="mt-2 text-sm text-[var(--muted)]">
                                No unassigned classes are available in this
                                school section right now. Ask the administrator
                                to set up a class for you.
                            </p>
                        ) : null}

                        {!requiresClassSelection ? (
                            <p className="mt-2 text-sm text-[var(--muted)]">
                                Leave this blank if you only teach subjects and
                                do not need form-teacher responsibility yet.
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
                            (schoolId === '' && schoolName.trim() === '') ||
                            schoolTrack === '' ||
                            (requiresClassSelection && assignedClassName === '')
                        }>
                        Register
                    </Button>
                </div>
            </form>
        </>
    )
}

export default Page
