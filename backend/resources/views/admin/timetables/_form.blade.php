@php
    $selectedTrack = old('school_track', $timetable->school_track ?? '');
    $selectedClass = old('class_name', $timetable->class_name ?? '');
    $selectedTeacherId = (string) old('assigned_teacher_id', $timetable->assigned_teacher_id ?? '');
    $initialEntries = collect(old('entries', isset($timetable)
        ? $timetable->entries->map(fn ($entry) => [
            'day_of_week' => $entry->day_of_week,
            'period_label' => $entry->period_label,
            'start_time' => $entry->start_time ? substr((string) $entry->start_time, 0, 5) : '',
            'end_time' => $entry->end_time ? substr((string) $entry->end_time, 0, 5) : '',
            'subject_id' => (string) $entry->subject_id,
            'room' => $entry->room,
            'notes' => $entry->notes,
        ])->all()
        : [[
            'day_of_week' => 'monday',
            'period_label' => '',
            'start_time' => '',
            'end_time' => '',
            'subject_id' => '',
            'room' => '',
            'notes' => '',
        ]]))
        ->values()
        ->all();
@endphp

<section
    class="panel-card"
    data-timetable-form='@json([
        "selectedTrack" => $selectedTrack,
        "selectedClass" => $selectedClass,
        "selectedTeacherId" => $selectedTeacherId,
        "classesByTrack" => $classesByTrack,
        "subjectsByTrack" => $subjectsByTrack,
        "teachersByTrack" => $teachersByTrack,
        "daysOfWeek" => $daysOfWeek,
        "entries" => $initialEntries,
    ])'>
    <div class="panel-heading">
        <div>
            <p class="eyebrow">Class timetable</p>
            <h3>Choose the school track first, then assign the class schedule to the right teacher.</h3>
        </div>
        <p class="meta-copy">Each class can keep one saved timetable. Subject choices change with the selected school track.</p>
    </div>

    <div class="stack-form">
        <div class="form-grid">
            <label class="field">
                <span>Timetable title</span>
                <input type="text" name="title" value="{{ old('title', $timetable->title ?? '') }}" required placeholder="Standard 5 Main Timetable">
            </label>

            <label class="field">
                <span>Assigned teacher</span>
                <select name="assigned_teacher_id" data-teacher-select required>
                    <option value="">Choose a track first</option>
                </select>
            </label>
        </div>

        <div class="track-choice-grid">
            @foreach ($schoolTracks as $trackValue => $trackLabel)
                <label class="track-choice">
                    <input
                        type="radio"
                        name="school_track"
                        value="{{ $trackValue }}"
                        @checked($selectedTrack === $trackValue)
                        required>
                    <span>{{ $trackLabel }}</span>
                    <small>{{ $trackLabel }} classes, teachers, and subjects will be loaded into the form.</small>
                </label>
            @endforeach
        </div>

        <label class="field">
            <span>Class</span>
            <select name="class_name" data-class-select required>
                <option value="">Choose a track first</option>
            </select>
        </label>

        <label class="field">
            <span>Notes</span>
            <textarea name="notes" rows="4" placeholder="Assembly times, break rules, or other timetable notes.">{{ old('notes', $timetable->notes ?? '') }}</textarea>
        </label>

        <div class="panel-card schedule-builder">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Periods</p>
                    <h3>Build the weekly timetable rows</h3>
                </div>
                <button type="button" class="button button-secondary" data-add-entry>Add period</button>
            </div>

            <div class="schedule-entry-list" data-entry-list></div>
        </div>

        <div class="page-actions">
            <button type="submit" class="button button-primary">{{ isset($timetable) ? 'Save timetable' : 'Create timetable' }}</button>
        </div>
    </div>

    <template data-entry-template>
        <article class="schedule-entry" data-entry-row>
            <div class="schedule-entry-grid">
                <label class="field">
                    <span>Day</span>
                    <select name="entries[__INDEX__][day_of_week]" data-entry-day required></select>
                </label>

                <label class="field">
                    <span>Period</span>
                    <input type="text" name="entries[__INDEX__][period_label]" data-entry-period required placeholder="Period 1">
                </label>

                <label class="field">
                    <span>Start</span>
                    <input type="time" name="entries[__INDEX__][start_time]" data-entry-start>
                </label>

                <label class="field">
                    <span>End</span>
                    <input type="time" name="entries[__INDEX__][end_time]" data-entry-end>
                </label>

                <label class="field">
                    <span>Subject</span>
                    <select name="entries[__INDEX__][subject_id]" data-entry-subject required></select>
                </label>

                <label class="field">
                    <span>Room</span>
                    <input type="text" name="entries[__INDEX__][room]" data-entry-room placeholder="Room 2">
                </label>

                <label class="field field-span-2">
                    <span>Notes</span>
                    <input type="text" name="entries[__INDEX__][notes]" data-entry-notes placeholder="Double period, lab session, club hour">
                </label>
            </div>

            <div class="row-actions">
                <button type="button" class="text-button" data-remove-entry>Remove period</button>
            </div>
        </article>
    </template>
