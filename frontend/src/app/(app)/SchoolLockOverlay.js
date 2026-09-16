'use client'

import { useEffect } from 'react'
import styles from './school-lock-overlay.module.css'

export default function SchoolLockOverlay({ schoolName, onReturnToLogin }) {
    useEffect(() => {
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [])

    return (
        <div className={styles.overlay} role="presentation">
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="school-lock-title"
                aria-describedby="school-lock-message"
                className={styles.card}>
                <p className={styles.eyebrow}>Account locked</p>
                <h2 id="school-lock-title" className={styles.title}>
                    Your account has been locked
                </h2>
                <p id="school-lock-message" className={styles.message}>
                    {schoolName ? `${schoolName} has been locked. ` : ''}
                    Please contact the System Administrator. You cannot perform
                    any actions until the administrator unlocks your school.
                </p>
                <div className={styles.statusRow}>
                    <span className={styles.statusDot} aria-hidden="true" />
                    Waiting for the administrator to unlock access
                </div>
                <button
                    type="button"
                    onClick={onReturnToLogin}
                    className={styles.textButton}>
                    Return to login page
                </button>
            </section>
        </div>
    )
}
