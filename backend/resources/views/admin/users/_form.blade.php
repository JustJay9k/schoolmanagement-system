@php
    $selectedRole = old('role', isset($userModel) ? $userModel->role->value : \App\Enums\UserRole::Staff->value);
    $selectedTrack = old('school_track', $userModel->school_track ?? '');
    $selectedClass = old('assigned_class_name', $userModel->assigned_class_name ?? '');
@endphp

<div class="form-grid">
    <label class="field">
        <span>Full name</span>
        <input type="text" name="name" value="{{ old('name', $userModel->name ?? '') }}" required>
    </label>

    <label class="field">
        <span>Email address</span>
        <input type="email" name="email" value="{{ old('email', $userModel->email ?? '') }}" required>
    </label>

    <label class="field">
        <span>Role</span>
        <select name="role" required>
            @foreach ($roles as $role)
                <option value="{{ $role->value }}" @selected(old('role', isset($userModel) ? $userModel->role->value : \App\Enums\UserRole::Staff->value) === $role->value)>
                    {{ $role->label() }}
                </option>
            @endforeach
        </select>
    </label>

    <label class="field">
        <span>Status</span>
        <select name="status" required>
            @foreach ($statuses as $status)
                <option value="{{ $status->value }}" @selected(old('status', isset($userModel) ? $userModel->status->value : \App\Enums\UserStatus::Active->value) === $status->value)>
                    {{ $status->label() }}
                </option>
            @endforeach
        </select>
    </label>

    <section
        class="field field-span-2 teacher-assignment-panel"
        data-teacher-assignment='@json([
            "role" => $selectedRole,
            "track" => $selectedTrack,
            "className" => $selectedClass,
            "classesByTrack" => $classesByTrack,
            "takenClassesByTrack" => $takenClassesByTrack,
        ])'
        @if ($selectedRole !== \App\Enums\UserRole::Teacher->value) hidden @endif>
        <span>Teacher class assignment</span>

        <div class="track-choice-grid">
            @foreach ($schoolTracks as $trackValue => $trackLabel)
                <label class="track-choice">
                    <input
                        type="radio"
                        name="school_track"
                        value="{{ $trackValue }}"
                        @checked($selectedTrack === $trackValue)>
                    <span>{{ $trackLabel }}</span>
                    <small>Teachers in {{ strtolower($trackLabel) }} only see this school track.</small>
                </label>
            @endforeach
        </div>

        <label class="field">
            <span>Assigned class</span>
            <select name="assigned_class_name" data-class-select>
                <option value="">Choose a track first</option>
            </select>
        </label>

        <p class="helper-copy">
            Each teacher can manage only one class, and each class can be assigned to only one teacher.
        </p>
    </section>

    <label class="field">
        <span>Password {{ isset($userModel) ? '(leave blank to keep current)' : '' }}</span>
        <input type="password" name="password" {{ isset($userModel) ? '' : 'required' }}>
    </label>

    <label class="field">
        <span>Confirm password</span>
        <input type="password" name="password_confirmation" {{ isset($userModel) ? '' : 'required' }}>
    </label>
</div>

<p class="helper-copy">
    Teachers must be assigned exactly one class and one track. Management and other roles can be left without a class assignment.
</p>

<label class="checkbox-row">
    <input type="checkbox" name="email_verified" value="1" @checked(old('email_verified', isset($userModel) ? (bool) $userModel->email_verified_at : false))>
    <span>Mark email address as verified</span>
</label>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-teacher-assignment]').forEach(function (panel) {
            const payload = JSON.parse(panel.dataset.teacherAssignment || '{}')
            const form = panel.closest('form')
            const roleSelect = form?.querySelector('select[name="role"]')
            const trackInputs = Array.from(panel.querySelectorAll('input[name="school_track"]'))
            const classSelect = panel.querySelector('[data-class-select]')
            const classesByTrack = payload.classesByTrack || {}
            const takenClassesByTrack = payload.takenClassesByTrack || {}
            let currentClass = payload.className || ''

            if (!form || !roleSelect || !classSelect) {
                return
            }

            const getSelectedTrack = function () {
                const checkedInput = trackInputs.find(function (input) {
                    return input.checked
                })

                return checkedInput ? checkedInput.value : ''
            }

            const syncPanelVisibility = function () {
                const isTeacher = roleSelect.value === 'teacher'

                panel.hidden = !isTeacher

                if (!isTeacher) {
                    trackInputs.forEach(function (input) {
                        input.checked = false
                    })
                    classSelect.innerHTML = '<option value="">No class assignment</option>'
                    classSelect.value = ''
                }
            }

            const populateClassOptions = function () {
                const selectedTrack = getSelectedTrack()
                const classes = classesByTrack[selectedTrack] || []
                const takenClasses = takenClassesByTrack[selectedTrack] || []

                classSelect.innerHTML = ''

                if (!selectedTrack) {
                    classSelect.append(new Option('Choose a track first', ''))
                    classSelect.value = ''
                    return
                }

                classSelect.append(new Option('Select a class', ''))

                classes.forEach(function (className) {
                    const isTaken = takenClasses.includes(className)
                    const label = isTaken ? className + ' (already assigned)' : className
                    const option = new Option(label, className)

                    option.disabled = isTaken
                    option.selected = className === currentClass && !isTaken

                    classSelect.append(option)
                })

                if (!classSelect.value && currentClass && classes.includes(currentClass) && !takenClasses.includes(currentClass)) {
                    classSelect.value = currentClass
                }
            }

            roleSelect.addEventListener('change', function () {
                syncPanelVisibility()
                populateClassOptions()
            })

            trackInputs.forEach(function (input) {
                input.addEventListener('change', function () {
                    currentClass = ''
                    populateClassOptions()
                })
            })

            classSelect.addEventListener('change', function () {
                currentClass = classSelect.value
            })

            syncPanelVisibility()
            populateClassOptions()
        })
    })
</script>
