'use client'

import { getGradeTone } from '@/lib/gradeBands'
import styles from './grade-scale-legend.module.css'

const toneClassNames = {
    green: styles.toneGreen,
    blue: styles.toneBlue,
    red: styles.toneRed,
    neutral: styles.toneNeutral,
}

const GradeScaleLegend = ({ bands }) => {
    if (!Array.isArray(bands) || bands.length === 0) {
        return null
    }

    return (
        <div className={styles.legend}>
            <span className={styles.legendLabel}>
                How this school defines grades
            </span>
            <div className={styles.legendBands}>
                {bands.map(band => {
                    const tone =
                        toneClassNames[getGradeTone(band.letter)] ??
                        styles.toneNeutral

                    return (
                        <span
                            key={
                                band.id ??
                                `${band.letter}-${band.min_percentage}-${band.max_percentage}`
                            }
                            className={`${styles.legendBand} ${tone}`}>
                            <strong>{band.letter}</strong>
                            <small>
                                {band.min_percentage}–{band.max_percentage}%
                            </small>
                        </span>
                    )
                })}
            </div>
        </div>
    )
}

export default GradeScaleLegend