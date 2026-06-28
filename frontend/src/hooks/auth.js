import useSWR from 'swr'
import axios from '@/lib/axios'
import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter()
    const params = useParams()
    const isLoggingOutRef = useRef(false)

    const createStatus = (message, type = 'error') => ({ message, type })
    const getResponseStatus = error => error?.response?.status
    const getValidationErrors = error => error?.response?.data?.errors ?? []
    const getBackendUrl = () => axios.defaults.baseURL ?? 'the configured backend'
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

        if (passwordErrors.length > 0) {
            return `Password issue: ${passwordErrors[0]}`
        }

        if (schoolErrors.length > 0) {
            return `School issue: ${schoolErrors[0]}`
        }

        if (schoolNameErrors.length > 0) {
            return `School issue: ${schoolNameErrors[0]}`
        }

        if (trackErrors.length > 0) {
            return `School track issue: ${trackErrors[0]}`
        }

        if (assignedClassErrors.length > 0) {
            return `Class assignment issue: ${assignedClassErrors[0]}`
        }

        if (childNameErrors.length > 0) {
            return `Learner lookup issue: ${childNameErrors[0]}`
        }

        if (emailErrors.length > 0) {
            return `Email issue: ${emailErrors[0]}`
        }

        if (nameErrors.length > 0) {
            return `Name issue: ${nameErrors[0]}`
        }

        return getFirstErrorMessage(validationErrors)
            ? `Please review the highlighted fields. ${getFirstErrorMessage(validationErrors)}`
            : 'Please review the highlighted fields and try again.'
    }

    const getAuthFailureMessage = error => {
        const status = getResponseStatus(error)
        const responseMessage = error?.response?.data?.message

        if (responseMessage) {
            return responseMessage
        }

        if (status === 419) {
            return 'Unable to verify your session with Laravel. Check that the frontend and backend are using the same host name and retry.'
        }

        if (error?.response) {
            return 'Authentication request failed. Please try again.'
        }

        return `Unable to reach the authentication server at ${getBackendUrl()}. Check your backend URL, CORS, and Sanctum configuration.`
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

    const { data: user, error, mutate } = useSWR('/api/user', () =>
        axios
            .get('/api/user')
            .then(res => res.data)
            .catch(error => {
                if (getResponseStatus(error) !== 409) throw error

                router.push('/verify-email')
            }),
    )

    const csrf = async () => {
        await axios.get('/sanctum/csrf-cookie')
    }

    const register = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus?.(null)

        try {
            await csrf()
            await axios.post('/register', props)
            await mutate()
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
        }
    }

    const login = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus(null)

        try {
            await csrf()
            await axios.post('/login', props)
            await mutate()
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
        }
    }

    const forgotPassword = async ({ setErrors, setStatus, email }) => {
        setErrors([])
        setStatus(null)

        try {
            await csrf()
            const response = await axios.post('/forgot-password', { email })
            setStatus(response.data.status)
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
        }
    }

    const resetPassword = async ({ setErrors, setStatus, ...props }) => {
        setErrors([])
        setStatus(null)

        try {
            await csrf()
            const response = await axios.post('/reset-password', {
                token: params.token,
                ...props,
            })

            router.push('/login?reset=' + btoa(response.data.status))
        } catch (error) {
            handleAuthError(error, setErrors, setStatus)
        }
    }

    const resendEmailVerification = ({ setStatus }) => {
        axios
            .post('/email/verification-notification')
            .then(response => setStatus(createStatus(response.data.status, 'success')))
    }

    const logout = async () => {
        if (isLoggingOutRef.current) {
            return
        }

        isLoggingOutRef.current = true

        if (!error) {
            await axios
                .post('/logout')
                .then(() => mutate())
                .catch(() => null)
        }

        window.location.pathname = '/login'
    }

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user)
            router.push(redirectIfAuthenticated)

        if (middleware === 'auth' && user && !user.email_verified_at)
            router.push('/verify-email')

        if (
            window.location.pathname === '/verify-email' &&
            user?.email_verified_at
        ) {
            router.push(redirectIfAuthenticated)
        }

        if (middleware === 'auth' && error) logout()
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
