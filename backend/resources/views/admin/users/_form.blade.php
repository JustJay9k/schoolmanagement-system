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

    <label class="field">
        <span>Password {{ isset($userModel) ? '(leave blank to keep current)' : '' }}</span>
        <input type="password" name="password" {{ isset($userModel) ? '' : 'required' }}>
    </label>

    <label class="field">
        <span>Confirm password</span>
        <input type="password" name="password_confirmation" {{ isset($userModel) ? '' : 'required' }}>
    </label>
</div>

<label class="checkbox-row">
    <input type="checkbox" name="email_verified" value="1" @checked(old('email_verified', isset($userModel) ? (bool) $userModel->email_verified_at : false))>
    <span>Mark email address as verified</span>
</label>
