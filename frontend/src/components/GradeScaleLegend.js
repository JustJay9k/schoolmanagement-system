'use client'

import styles from './grade-scale-legend.module.css'

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
                {bands.map(band => (
                    <span
                        key={
                            band.id ??
                            `${band.letter}-${band.min_percentage}-${band.max_percentage}`
                        }
                        className={styles.legendBand}>
                        <strong>{band.letter}</strong>
                        <small>
                            {band.min_percentage}–{band.max_percentage}%
                        </small>
                    </span>
                ))}
            </div>
        </div>
    )
}

export default GradeScaleLegend