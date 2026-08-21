'use client'

import { useEffect, useMemo, useState } from 'react'
import ExcelJS from 'exceljs/dist/exceljs.min.js'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import { DeleteIcon, EditIcon } from '@/app/(app)/admin/action-icons'
import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import axios from '@/lib/axios'
import { canManageStudentRecords, formatRoleLabel } from '@/lib/userAccess'
import { useAuth } from '@/hooks/auth'

const createManualForm = () => ({
    school_track: 'primary',
    class_name: '',
    full_name: '',
    sex: 'male',
    date_of_birth: '',
    age: '',
    student_code: '',
    orphan_status: '',
    has_disability: '',
    disability_name: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    residence: '',
    first_entry_date: '',
})

const createImportForm = () => ({
    school_track: 'primary',
    class_name: '',
    file: null,
    fileName: '',
    records: [],
})

const headerAliases = {
    fullnamestartwiththesurname: 'full_name',
    fullname: 'full_name',
    fullnames: 'full_name',
    sex: 'sex',
    dateofbirth: 'date_of_birth',
    age: 'age',
    code: 'student_code',
    opharn: 'orphan_status',
    orphan: 'orphan_status',
    orphanstatus: 'orphan_status',
    nameofdisability: 'disability_name',
    parentsnameguidian: 'guardian_name',
    parentsnameguardian: 'guardian_name',
    parentnameguardian: 'guardian_name',
    guardianname: 'guardian_name',
    guardianphone: 'guardian_phone',
    guardianphonenumber: 'guardian_phone',
    parentphone: 'guardian_phone',
    parentphonenumber: 'guardian_phone',
    parentsphone: 'guardian_phone',
    parentsphonenumber: 'guardian_phone',
    guardiancontact: 'guardian_phone',
    guardiancontactnumber: 'guardian_phone',
    guardianemail: 'guardian_email',
    guardianemailaddress: 'guardian_email',
    parentemail: 'guardian_email',
    parentemailaddress: 'guardian_email',
    parentsemail: 'guardian_email',
    parentsemailaddress: 'guardian_email',
    placeofresidence: 'residence',
    firstdateofentry: 'first_entry_date',
    firstdateofentery: 'first_entry_date',
    onedateofentry: 'first_entry_date',
}

const normalizeHeader = header =>
    String(header ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

const toIsoDate = value => {
    if (!value) {
        return ''
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10)
    }

    if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000)
        if (!Number.isNaN(date.getTime())) {
            const year = date.getUTCFullYear()
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const day = String(date.getUTCDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }
    }

    const raw = String(value).trim()

    if (raw === '') {
        return ''
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw
    }

    const slashMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)

    if (slashMatch) {
        const [, day, month, year] = slashMatch
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    const parsed = new Date(raw)

    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

const getAgeFromDateOfBirth = value => {
    if (!value) {
        return ''
    }

    const birthDate = new Date(`${value}T00:00:00`)

    if (Number.isNaN(birthDate.getTime())) {
        return ''
    }

    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDifference = today.getMonth() - birthDate.getMonth()

    if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
        age -= 1
    }

    return age >= 0 ? String(age) : ''
}

const normalizeSex = value => {
    const cleaned = String(value ?? '').trim().toLowerCase()

    if (['male', 'm'].includes(cleaned)) {
        return 'male'
    }

    if (['female', 'f'].includes(cleaned)) {
        return 'female'
    }

    if (cleaned === 'other') {
        return 'other'
    }

    return ''
}

const normalizeSpreadsheetRows = rows =>
    rows
        .map(row => {
            const mapped = {
                full_name: '',
                sex: '',
                date_of_birth: '',
                age: '',
                student_code: '',
                orphan_status: '',
                disability_name: '',
                guardian_name: '',
                guardian_phone: '',
                guardian_email: '',
                residence: '',
                first_entry_date: '',
            }

            Object.entries(row ?? {}).forEach(([header, value]) => {
                const alias = headerAliases[normalizeHeader(header)]

                if (!alias) {
                    return
                }

                if (alias === 'date_of_birth' || alias === 'first_entry_date') {
                    mapped[alias] = toIsoDate(value)
                    return
                }

                if (alias === 'sex') {
                    mapped.sex = normalizeSex(value)
                    return
                }

                if (alias === 'age') {
                    mapped.age = value === '' || value == null ? '' : String(Math.round(Number(value)))
                    return
                }

                mapped[alias] = String(value ?? '').trim()
            })

            return mapped
        })
        .filter(row => row.full_name !== '')

