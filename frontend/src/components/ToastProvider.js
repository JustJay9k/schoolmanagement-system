'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import styles from './toast.module.css'

const ToastContext = createContext(null)
const defaultDuration = 4200

const createToastId = () =>
    `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`

const typeLabelMap = {
    success: 'Success',
    error: 'Error',
    info: 'Notice',
}

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([])
    const timersRef = useRef(new Map())

    const dismissToast = useCallback(id => {
        const timer = timersRef.current.get(id)

        if (timer) {
            window.clearTimeout(timer)
            timersRef.current.delete(id)
        }

        setToasts(current => current.filter(toast => toast.id !== id))
    }, [])

    const showToast = useCallback(
        ({
            type = 'info',
            title,
            message,
            duration = defaultDuration,
        }) => {
            const id = createToastId()

            setToasts(current => [
                ...current,
                {
                    id,
                    type,
                    title: title ?? typeLabelMap[type] ?? typeLabelMap.info,
                    message,
                },
            ])

            if (duration > 0) {
                const timer = window.setTimeout(() => {
                    dismissToast(id)
                }, duration)

                timersRef.current.set(id, timer)
            }

            return id
        },
        [dismissToast],
    )

    useEffect(
        () => () => {
            timersRef.current.forEach(timer => window.clearTimeout(timer))
            timersRef.current.clear()
        },
        [],
    )

    const value = useMemo(
        () => ({
            showToast,
            dismissToast,
        }),
        [dismissToast, showToast],
    )

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className={styles.region} aria-live="polite" aria-atomic="true">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        className={`${styles.toast} ${
                            toast.type === 'error'
                                ? styles.error
                                : toast.type === 'success'
                                  ? styles.success
                                  : styles.info
                        }`}>
                        <div className={styles.content}>
                            <p className={styles.title}>{toast.title}</p>
                            <p className={styles.message}>{toast.message}</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => dismissToast(toast.id)}
                            className={styles.dismissButton}>
                            Close
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    const context = useContext(ToastContext)

    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }

    return context
}
