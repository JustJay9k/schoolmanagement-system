'use client'

import styles from './grade-letter-badge.module.css'
import { getGradeLetter, getGradeTone } from '@/lib/gradeBands'

const toneClasses = {
    green: styles.toneGreen,
    blue: styles.toneBlue,
    red: styles.toneRed,
    neutral: styles.toneNeutral,
}

const GradeLetterBadge = ({ grade, bands, className }) => {
    const letter = getGradeLetter(grade, bands)

    if (!letter) {
        return null
    }

    const tone = getGradeTone(letter)

    return (
        <span
            className={`${styles.badge} ${toneClasses[tone] ?? styles.toneNeutral}${
                className ? ` ${className}` : ''
            }`}
            aria-label={`Grade ${letter}`}>
            {letter}
        </span>
    )
}

export default GradeLetterBadge