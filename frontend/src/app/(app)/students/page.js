'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import WorkspacePageShell from '@/app/(app)/WorkspacePageShell'
import workspaceStyles from '@/app/(app)/workspace-page.module.css'
import managementStyles from '@/app/(app)/management/management-tools.module.css'
import Button from '@/components/Button'
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
    disability_name: '',
    guardian_name: '',
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
        const parsed = XLSX.SSF.parse_date_code(value)

        if (parsed) {
            const month = String(parsed.m).padStart(2, '0')
            const day = String(parsed.d).padStart(2, '0')
            return `${parsed.y}-${month}-${day}`
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

export default function StudentsPage() {
    const { user } = useAuth({ middleware: 'auth' })
    const [students, setStudents] = useState([])
    const [stats, setStats] = useState(null)
    const [options, setOptions] = useState(null)
    const [loading, setLoading] = useState(true)
    const [manualForm, setManualForm] = useState(createManualForm())
    const [manualErrors, setManualErrors] = useState({})
    const [manualSaving, setManualSaving] = useState(false)
    const [importForm, setImportForm] = useState(createImportForm())
    const [importErrors, setImportErrors] = useState({})
    const [importing, setImporting] = useState(false)
    const [pageStatus, setPageStatus] = useState(null)
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
            const workbook = XLSX.read(buffer, {
                type: 'array',
                cellDates: true,
            })
            const firstSheetName = workbook.SheetNames[0]
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
                defval: '',
            })
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
        setManualSaving(true)
        setManualErrors({})
        setPageStatus(null)

        try {
            await axios.post('/api/management/students', {
                ...manualForm,
                age: manualForm.age === '' ? null : Number(manualForm.age),
            })

            setManualForm(createManualForm())
            setPageStatus({
                type: 'success',
                message: 'Student record added successfully.',
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
                <article className={workspaceStyles.panel}>
                    <div className={workspaceStyles.panelHeader}>
                        <div>
                            <p className={workspaceStyles.panelEyebrow}>Manual entry</p>
                            <h2 className={workspaceStyles.panelTitle}>Add one student</h2>
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
                                <span className={managementStyles.fieldLabel}>Full name</span>
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
                                <span className={managementStyles.fieldLabel}>Date of birth</span>
                                <Input
                                    type="date"
                                    value={manualForm.date_of_birth}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            date_of_birth: event.target.value,
                                        }))
                                    }
                                />
                                <InputError messages={manualErrors.date_of_birth} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Age</span>
                                <Input
                                    type="number"
                                    min="0"
                                    value={manualForm.age}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            age: event.target.value,
                                        }))
                                    }
                                />
                                <InputError messages={manualErrors.age} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Code</span>
                                <Input
                                    value={manualForm.student_code}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            student_code: event.target.value,
                                        }))
                                    }
                                    placeholder="20212862526"
                                />
                                <InputError messages={manualErrors.student_code} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Orphan</span>
                                <Input
                                    value={manualForm.orphan_status}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            orphan_status: event.target.value,
                                        }))
                                    }
                                    placeholder="N/A"
                                />
                                <InputError messages={manualErrors.orphan_status} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Name of disability</span>
                                <Input
                                    value={manualForm.disability_name}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            disability_name: event.target.value,
                                        }))
                                    }
                                    placeholder="N/A"
                                />
                                <InputError messages={manualErrors.disability_name} />
                            </label>

                            <label className={managementStyles.field}>
                                <span className={managementStyles.fieldLabel}>Parent / guardian</span>
                                <Input
                                    value={manualForm.guardian_name}
                                    onChange={event =>
                                        setManualForm(current => ({
                                            ...current,
                                            guardian_name: event.target.value,
                                        }))
                                    }
                                />
                                <InputError messages={manualErrors.guardian_name} />
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
                                {manualSaving ? 'Saving...' : 'Add student'}
                            </Button>
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
                                    Opharn, Name of Disability, Parents Name/Guidian, Place of
                                    Residence, 1st Date of Entery.
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
                    <div className={workspaceStyles.list}>
                        {groupedStudents.map(school => (
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
                                    {school.classes.map(group => (
                                        <article
                                            key={`${school.key}-${group.key}`}
                                            className={workspaceStyles.panel}>
                                            <div className={workspaceStyles.panelHeader}>
                                                <div>
                                                    <p className={workspaceStyles.panelEyebrow}>
                                                        {options?.schoolTracks?.[
                                                            group.school_track
                                                        ] ?? group.school_track}
                                                    </p>
                                                    <h2 className={workspaceStyles.panelTitle}>
                                                        {group.class_name}
                                                    </h2>
                                                </div>
                                                <span className={workspaceStyles.badge}>
                                                    {group.students.length} student
                                                    {group.students.length === 1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            </div>

                                            <div className={workspaceStyles.tableWrap}>
                                                <table className={workspaceStyles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>Full name</th>
                                                            <th>Sex</th>
                                                            <th>DOB</th>
                                                            <th>Age</th>
                                                            <th>Code</th>
                                                            <th>Guardian</th>
                                                            <th>Residence</th>
                                                            <th>Entry date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.students.map(student => (
                                                            <tr key={student.id}>
                                                                <td>{student.full_name}</td>
                                                                <td>{student.sex || 'N/A'}</td>
                                                                <td>
                                                                    {student.date_of_birth ||
                                                                        'N/A'}
                                                                </td>
                                                                <td>
                                                                    {student.age ?? 'N/A'}
                                                                </td>
                                                                <td>
                                                                    {student.student_code ||
                                                                        'N/A'}
                                                                </td>
                                                                <td>
                                                                    {student.guardian_name ||
                                                                        'N/A'}
                                                                </td>
                                                                <td>
                                                                    {student.residence || 'N/A'}
                                                                </td>
                                                                <td>
                                                                    {student.first_entry_date ||
                                                                        'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </WorkspacePageShell>
    )
}
