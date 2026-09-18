export const TERM_ORDER = { first: 1, second: 2, third: 3 }

const termSortValue = term => TERM_ORDER[term] ?? 99

export const buildClassTermGroups = records => {
    const groupsByClass = new Map()

    ;(records ?? []).forEach(record => {
        const schoolTrack = record.school_track ?? ''
        const className = record.class_name ?? ''
        const classKey = `${schoolTrack}|${className}`
        const term = record.assessment_period_term ?? 'first'

        let group = groupsByClass.get(classKey)

        if (!group) {
            group = {
                key: classKey,
                school_track: schoolTrack || null,
                class_name: className || null,
                label:
                    record.class_label ??
                    (className || 'Class not recorded'),
                latestTimestamp: '',
                terms: new Map(),
            }
            groupsByClass.set(classKey, group)
        }

        if (
            record.updated_at &&
            record.updated_at > group.latestTimestamp
        ) {
            group.latestTimestamp = record.updated_at
        }

        const termKey =
            `${String(termSortValue(term)).padStart(2, '0')}-${term}`

        let termGroup = group.terms.get(termKey)

        if (!termGroup) {
            termGroup = {
                key: termKey,
                term,
                label: record.assessment_period_term_label ?? term,
                records: [],
            }
            group.terms.set(termKey, termGroup)
        }

        termGroup.records.push(record)
    })

    return [...groupsByClass.values()]
        .sort(
            (a, b) =>
                (b.latestTimestamp || '').localeCompare(
                    a.latestTimestamp || '',
                ) || a.label.localeCompare(b.label),
        )
        .map(group => ({
            ...group,
            terms: [...group.terms.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, termGroup]) => termGroup),
        }))
}