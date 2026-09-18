export const parseGradeToNumber = grade => {
    if (typeof grade === 'number' && Number.isFinite(grade)) {
        return grade <= 100 ? grade : null
    }

    const text = (grade ?? '').trim()

    if (!text) {
        return null
    }

    const fractionMatch = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)

    if (fractionMatch && Number(fractionMatch[2]) > 0) {
        return (Number(fractionMatch[1]) / Number(fractionMatch[2])) * 100
    }

    const percentMatch = text.match(/^(\d+(?:\.\d+)?)%$/)

    if (percentMatch) {
        return Number(percentMatch[1])
    }

    if (/^\d+(?:\.\d+)?$/.test(text)) {
        const value = Number(text)

        return value <= 100 ? value : null
    }

    const letterMap = {
        'A+': 97,
        A: 93,
        'A-': 90,
        'B+': 87,
        B: 83,
        'B-': 80,
        'C+': 77,
        C: 73,
        'C-': 70,
        'D+': 67,
        D: 63,
        'D-': 60,
        F: 50,
        E: 40,
    }

    const upper = text.toUpperCase()

    return upper in letterMap ? letterMap[upper] : null
}

export const getGradeLetter = (grade, bands) => {
    const value = parseGradeToNumber(grade)

    if (value === null || !Array.isArray(bands)) {
        return null
    }

    const ordered = [...bands].sort(
        (a, b) => (b.min_percentage ?? 0) - (a.min_percentage ?? 0),
    )

    const match = ordered.find(
        band =>
            value >= (band.min_percentage ?? 0) &&
            value <= (band.max_percentage ?? 100),
    )

    return match ? match.letter : null
}

export const getGradeTone = letter => {
    if (!letter) {
        return 'neutral'
    }

    const first = String(letter).trim().charAt(0).toUpperCase()

    if (first === 'A') {
        return 'green'
    }

    if (['B', 'C', 'D'].includes(first)) {
        return 'blue'
    }

    if (['E', 'F'].includes(first)) {
        return 'red'
    }

    return 'neutral'
}