'use client'

import AuthSessionStatus from '@/app/(auth)/AuthSessionStatus'
import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import Label from '@/components/Label'
import PasswordInput from '@/components/PasswordInput'
import { useAuth } from '@/hooks/auth'
import axios from '@/lib/axios'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const Page = () => {
    const { register } = useAuth({
        middleware: 'guest',
        redirectIfAuthenticated: '/dashboard',
    })

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [accountType, setAccountType] = useState('teacher')
    const [schoolId, setSchoolId] = useState('')
    const [schoolName, setSchoolName] = useState('')
    const [schoolTrack, setSchoolTrack] = useState('')
    const [assignedClassName, setAssignedClassName] = useState('')
    const [childId, setChildId] = useState('')
    const [childSearch, setChildSearch] = useState('')
    const [childPickerOpen, setChildPickerOpen] = useState(false)
    const guardianSearchRef = useRef(null)
    const [registrationOptions, setRegistrationOptions] = useState({
        schools: [],
        tracks: {},
        classesByTrack: {},
        availableClassesByTrack: {},
        takenClassesByTrackBySchool: {},
        studentsBySchool: {},
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
                    studentsBySchool: response.data?.studentsBySchool ?? {},
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
    const isGuardianRegistration = accountType === 'guardian'
    const showClassPicker = !isGuardianRegistration && schoolTrack !== ''
    const requiresClassSelection =
        !isGuardianRegistration && schoolTrack === 'primary'
    const availableStudents =
        isGuardianRegistration && schoolId !== ''
            ? registrationOptions.studentsBySchool?.[schoolId] ?? []
            : []
    const filteredStudents = availableStudents.filter(student => {
        const query = childSearch.trim().toLowerCase()

        if (query === '') {
            return true
        }

        return [student.label, student.class_name, student.student_code]
            .filter(Boolean)
            .some(value => value.toLowerCase().includes(query))
    })

    useEffect(() => {
        const handleClickOutside = event => {
            if (!guardianSearchRef.current?.contains(event.target)) {
                setChildPickerOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const submitForm = event => {
        event.preventDefault()

        register({
            account_type: accountType,
            name,
            email,
            school_id: schoolId,
            school_name: schoolName,
            school_track: schoolTrack,
            assigned_class_name: assignedClassName,
            child_id: childId === '' ? null : Number(childId),
            child_name: childSearch,
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
                    {isGuardianRegistration
                        ? 'Guardian accounts must choose the existing school and type the learner name exactly as it appears in the student record. Once linked, the dashboard will show the learner profile, uploaded grades, and teacher comments.'
                        : 'New self-registrations create teacher accounts. Start by choosing the school you work for, then choose whether you belong to the primary or secondary section and set your class responsibility. Primary teachers must choose one class. Secondary teachers can register as subject teachers with no form class, or optionally claim one form class.'}
                </div>

                <div className="mb-4">
                    <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
                        Account Type
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAccountType('teacher')
                                setChildId('')
                                setChildSearch('')
                                setChildPickerOpen(false)
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition ${
                                accountType === 'teacher'
                                    ? 'border-[var(--accent)] bg-[var(--surface-tint)] text-[var(--ink)]'
                                    : 'border-[var(--line)] bg-[var(--surface-field)] text-[var(--muted)]'
                            }`}>
                            <span className="block font-semibold text-[var(--ink)]">
                                Teacher account
                            </span>
                            <span className="mt-1 block text-xs">
                                Registers, class tools, and learner grade entry.
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setAccountType('guardian')
                                setSchoolName('')
                                setSchoolTrack('')
                                setAssignedClassName('')
                                setChildId('')
                                setChildSearch('')
                            }}
                            className={`rounded-2xl border px-4 py-3 text-left text-sm shadow-sm transition ${
                                accountType === 'guardian'
                                    ? 'border-[var(--accent)] bg-[var(--surface-tint)] text-[var(--ink)]'
                                    : 'border-[var(--line)] bg-[var(--surface-field)] text-[var(--muted)]'
                            }`}>
                            <span className="block font-semibold text-[var(--ink)]">
                                Parent / Guardian
                            </span>
                            <span className="mt-1 block text-xs">
                                Link to one learner and review grades, comments, and notices.
                            </span>
                        </button>
                    </div>
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
                            setChildId('')
                            setChildSearch('')
                            setChildPickerOpen(false)
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

                {isGuardianRegistration ? (
                    <div className="mt-4">
                        <Label htmlFor="childSearch">Child Full Name</Label>

                        <div ref={guardianSearchRef} className="relative mt-1">
                            <Input
                                id="childSearch"
                                type="text"
                                value={childSearch}
                                className="block w-full"
                                onChange={event => {
                                    setChildSearch(event.target.value)
                                    setChildId('')
                                    setChildPickerOpen(true)
                                }}
                                onFocus={() => setChildPickerOpen(true)}
                                placeholder={
                                    schoolId === ''
                                        ? 'Choose a school first'
                                        : 'Search and select the learner'
                                }
                                required
                                disabled={schoolId === ''}
                                autoComplete="off"
                            />

                            {childPickerOpen && schoolId !== '' ? (
                                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-2 shadow-xl">
                                    {availableStudents.length === 0 ? (
                                        <p className="px-3 py-2 text-sm text-[var(--muted)]">
                                            No learners are saved for this school yet.
                                        </p>
                                    ) : filteredStudents.length === 0 ? (
                                        <p className="px-3 py-2 text-sm text-[var(--muted)]">
                                            No learner matches that search.
                                        </p>
                                    ) : (
                                        filteredStudents.slice(0, 12).map(student => (
                                            <button
                                                key={student.value}
                                                type="button"
                                                onMouseDown={event =>
                                                    event.preventDefault()
                                                }
                                                onClick={() => {
                                                    setChildId(student.value)
                                                    setChildSearch(student.label)
                                                    setChildPickerOpen(false)
                                                }}
                                                className="flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--surface-tint)]">
                                                <span className="font-semibold text-[var(--ink)]">
                                                    {student.label}
                                                </span>
                                                <span className="text-xs text-[var(--muted)]">
                                                    {student.class_name}
                                                    {student.student_code
                                                        ? ` | ${student.student_code}`
                                                        : ''}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <p className="mt-2 text-sm text-[var(--muted)]">
                            Guardians must choose an existing school, then search
                            and select the learner from the saved student list.
                        </p>

                        <InputError
                            messages={[
                                ...(errors.child_id ?? []),
                                ...(errors.child_name ?? []),
                            ]}
                            className="mt-2"
                        />
                    </div>
                ) : (
                    <>
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
                    </>
                )}

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

                    <PasswordInput
                        id="password"
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

                    <PasswordInput
                        id="passwordConfirmation"
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
                        className="underline text-sm text-[var(--muted)] transition hover:text-[var(--ink)]">
                        Already registered?
                    </Link>

                    <Button
                        className="ml-4"
                        disabled={
                            isLoadingOptions ||
                            (isGuardianRegistration
                                ? schoolId === ''
                                : schoolId === '' &&
                                  schoolName.trim() === '') ||
                            (isGuardianRegistration
                                ? childId === ''
                                : schoolTrack === '' ||
                                  (requiresClassSelection &&
                                      assignedClassName === ''))
                        }>
                        Register
                    </Button>
                </div>
            </form>
        </>
    )
}

export default Page