const getSchoolMeta = user => ({
    key:
        user?.school?.id != null && user.school.id !== ''
            ? String(user.school.id)
            : 'current-school',
    label: user?.school?.name ?? 'Assigned school',
})

const hasNamedDisability = value => {
    const normalized = String(value ?? '').trim().toLowerCase()

    return normalized !== '' && !['n/a', 'none', 'no'].includes(normalized)
}

const studentToManualForm = student => ({
    school_track: student.school_track ?? 'primary',
    class_name: student.class_name ?? '',
    full_name: student.full_name ?? '',
    sex: student.sex ?? 'male',
    date_of_birth: student.date_of_birth ?? '',
    age: student.age == null ? '' : String(student.age),
    student_code: student.student_code ?? '',
    orphan_status: student.orphan_status ?? '',
    has_disability: hasNamedDisability(student.disability_name) ? 'yes' : '',
    disability_name: hasNamedDisability(student.disability_name)
        ? student.disability_name
        : '',
    guardian_name: student.guardian_name ?? '',
    guardian_phone: student.guardian_phone ?? '',
    guardian_email: student.guardian_email ?? '',
    residence: student.residence ?? '',
    first_entry_date: student.first_entry_date ?? '',
})

export default function StudentsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [students, setStudents] = useState([])
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [manualForm, setManualForm] = useState(createManualForm())
    const [manualErrors, setManualErrors] = useState({})
    const [manualSaving, setManualSaving] = useState(false)
    const [editingStudentId, setEditingStudentId] = useState(null)
    const [confirmingStudent, setConfirmingStudent] = useState(null)
    const [deletingStudentId, setDeletingStudentId] = useState(null)
    const [importForm, setImportForm] = useState(createImportForm())
    const [importErrors, setImportErrors] = useState({})
    const [importing, setImporting] = useState(false)
    const [pageStatus, setPageStatus] = useState(null)
    const [collapsedClasses, setCollapsedClasses] = useState(new Set())
    const [classFilter, setClassFilter] = useState('')
    const schoolMeta = useMemo(() => getSchoolMeta(user), [user])

    const loadStudents = async () => {
        setLoading(true)

        try {
            const response = await axios.get('/api/management/students')

            setStudents(response.data?.students ?? [])
            setStats(response.data?.stats ?? null)
            setOptions(response.data?.options ?? null)
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to load student records right now.',
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!user || !canManageStudentRecords(user)) {
            return
        }

        loadStudents()
    }, [user])

    const manualClasses = options?.classesByTrack?.[manualForm.school_track] ?? []
    const importClasses = options?.classesByTrack?.[importForm.school_track] ?? []

    const schoolCount = schoolMeta.label ? 1 : 0

    const resetManualEditor = () => {
        setManualForm(createManualForm())
        setManualErrors({})
        setEditingStudentId(null)
    }

    const startEditingStudent = student => {
        setManualForm(studentToManualForm(student))
        setManualErrors({})
        setEditingStudentId(student.id)
        setPageStatus(null)

        window.requestAnimationFrame(() => {
            document
                .getElementById('student-editor')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
    }

    const groupedStudents = useMemo(() => {
        const classes = students.reduce((groups, student) => {
            const classKey = `${student.school_track}::${student.class_name}`

            if (!groups[classKey]) {
                groups[classKey] = {
                    key: classKey,
                    school_track: student.school_track,
                    class_name: student.class_name,
                    students: [],
                }
            }

            groups[classKey].students.push(student)

            return groups
        }, {})

        return [
            {
                ...schoolMeta,
                students,
                classes: Object.values(classes).sort((left, right) => {
                    if (left.school_track !== right.school_track) {
                        return left.school_track.localeCompare(right.school_track)
                    }

                    return left.class_name.localeCompare(right.class_name)
                }),
            },
        ]
    }, [schoolMeta, students])

    const toggleClassCollapse = classKey => {
        setCollapsedClasses(prev => {
            const next = new Set(prev)

            if (next.has(classKey)) {
                next.delete(classKey)
            } else {
                next.add(classKey)
            }

            return next
        })
    }

    const allClassKeys = useMemo(
        () => groupedStudents.flatMap(school => school.classes.map(c => c.key)),
        [groupedStudents],
    )

    const filteredGroupedStudents = useMemo(() => {
        if (!classFilter) {
            return groupedStudents
        }

        return groupedStudents.map(school => ({
            ...school,
            classes: school.classes.filter(c => c.key === classFilter),
        }))
    }, [groupedStudents, classFilter])

    const handleSpreadsheetSelection = async event => {
        const file = event.target.files?.[0]

        setImportErrors({})

        if (!file) {
            setImportForm(current => ({
                ...current,
                file: null,
                fileName: '',
                records: [],
            }))
            return
        }

        try {
            const buffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            if (file.name.endsWith('.csv')) {
                await workbook.csv.load(new Uint8Array(buffer))
            } else {
                await workbook.xlsx.load(buffer)
            }
            const worksheet = workbook.worksheets[0]
            if (!worksheet) {
                throw new Error('No worksheets found in file')
            }

            const rows = []
            const colCount = worksheet.columnCount
            const rowCount = worksheet.rowCount

            const headers = []
            const headerRow = worksheet.getRow(1)
            for (let c = 1; c <= colCount; c++) {
                const cell = headerRow.getCell(c)
                let headerVal = cell.value
                if (headerVal && typeof headerVal === 'object') {
                    if (headerVal.richText) {
                        headerVal = headerVal.richText.map(t => t.text).join('')
                    } else if (headerVal.text) {
                        headerVal = headerVal.text
                    } else if (headerVal.result !== undefined) {
                        headerVal = headerVal.result
                    }
                }
                headers[c] = headerVal ? String(headerVal).trim() : ''
            }

            for (let r = 2; r <= rowCount; r++) {
                const row = worksheet.getRow(r)
                let hasValues = false
                const rowData = {}

                for (let c = 1; c <= colCount; c++) {
                    const header = headers[c]
                    if (!header) continue

                    const cell = row.getCell(c)
                    let cellVal = cell.value

                    if (cellVal && typeof cellVal === 'object' && !(cellVal instanceof Date)) {
                        if (cellVal.richText) {
                            cellVal = cellVal.richText.map(t => t.text).join('')
                        } else if (cellVal.text) {
                            cellVal = cellVal.text
                        } else if (cellVal.result !== undefined) {
                            cellVal = cellVal.result
                        } else {
                            cellVal = ''
                        }
                    }

                    if (cellVal !== undefined && cellVal !== null && cellVal !== '') {
                        hasValues = true
                    }

                    rowData[header] = cellVal ?? ''
                }

                if (hasValues) {
                    rows.push(rowData)
                }
            }

            const records = normalizeSpreadsheetRows(rows)

            setImportForm(current => ({
                ...current,
                file,
                fileName: file.name,
                records,
            }))
            setPageStatus({
                type: 'success',
                message: `Loaded ${records.length} student row${records.length === 1 ? '' : 's'} from ${file.name}.`,
            })
        } catch {
            setImportForm(current => ({
                ...current,
                file: null,
                fileName: '',
                records: [],
            }))
            setPageStatus({
                type: 'error',
                message: 'The uploaded sheet could not be read. Use an Excel or CSV file with the expected columns.',
            })
        }
    }

    const submitManualStudent = async event => {
        event.preventDefault()

        const validationErrors = {}

        if (manualForm.full_name.trim() === '') {
            validationErrors.full_name = ['Full name is required.']
        }

        if (manualForm.date_of_birth === '') {
            validationErrors.date_of_birth = [
                'Date of birth is required to calculate age.',
            ]
        }

        if (manualForm.age === '') {
            validationErrors.age = ['Age is required. Add the date of birth to calculate it.']
        }

        if (manualForm.student_code.trim() === '') {
            validationErrors.student_code = ['Student code is required.']
        }

        if (manualForm.guardian_name.trim() === '') {
            validationErrors.guardian_name = ['Parent / guardian is required.']
        }

        if (
            manualForm.has_disability === 'yes' &&
            manualForm.disability_name.trim() === ''
        ) {
            validationErrors.disability_name = ['Name of disability is required.']
        }

        if (Object.keys(validationErrors).length > 0) {
            setManualErrors(validationErrors)
            setPageStatus({
                type: 'error',
                message: 'Please complete all required student fields before saving.',
            })
            return
        }

        setManualErrors({})
        setPageStatus(null)
        setManualSaving(true)

        try {
            const { has_disability, ...manualPayload } = manualForm

            const payload = {
                ...manualPayload,
                age: manualPayload.age === '' ? null : Number(manualPayload.age),
                disability_name:
                    has_disability === 'yes' ? manualPayload.disability_name : '',
            }

            if (editingStudentId) {
                await axios.put(`/api/management/students/${editingStudentId}`, payload)
            } else {
                await axios.post('/api/management/students', payload)
            }

            resetManualEditor()
            setPageStatus({
                type: 'success',
                message: editingStudentId
                    ? 'Student record updated successfully.'
                    : 'Student record added successfully.',
            })
            await loadStudents()
        } catch (error) {
            setManualErrors(error?.response?.data?.errors ?? {})
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to save the student record.',
            })
        } finally {
            setManualSaving(false)
        }
    }

    const deleteStudent = async student => {
        setDeletingStudentId(student.id)
        setPageStatus(null)

        try {
            await axios.delete(`/api/management/students/${student.id}`)

            if (editingStudentId === student.id) {
                resetManualEditor()
            }

            setConfirmingStudent(null)
            setPageStatus({
                type: 'success',
                message: 'Student record deleted successfully.',
            })
            await loadStudents()
        } catch (error) {
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to delete the student record.',
            })
        } finally {
            setDeletingStudentId(null)
        }
    }

    const submitImport = async event => {
        event.preventDefault()
        setImporting(true)
        setImportErrors({})
        setPageStatus(null)

        try {
            const response = await axios.post('/api/management/students/import', {
                school_track: importForm.school_track,
                class_name: importForm.class_name,
                records: importForm.records.map(record => ({
                    ...record,
                    age: record.age === '' ? null : Number(record.age),
                })),
            })

            setImportForm(createImportForm())
            setPageStatus({
                type: 'success',
                message: `${response.data?.message ?? 'Import completed.'} ${response.data?.summary?.processed ?? 0} row(s) processed.`,
            })
            await loadStudents()
        } catch (error) {
            setImportErrors(error?.response?.data?.errors ?? {})
            setPageStatus({
                type: 'error',
                message:
                    error?.response?.data?.message ??
                    'Unable to import the student records.',
            })
        } finally {
            setImporting(false)
        }
    }

    if (!user) {
        return null
    }

    if (!canManageStudentRecords(user)) {
        return (
            <WorkspacePageShell
                eyebrow="Restricted"
                title="Student management access required"
                description={`This account is signed in as ${formatRoleLabel(user?.role)}. Only head teacher / management accounts can add or import student records.`}>
                <article className={workspaceStyles.panel}>
                    <p className={managementStyles.notice}>
                        Student uploading belongs to the head teacher /
                        management workspace.
                    </p>
                </article>
            </WorkspacePageShell>
        )
    }

    return (
        <WorkspacePageShell
            eyebrow="Management"
            title="Student records"
            description={`Add students one by one or upload a class register spreadsheet for ${schoolMeta.label}, then keep every learner attached to the correct track and class.`}
            actions={
                <button
                    type="button"
                    onClick={loadStudents}
                    className={workspaceStyles.secondaryButton}>
                    Refresh
                </button>
            }>
            {pageStatus ? (
                <section className={workspaceStyles.panel}>
                    <p
                        className={`${managementStyles.notice} ${
                            pageStatus.type === 'error' ? managementStyles.dangerText : ''
                        }`}>
                        {pageStatus.message}
                    </p>
                </section>
            ) : null}

            <section className={managementStyles.statsGrid}>
                {[
                    ['Student records', stats?.total ?? 0],
                    ['Schools', schoolCount],
                    ['Primary', stats?.primary ?? 0],
                    ['Secondary', stats?.secondary ?? 0],
                    ['Classes covered', stats?.classes ?? 0],
                ].map(([label, value]) => (
                    <article key={label} className={workspaceStyles.statCard}>
                        <p className={workspaceStyles.statLabel}>{label}</p>
                        <p className={workspaceStyles.statValue}>{value}</p>
                    </article>
                ))}
            </section>

            <section className={managementStyles.summaryCards}>
                <article id="student-editor" className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Manual entry</p>
                            <h2 className={workspaceStyles.panelTitle}>
                                {editingStudentId ? 'Edit student' : 'Add one student'}
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={submitManualStudent} className={managementStyles.stack}>
                        <div className={managementStyles.formGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>School track</span>
                                <select
                                    value={manualForm.school_track}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            school_track: event.target.value,
                                            class_name: '',
                                        }))
                                    }
                                    className={managementStyles.select}>
                                    {Object.entries(options?.schoolTracks ?? {}).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <InputError messages={manualErrors.school_track} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Class</span>
                                <select
                                    value={manualForm.class_name}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            class_name: event.target.value,
                                        }))
                                    }
                                    className={managementStyles.select}
                                    required>
                                    <option value="">Select a class</option>
                                    {manualClasses.map(className => (
                                        <option key={className} value={className}>
                                            {className}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={manualErrors.class_name} />
                            </label>

                            <label className={`${managementStyles.field} ${managementStyles.fullWidth}`}>
                                <span className={managementStyles.fieldLabel}>
                                    Full name
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    value={manualForm.full_name}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            full_name: event.target.value,
                                        }))
                                    }
                                    placeholder="Surname Firstname"
                                    required
                                />
                                <span className={managementStyles.fieldHint}>
                                    Use the same format as the first register: start with the surname.
                                </span>
                                <InputError messages={manualErrors.full_name} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Sex</span>
                                <select
                                    value={manualForm.sex}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            sex: event.target.value,
                                        }))
                                    }
                                    className={managementStyles.select}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                <InputError messages={manualErrors.sex} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Date of birth
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    type="date"
                                    value={manualForm.date_of_birth}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            date_of_birth: event.target.value,
                                            age: getAgeFromDateOfBirth(event.target.value),
                                        }))
                                    }
                                    required
                                />
                                <InputError messages={manualErrors.date_of_birth} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Age
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    type="number"
                                    min="0"
                                    value={manualForm.age}
                                    disabled
                                    readOnly
                                    placeholder="Auto-calculated"
                                />
                                <InputError messages={manualErrors.age} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Code
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    value={manualForm.student_code}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            student_code: event.target.value,
                                        }))
                                    }
                                    placeholder="20212862526"
                                    required
                                />
                                <InputError messages={manualErrors.student_code} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Orphan</span>
                                <select
                                    value={manualForm.orphan_status}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            orphan_status: event.target.value,
                                        }))
                                    }
                                    className={managementStyles.select}>
                                    <option value="">Select an option</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                                <InputError messages={manualErrors.orphan_status} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Has disability
                                </span>
                                <select
                                    value={manualForm.has_disability}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            has_disability: event.target.value,
                                            disability_name:
                                                event.target.value === 'yes'
                                                    ? current.disability_name
                                                    : '',
                                        }))
                                    }
                                    className={managementStyles.select}>
                                    <option value="">Select an option</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                </select>
                            </label>

                            {manualForm.has_disability === 'yes' ? (
                                <label className={managementStyles.field}>
                                    <span className={managementStyles.fieldLabel}>
                                        Name of disability
                                    </span>
                                    <Input
                                        value={manualForm.disability_name}
                                        onChange={event =>
                                            setManualForm(current => ({
                                                ...current,
                                                disability_name: event.target.value,
                                            }))
                                        }
                                        placeholder="Type the disability"
                                        required
                                    />
                                    <InputError messages={manualErrors.disability_name} />
                                </label>
                            ) : null}

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Parent / guardian
                                    <span className={managementStyles.requiredMark}>*</span>
                                </span>
                                <Input
                                    value={manualForm.guardian_name}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            guardian_name: event.target.value,
                                        }))
                                    }
                                    required
                                />
                                <InputError messages={manualErrors.guardian_name} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Guardian phone number
                                </span>
                                <Input
                                    type="tel"
                                    value={manualForm.guardian_phone}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            guardian_phone: event.target.value,
                                        }))
                                    }
                                    placeholder="+265 999 000 000"
                                />
                                <InputError messages={manualErrors.guardian_phone} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>
                                    Guardian email
                                </span>
                                <Input
                                    type="email"
                                    value={manualForm.guardian_email}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            guardian_email: event.target.value,
                                        }))
                                    }
                                    placeholder="guardian@example.com"
                                />
                                <InputError messages={manualErrors.guardian_email} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Place of residence</span>
                                <Input
                                    value={manualForm.residence}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            residence: event.target.value,
                                        }))
                                    }
                                />
                                <InputError messages={manualErrors.residence} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>1st date of entry</span>
                                <Input
                                    type="date"
                                    value={manualForm.first_entry_date}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            first_entry_date: event.target.value,
                                        }))
                                    }
                                />
                                <InputError messages={manualErrors.first_entry_date} />
                            </label>
                        </div>

                        <div className={managementStyles.actions}>
                            <Button disabled={manualSaving}>
                                {manualSaving
                                    ? 'Saving...'
                                    : editingStudentId
                                    ? 'Update student'
                                    : 'Add student'}
                            </Button>
                            {editingStudentId ? (
                                <button
                                    type="button"
                                    onClick={resetManualEditor}
                                    className={managementStyles.secondaryButton}>
                                    Cancel edit
                                </button>
                            ) : null}
                        </div>
                    </form>
                </article>

                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Excel import</p>
                            <h2 className={workspaceStyles.panelTitle}>Upload a class register</h2>
                        </div>
                    </div>

                    <form onSubmit={submitImport} className={managementStyles.stack}>
                        <div className={managementStyles.formGrid}>
                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>School track</span>
                                <select
                                    value={importForm.school_track}
                                    onChange={event =>
                                        setImportForm(current => ({
                                            ...current,
                                            school_track: event.target.value,
                                            class_name: '',
                                        }))
                                    }
                                    className={managementStyles.select}>
                                    {Object.entries(options?.schoolTracks ?? {}).map(
                                        ([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                                <InputError messages={importErrors.school_track} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Class</span>
                                <select
                                    value={importForm.class_name}
                                    onChange={event =>
                                        setImportForm(current => ({
                                            ...current,
                                            class_name: event.target.value,
                                        }))
                                    }
                                    className={managementStyles.select}
                                    required>
                                    <option value="">Select a class</option>
                                    {importClasses.map(className => (
                                        <option key={className} value={className}>
                                            {className}
                                        </option>
                                    ))}
                                </select>
                                <InputError messages={importErrors.class_name} />
                            </label>

                            <label className={`${managementStyles.field} ${managementStyles.fullWidth}`}>
                                <span className={managementStyles.fieldLabel}>Spreadsheet file</span>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleSpreadsheetSelection}
                                />
                                <span className={managementStyles.fieldHint}>
                                    Expected columns: Full name, Sex, Date of Birth, Age, Code,
                                    Opharn, Name of Disability, Parents Name/Guidian, Guardian
                                    Phone, Guardian Email, Place of Residence, 1st Date of Entery.
                                </span>
                                <InputError messages={importErrors.records} />
                            </label>
                        </div>

                        {importForm.fileName ? (
                            <div className={managementStyles.notice}>
                                <strong>{importForm.fileName}</strong>
                                <br />
                                {importForm.records.length} row(s) ready to import.
                            </div>
                        ) : null}

                        {importForm.records.length ? (
                            <div className={workspaceStyles.tableWrap}>
                                <table className={workspaceStyles.table}>
                                    <thead>
                                        <tr>
                                            <th>Full name</th>
                                            <th>Sex</th>
                                            <th>Date of birth</th>
                                            <th>Code</th>
                                            <th>Guardian</th>
                                            <th>Contact</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importForm.records.slice(0, 5).map((record, index) => (
                                            <tr key={`${record.student_code || record.full_name}-${index}`}>
                                                <td>{record.full_name}</td>
                                                <td>{record.sex || 'N/A'}</td>
                                                <td>{record.date_of_birth || 'N/A'}</td>
                                                <td>{record.student_code || 'N/A'}</td>
                                                <td>{record.guardian_name || 'N/A'}</td>
                                                <td>
                                                    {record.guardian_phone ||
                                                        record.guardian_email ||
                                                        'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}

                        <div className={managementStyles.actions}>
                            <Button
                                disabled={
                                    importing ||
                                    importForm.class_name === '' ||
                                    importForm.records.length === 0
                                }>
                                {importing ? 'Importing...' : 'Import students'}
                            </Button>
                        </div>
                    </form>
                </article>
            </section>

            <section className={workspaceStyles.fullPanel}>
                <div className={workspaceStyles.panelHeader}>
                    <div>
                        <p className={workspaceStyles.panelEyebrow}>Stored records</p>
                        <h2 className={workspaceStyles.panelTitle}>Student register by school</h2>
                    </div>
                </div>

                {loading ? (
                    <p className={managementStyles.muted}>Loading student records...</p>
                ) : students.length === 0 ? (
                    <p className={managementStyles.notice}>
                        No student records have been added yet. Use the manual form
                        or import a class register spreadsheet.
                    </p>
                ) : (
                    <>
                        {allClassKeys.length > 1 && (
                            <div className={workspaceStyles.filterBar}>
                                <label className={managementStyles.field}>
                                    <span className={managementStyles.fieldLabel}>
                                        Filter by class
                                    </span>
                                    <select
                                        value={classFilter}
                                        onChange={event =>
                                            setClassFilter(event.target.value)
                                        }
                                        className={managementStyles.select}>
                                        <option value="">All classes</option>
                                        {allClassKeys.map(key => {
                                            const [, className] = key.split('::')

                                            return (
                                                <option key={key} value={key}>
                                                    {className}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </label>
                            </div>
                        )}

                        <div className={workspaceStyles.list}>
                            {filteredGroupedStudents.map(school => (
                                <article key={school.key} className={workspaceStyles.panel}>
                                    <div className={workspaceStyles.panelHeader}>
                                        <div>
                                            <p className={workspaceStyles.panelEyebrow}>School</p>
                                            <h2 className={workspaceStyles.panelTitle}>
                                                {school.label}
                                            </h2>
                                        </div>
                                        <span className={workspaceStyles.badge}>
                                            {school.students.length} student
                                            {school.students.length === 1 ? '' : 's'}
                                        </span>
                                    </div>

                                    <div className={workspaceStyles.panelGrid}>
                                        {school.classes.map(group => {
                                            const isCollapsed = collapsedClasses.has(group.key)

                                            return (
                                                <article
                                                    key={`${school.key}-${group.key}`}
                                                    className={workspaceStyles.panel}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleClassCollapse(group.key)
                                                        }
                                                        className={
                                                            workspaceStyles.collapseTrigger
                                                        }>
                                                        <div>
                                                            <p
                                                                className={
                                                                    workspaceStyles.panelEyebrow
                                                                }>
                                                                {options?.schoolTracks?.[
                                                                    group.school_track
                                                                ] ?? group.school_track}
                                                            </p>
                                                            <h2
                                                                className={
                                                                    workspaceStyles.panelTitle
                                                                }>
                                                                {group.class_name}
                                                            </h2>
                                                        </div>
                                                        <div
                                                            className={
                                                                workspaceStyles.collapseRight
                                                            }>
                                                            <span
                                                                className={workspaceStyles.badge}>
                                                                {group.students.length} student
                                                                {group.students.length === 1
                                                                    ? ''
                                                                    : 's'}
                                                            </span>
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                aria-hidden="true"
                                                                className={`${
                                                                    workspaceStyles.chevron
                                                                } ${
                                                                    isCollapsed
                                                                        ? ''
                                                                        : workspaceStyles.chevronOpen
                                                                }`}>
                                                                <path
                                                                    d="M6 9l6 6 6-6"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </button>

                                                    {!isCollapsed && (
                                                        <div className={workspaceStyles.tableWrap}>
                                                            <table
                                                                className={workspaceStyles.table}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Full name</th>
                                                                        <th>Sex</th>
                                                                        <th>DOB</th>
                                                                        <th>Age</th>
                                                                        <th>Code</th>
                                                                        <th>Disability</th>
                                                                        <th>Guardian</th>
                                                                        <th>
                                                                            Guardian phone
                                                                        </th>
                                                                        <th>
                                                                            Guardian email
                                                                        </th>
                                                                        <th>Residence</th>
                                                                        <th>Entry date</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {group.students.map(
                                                                        student => (
                                                                            <tr key={student.id}>
                                                                                <td>
                                                                                    {
                                                                                        student.full_name
                                                                                    }
                                                                                </td>
                                                                                <td>
                                                                                    {student.sex ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.date_of_birth ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.age ??
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.student_code ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.disability_name ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.guardian_name ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.guardian_phone ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.guardian_email ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.residence ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    {student.first_entry_date ||
                                                                                        'N/A'}
                                                                                </td>
                                                                                <td>
                                                                                    <div
                                                                                        className={
                                                                                            managementStyles.tableActions
                                                                                        }>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                startEditingStudent(
                                                                                                    student,
                                                                                                )
                                                                                            }
                                                                                            aria-label={`Edit ${student.full_name}`}
                                                                                            title={`Edit ${student.full_name}`}
                                                                                            className={`${managementStyles.secondaryButton} ${managementStyles.iconButton}`}>
                                                                                            <span
                                                                                                className={
                                                                                                    managementStyles.srOnly
                                                                                                }>
                                                                                                {`Edit ${student.full_name}`}
                                                                                            </span>
                                                                                            <EditIcon />
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setConfirmingStudent(
                                                                                                    student,
                                                                                                )
                                                                                            }
                                                                                            aria-label={`Delete ${student.full_name}`}
                                                                                            title={`Delete ${student.full_name}`}
                                                                                            className={`${managementStyles.dangerButton} ${managementStyles.iconButton}`}>
                                                                                            <span
                                                                                                className={
                                                                                                    managementStyles.srOnly
                                                                                                }>
                                                                                                {`Delete ${student.full_name}`}
                                                                                            </span>
                                                                                            <DeleteIcon />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </article>
                                            )
                                        })}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </section>
            <ConfirmDialog
                open={Boolean(confirmingStudent)}
                eyebrow="Delete student"
                title="Delete this student record?"
                message={
                    confirmingStudent
                        ? `Are you sure you want to delete ${confirmingStudent.full_name}?`
                        : ''
                }
                confirmLabel="Delete student"
                busyLabel="Deleting..."
                tone="danger"
                busy={
                    deletingStudentId != null &&
                    deletingStudentId === confirmingStudent?.id
                }
                onClose={() => setConfirmingStudent(null)}
                onConfirm={() => {
                    if (confirmingStudent) {
                        deleteStudent(confirmingStudent)
                    }
                }}
            />
        </WorkspacePageShell>
    )
}
