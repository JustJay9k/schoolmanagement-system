'use client'

import { useEffect, useId, useRef } from 'react'
import styles from './confirm-dialog.module.css'

export default function ConfirmDialog({
    open,
    eyebrow = 'Confirm action',
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    busyLabel = 'Working...',
    tone = 'default',
    busy = false,
    onClose,
    onConfirm,
}) {
    const titleId = useId()
    const confirmButtonRef = useRef(null)

    useEffect(() => {
        if (!open) {
            return undefined
        }

        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        window.requestAnimationFrame(() => {
            confirmButtonRef.current?.focus()
        })

        const handleKeyDown = event => {
            if (event.key === 'Escape' && !busy) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = originalOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [busy, onClose, open])

    if (!open) {
        return null
    }

    return (
        <div
            className={styles.overlay}
            onClick={() => {
                if (!busy) {
                    onClose()
                }
            }}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={styles.card}
                onClick={event => event.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerCopy}>
                        <p className={styles.eyebrow}>{eyebrow}</p>
                        <h2 id={titleId} className={styles.title}>
                            {title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close confirmation dialog"
                        className={styles.closeButton}>
                        Close
                    </button>
                </div>

                <p className={styles.message}>{message}</p>

                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className={styles.secondaryButton}>
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={
                            tone === 'danger'
                                ? styles.dangerButton
                                : styles.confirmButton
                        }>
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
