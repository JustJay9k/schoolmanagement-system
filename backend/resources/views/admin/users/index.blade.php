@extends('admin.layouts.app')

@php
    $pageTitle = 'User Management';
    $pageEyebrow = 'Administration';
@endphp

@section('page_actions')
    <a href="{{ route('admin.users.create') }}" class="button button-primary">Create user</a>
@endsection

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Account roster</p>
                <h3>All system users, roles, email addresses, and class responsibility.</h3>
            </div>
            <p class="meta-copy">Administrators can create accounts, assign primary or secondary classes to teachers, and quickly disable or re-enable access from this screen.</p>
        </div>
    </section>

    <section class="metric-grid compact-grid">
        <article class="metric-card">
            <p>Total users</p>
            <strong>{{ number_format($stats['total']) }}</strong>
        </article>
        <article class="metric-card">
            <p>Administrators</p>
            <strong>{{ number_format($stats['admins']) }}</strong>
        </article>
        <article class="metric-card">
            <p>Active accounts</p>
            <strong>{{ number_format($stats['active']) }}</strong>
        </article>
        <article class="metric-card">
            <p>Suspended</p>
            <strong>{{ number_format($stats['suspended']) }}</strong>
        </article>
    </section>

    <section class="panel-card">
        <form method="GET" action="{{ route('admin.users.index') }}" class="filter-grid">
            <label class="field">
                <span>Search</span>
                <input type="search" name="search" value="{{ $filters['search'] }}" placeholder="Name or email">
            </label>

            <label class="field">
                <span>Role</span>
                <select name="role">
                    <option value="">All roles</option>
                    @foreach ($roles as $role)
                        <option value="{{ $role->value }}" @selected($filters['role'] === $role->value)>{{ $role->label() }}</option>
                    @endforeach
                </select>
            </label>

            <label class="field">
                <span>Status</span>
                <select name="status">
                    <option value="">All statuses</option>
                    @foreach ($statuses as $status)
                        <option value="{{ $status->value }}" @selected($filters['status'] === $status->value)>{{ $status->label() }}</option>
                    @endforeach
                </select>
            </label>

            <div class="filter-actions">
                <button type="submit" class="button button-primary">Apply filters</button>
                <a href="{{ route('admin.users.index') }}" class="button button-secondary">Reset</a>
            </div>
        </form>
    </section>

    <section class="panel-card">
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Assignment</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Created</th>
                        <th>Last login</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($users as $user)
                        <tr>
                            <td>
                                <strong>{{ $user->name }}</strong>
                                <span>{{ $user->email }}</span>
                            </td>
                            <td>{{ $user->role->label() }}</td>
                            <td>
                                @if ($user->school_track && $user->assigned_class_name)
                                    <strong>{{ ucfirst($user->school_track) }}</strong>
                                    <span>{{ $user->assigned_class_name }}</span>
                                @else
                                    <span>All-school access</span>
                                @endif
                            </td>
                            <td><span class="badge badge-{{ $user->status->value }}">{{ $user->status->label() }}</span></td>
                            <td>{{ $user->email_verified_at ? 'Verified' : 'Pending' }}</td>
                            <td>{{ $user->created_at?->format('M d, Y') }}</td>
                            <td>{{ $user->last_login_at?->diffForHumans() ?? 'Never' }}</td>
                            <td>
                                <div class="row-actions">
                                    <a href="{{ route('admin.users.edit', $user) }}" class="text-link">Edit</a>
                                    <form method="POST" action="{{ route('admin.users.status', $user) }}">
                                        @csrf
                                        @method('PATCH')
                                        <button type="submit" class="text-button">
                                            {{ $user->status->value === \App\Enums\UserStatus::Active->value ? 'Disable' : 'Enable' }}
                                        </button>
                                    </form>
                                    <form method="POST" action="{{ route('admin.users.destroy', $user) }}" onsubmit="return confirm('Delete this user account?');">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-button">Delete</button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8" class="empty-state">No users matched the current filters.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="pagination-wrap">
            {{ $users->links() }}
        </div>
    </section>
@endsection
