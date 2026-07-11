import useSWR from 'swr'
import axios from '@/lib/axios'
import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()
    const params = useParams()
    const isLoggingOutRef = useRef(false)

    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')

    const apiUrl = path => {
        if (!backendUrl) return path
        return `${backendUrl}${path}`
    }

    const getToken = () => {
        if (typeof window === 'undefined') return null
        return localStorage.getItem('auth_token')
    }

    const setToken = token => {
        if (typeof window === 'undefined') return
        localStorage.setItem('auth_token', token)
    }

    const removeToken = () => {
        if (typeof window === 'undefined') return
        localStorage.removeItem('auth_token')
    }

    const authHeaders = () => {
        const token = getToken()

        return {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
    }

    const createStatus = (message, type = 'error') => ({ message, type })
    const getResponseStatus = error => error?.response?.status
    const getValidationErrors = error => error?.response?.data?.errors ?? []

    const getFirstErrorMessage = validationErrors =>
        Object.values(validationErrors).flat()[0]

    const getValidationSummary = validationErrors => {
        const emailErrors = validationErrors.email ?? []
        const passwordErrors = validationErrors.password ?? []
        const nameErrors = validationErrors.name ?? []
        const schoolErrors = validationErrors.school_id ?? []
        const schoolNameErrors = validationErrors.school_name ?? []
        const trackErrors = validationErrors.school_track ?? []
        const assignedClassErrors = validationErrors.assigned_class_name ?? []
        const childNameErrors = validationErrors.child_name ?? []
        const passwordConfirmationErrors =
            validationErrors.password_confirmation ?? []

        if (
            emailErrors.some(message =>
                message.toLowerCase().includes('already been taken'),
            )
        ) {
            return 'That email address is already registered. Sign in instead or use a different email.'
        }

        if (
            emailErrors.some(message =>
                message.toLowerCase().includes('credentials do not match'),
            )
        ) {
            return 'Those credentials do not match our records. Check your email and password and try again.'
        }

        if (passwordConfirmationErrors.length > 0) {
            return 'Password confirmation does not match. Re-enter the same password in both fields.'
        }

        if (passwordErrors.length > 0) return `Password issue: ${passwordErrors[0]}`
        if (schoolErrors.length > 0) return `School issue: ${schoolErrors[0]}`
        if (schoolNameErrors.length > 0) return `School issue: ${schoolNameErrors[0]}`
        if (trackErrors.length > 0) return `School track issue: ${trackErrors[0]}`
        if (assignedClassErrors.length > 0) return `Class assignment issue: ${assignedClassErrors[0]}`
        if (childNameErrors.length > 0) return `Learner lookup issue: ${childNameErrors[0]}`
        if (emailErrors.length > 0) return `Email issue: ${emailErrors[0]}`
        if (nameErrors.length > 0) return `Name issue: ${nameErrors[0]}`

        return getFirstErrorMessage(validationErrors)
            ? `Please review the highlighted fields. ${getFirstErrorMessage(validationErrors)}`
            : 'Please review the highlighted fields and try again.'
    }

    const getAuthFailureMessage = error => {
        const status = getResponseStatus(error)
        const responseMessage = error?.response?.data?.message

        if (responseMessage) return responseMessage

        if (status === 401) {
            return 'You are not logged in. Please sign in again.'
        }

        if (status === 403) {
            return 'You do not have permission to access this area.'
        }

        if (error?.response) {
            return 'Authentication request failed. Please try again.'
        }

        return `Unable to reach the authentication server at ${backendUrl ?? 'the configured backend'}. Check your backend URL and CORS configuration.`
    }

    const handleAuthError = (error, setErrors, setStatus) => {
        const status = getResponseStatus(error)

        if (status === 422) {
            const validationErrors = getValidationErrors(error)

            setErrors(validationErrors)
            setStatus?.(createStatus(getValidationSummary(validationErrors)))
            return
        }

        setStatus?.(createStatus(getAuthFailureMessage(error)))
    }

    const { data: user, error, mutate } = useSWR(
        getToken() ? '/api/user' : null,
        () =>
            axios
                .get(apiUrl('/api/user'), {
                    headers: authHeaders(),
                })
                .then(res => res.data)
                .catch(error => {
                    if (getResponseStatus(error) === 401) {
                        removeToken()
                    }

                    throw error
                }),
    )

    const register = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus?.(null)

        try {
            const response = await axios.post(apiUrl('/api/register'), props, {
                headers: {
                    Accept: 'application/json',
                },
            })

            if (response.data.token) {
                setToken(response.data.token)
            }

            await mutate()

            return true
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
            return false
        }
    }

    const login = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus(null)

        try {
            const response = await axios.post(apiUrl('/api/login'), props, {
                headers: {
                    Accept: 'application/json',
                },
            })

            setToken(response.data.token)

            await mutate()

            return true
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
            return false
        }
    }

    const forgotPassword = async ({ setErrors, setStatus, email }) => {
        setErrors([])
        setStatus(null)

        try {
            const response = await axios.post(
                apiUrl('/api/forgot-password'),
                { email },
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            )

            setStatus(response.data.status)
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
        }
    }

    const resetPassword = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus(null)

        try {
            const response = await axios.post(
                apiUrl('/api/reset-password'),
                {
                    token: params.token,
                    ...props,
                },
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            )

            router.push('/login?reset=' + btoa(response.data.status))
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
        }
    }

    const resendEmailVerification = ({ setStatus }) => {
        axios
            .post(
                apiUrl('/api/email/verification-notification'),
                {},
                {
                    headers: authHeaders(),
                },
            )
            .then(response =>
                setStatus(createStatus(response.data.status, 'success')),
            )
    }

    const logout = async () => {
        if (isLoggingOutRef.current) return

        isLoggingOutRef.current = true

        try {
            if (getToken()) {
                await axios.post(
                    apiUrl('/api/logout'),
                    {},
                    {
                        headers: authHeaders(),
                    },
                )
            }
        } catch (error) {
            // Ignore logout API errors. We still remove the local token.
        }

        removeToken()
        await mutate(null, false)

        window.location.pathname = '/login'
    }

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user) {
            router.push(redirectIfAuthenticated)
        }

        if (middleware === 'auth' && error) {
            removeToken()
            router.push('/login')
        }

        if (middleware === 'auth' && user && !user.email_verified_at) {
            router.push('/verify-email')
        }

        if (
            window.location.pathname === '/verify-email' &&
            user?.email_verified_at
        ) {
            router.push(redirectIfAuthenticated)
        }
    }, [user, error])

    return {
        user,
        register,
        login,
        forgotPassword,
        resetPassword,
        resendEmailVerification,
        logout,
    }
}