</section>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-timetable-form]').forEach(function (panel) {
            const payload = JSON.parse(panel.dataset.timetableForm || '{}')
            const classSelect = panel.querySelector('[data-class-select]')
            const teacherSelect = panel.querySelector('[data-teacher-select]')
            const entryList = panel.querySelector('[data-entry-list]')
            const addEntryButton = panel.querySelector('[data-add-entry]')
            const entryTemplate = panel.querySelector('[data-entry-template]')
            const trackInputs = Array.from(panel.querySelectorAll('input[name="school_track"]'))

            let selectedClass = payload.selectedClass || ''
            let selectedTeacherId = payload.selectedTeacherId || ''
            let entries = Array.isArray(payload.entries) && payload.entries.length
                ? payload.entries
                : [{ day_of_week: 'monday', period_label: '', start_time: '', end_time: '', subject_id: '', room: '', notes: '' }]

            const getSelectedTrack = function () {
                const checkedTrack = trackInputs.find(function (input) {
                    return input.checked
                })

                return checkedTrack ? checkedTrack.value : ''
            }

            const getSubjectsForTrack = function () {
                return payload.subjectsByTrack?.[getSelectedTrack()] || []
            }

            const getTeachersForTrack = function () {
                return payload.teachersByTrack?.[getSelectedTrack()] || []
            }

            const getClassesForTrack = function () {
                return payload.classesByTrack?.[getSelectedTrack()] || []
            }

            const syncClassOptions = function () {
                const classes = getClassesForTrack()
                classSelect.innerHTML = ''

                if (!classes.length) {
                    classSelect.append(new Option('Choose a track first', ''))
                    classSelect.value = ''
                    selectedClass = ''
                    return
                }

                classSelect.append(new Option('Select a class', ''))

                classes.forEach(function (className) {
                    classSelect.append(new Option(className, className))
                })

                if (classes.includes(selectedClass)) {
                    classSelect.value = selectedClass
                } else {
                    selectedClass = ''
                    classSelect.value = ''
                }
            }

            const syncTeacherOptions = function () {
                const teachers = getTeachersForTrack()
                teacherSelect.innerHTML = ''

                if (!teachers.length) {
                    teacherSelect.append(new Option('No active teachers on this track yet', ''))
                    teacherSelect.value = ''
                    selectedTeacherId = ''
                    return
                }

                teacherSelect.append(new Option('Select a teacher', ''))

                teachers.forEach(function (teacher) {
                    const label = teacher.assigned_class_name
                        ? teacher.name + ' - ' + teacher.assigned_class_name
                        : teacher.name

                    teacherSelect.append(new Option(label, String(teacher.id)))
                })

                const teacherIds = teachers.map(function (teacher) {
                    return String(teacher.id)
                })

                if (teacherIds.includes(selectedTeacherId)) {
                    teacherSelect.value = selectedTeacherId
                } else {
                    selectedTeacherId = ''
                    teacherSelect.value = ''
                }
            }

            const renderEntries = function () {
                entryList.innerHTML = ''
                const subjects = getSubjectsForTrack()
                const subjectIds = subjects.map(function (subject) {
                    return String(subject.id)
                })

                entries.forEach(function (entry, index) {
                    const wrapper = document.createElement('div')
                    wrapper.innerHTML = entryTemplate.innerHTML.replaceAll('__INDEX__', String(index))
                    const row = wrapper.firstElementChild
                    const daySelect = row.querySelector('[data-entry-day]')
                    const periodInput = row.querySelector('[data-entry-period]')
                    const startInput = row.querySelector('[data-entry-start]')
                    const endInput = row.querySelector('[data-entry-end]')
                    const subjectSelect = row.querySelector('[data-entry-subject]')
                    const roomInput = row.querySelector('[data-entry-room]')
                    const notesInput = row.querySelector('[data-entry-notes]')
                    const removeButton = row.querySelector('[data-remove-entry]')

                    Object.entries(payload.daysOfWeek || {}).forEach(function ([value, label]) {
                        daySelect.append(new Option(label, value))
                    })

                    subjectSelect.append(new Option(subjects.length ? 'Select a subject' : 'Add subjects for this track first', ''))
                    subjects.forEach(function (subject) {
                        const label = subject.code ? subject.name + ' (' + subject.code + ')' : subject.name
                        subjectSelect.append(new Option(label, String(subject.id)))
                    })

                    if (!subjectIds.includes(String(entry.subject_id || ''))) {
                        entry.subject_id = ''
                    }

                    daySelect.value = entry.day_of_week || 'monday'
                    periodInput.value = entry.period_label || ''
                    startInput.value = entry.start_time || ''
                    endInput.value = entry.end_time || ''
                    subjectSelect.value = String(entry.subject_id || '')
                    roomInput.value = entry.room || ''
                    notesInput.value = entry.notes || ''

                    daySelect.addEventListener('change', function () {
                        entries[index].day_of_week = daySelect.value
                    })
                    periodInput.addEventListener('input', function () {
                        entries[index].period_label = periodInput.value
                    })
                    startInput.addEventListener('input', function () {
                        entries[index].start_time = startInput.value
                    })
                    endInput.addEventListener('input', function () {
                        entries[index].end_time = endInput.value
                    })
                    subjectSelect.addEventListener('change', function () {
                        entries[index].subject_id = subjectSelect.value
                    })
                    roomInput.addEventListener('input', function () {
                        entries[index].room = roomInput.value
                    })
                    notesInput.addEventListener('input', function () {
                        entries[index].notes = notesInput.value
                    })
                    removeButton.addEventListener('click', function () {
                        entries = entries.filter(function (_, entryIndex) {
                            return entryIndex !== index
                        })

                        if (!entries.length) {
                            entries = [{ day_of_week: 'monday', period_label: '', start_time: '', end_time: '', subject_id: '', room: '', notes: '' }]
                        }

                        renderEntries()
                    })

                    entryList.append(row)
                })
            }

            trackInputs.forEach(function (input) {
                input.addEventListener('change', function () {
                    selectedClass = ''
                    selectedTeacherId = ''
                    entries = entries.map(function (entry) {
                        return { ...entry, subject_id: '' }
                    })
                    syncClassOptions()
                    syncTeacherOptions()
                    renderEntries()
                })
            })

            classSelect.addEventListener('change', function () {
                selectedClass = classSelect.value
            })

            teacherSelect.addEventListener('change', function () {
                selectedTeacherId = teacherSelect.value
            })

            addEntryButton.addEventListener('click', function () {
                entries.push({ day_of_week: 'monday', period_label: '', start_time: '', end_time: '', subject_id: '', room: '', notes: '' })
                renderEntries()
            })

            syncClassOptions()
            syncTeacherOptions()
            renderEntries()
        })
    })
</script>
