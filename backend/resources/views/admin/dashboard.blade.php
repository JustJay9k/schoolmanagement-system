@extends('admin.layouts.app')

@php
    $pageTitle = 'Operational Overview';
    $pageEyebrow = 'School portal';
@endphp

@section('page_actions')
    @if ($currentUser?->canManageAdministration())
        <a href="{{ route('admin.users.create') }}" class="button button-primary">Add user</a>
    @endif
@endsection

@section('content')
    <section class="hero-panel">
        <div>
            <p class="eyebrow">{{ $currentUser?->isTeacher() ? 'Teacher workspace' : 'Control center' }}</p>
            <h3>
                {{ $currentUser?->isTeacher()
                    ? 'Your assigned class schedules stay visible without exposing the rest of school administration.'
                    : 'Control subjects, class timetables, and user access from one operational surface.' }}
            </h3>
        </div>
        <p class="hero-copy">
            {{ $currentUser?->isTeacher()
                ? 'Teachers only see timetables assigned to them, while head teachers and administrators can set up subjects and publish class-by-class timetables across primary and secondary tracks.'
                : 'Head teachers can now define subjects, choose whether a timetable belongs to primary or secondary school, and assign each class timetable to the correct teacher account.' }}
        </p>
    </section>

    <section class="metric-grid">
        @foreach ($summaryCards as $card)
            <article class="metric-card">
                <p>{{ $card['label'] }}</p>
                <strong>{{ is_numeric($card['value']) ? number_format($card['value']) : $card['value'] }}</strong>
                <span>{{ $card['hint'] }}</span>
            </article>
        @endforeach
    </section>

    <section class="content-grid">
        <div class="panel-card">
            <div class="panel-heading">
                <p class="eyebrow">Admin modules</p>
                <h3>Priority areas</h3>
            </div>
            <div class="module-grid">
                @foreach ($modules as $module)
                    <article class="module-card">
                        <span class="metric-pulse">{{ $module['metric'] }}</span>
                        <h4>{{ $module['title'] }}</h4>
                        <p>{{ $module['detail'] }}</p>
                        <a href="{{ $module['action_url'] }}" class="text-link">{{ $module['action_label'] }}</a>
                    </article>
                @endforeach
            </div>
        </div>

        <div class="panel-card">
            <div class="panel-heading">
                <p class="eyebrow">System posture</p>
                <h3>Runtime snapshot</h3>
            </div>
            <dl class="definition-grid">
                @foreach ($systemStatus as $item)
                    <div>
                        <dt>{{ $item['label'] }}</dt>
                        <dd>{{ $item['value'] }}</dd>
                    </div>
                @endforeach
            </dl>
        </div>
    </section>

    @if ($currentUser?->canManageAdministration())
        <section class="content-grid">
            <div class="panel-card">
                <div class="panel-heading">
                    <p class="eyebrow">Role mix</p>
                    <h3>Who exists in the system</h3>
                </div>
                <div class="stack-list">
                    @forelse ($roleBreakdown as $row)
                        <div class="stat-row">
                            <span>{{ $row['role']->label() }}</span>
                            <strong>{{ number_format($row['total']) }}</strong>
                        </div>
                    @empty
                        <p class="empty-state">No accounts have been created yet.</p>
                    @endforelse
                </div>
            </div>

            <div class="panel-card">
                <div class="panel-heading">
                    <p class="eyebrow">Status mix</p>
                    <h3>Account readiness</h3>
                </div>
                <div class="stack-list">
                    @forelse ($statusBreakdown as $row)
                        <div class="stat-row">
                            <span>{{ $row['status']->label() }}</span>
                            <strong>{{ number_format($row['total']) }}</strong>
                        </div>
                    @empty
                        <p class="empty-state">No account statuses are available yet.</p>
                    @endforelse
                </div>
            </div>
        </section>

        <section class="panel-card">
            <div class="panel-heading">
                <p class="eyebrow">Recent accounts</p>
                <h3>Latest user activity</h3>
            </div>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Verified</th>
                            <th>Last login</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($recentUsers as $user)
                            <tr>
                                <td>
                                    <strong>{{ $user->name }}</strong>
                                    <span>{{ $user->email }}</span>
                                </td>
                                <td>{{ $user->role->label() }}</td>
                                <td><span class="badge badge-{{ $user->status->value }}">{{ $user->status->label() }}</span></td>
                                <td>{{ $user->email_verified_at ? 'Verified' : 'Pending' }}</td>
                                <td>{{ $user->last_login_at?->diffForHumans() ?? 'Never' }}</td>
                                <td><a href="{{ route('admin.users.edit', $user) }}" class="text-link">Edit</a></td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" class="empty-state">No user activity yet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </section>
    @endif
@endsection
