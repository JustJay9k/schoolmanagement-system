<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ ($pageTitle ?? 'School Portal') . ' | Phunziro Class Management System (PCMS)' }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/tokens.css') }}">
    <link rel="stylesheet" href="{{ asset('css/admin.css') }}">
</head>
<body>
    <div class="admin-shell">
        <aside class="sidebar-card">
            <div class="brand-lockup">
                <span class="brand-chip">PCMS</span>
                <h1>School operations workspace</h1>
                <p>Coordinate classes, subjects, staff access, and class timetables from one control surface.</p>
            </div>

            <nav class="sidebar-nav" aria-label="Primary">
                <a href="{{ route('dashboard') }}" @class(['is-active' => request()->routeIs('dashboard')])>
                    <span>Overview</span>
                    <small>Role-based snapshot and activity</small>
                </a>
                @if (auth()->user()->canManageTimetables())
                    <a href="{{ route('admin.subjects.index') }}" @class(['is-active' => request()->routeIs('admin.subjects.*')])>
                        <span>Subjects</span>
                        <small>Configure primary and secondary subjects</small>
                    </a>
                    <a href="{{ route('admin.timetables.index') }}" @class(['is-active' => request()->routeIs('admin.timetables.*')])>
                        <span>Timetables</span>
                        <small>Create class schedules and assign teachers</small>
                    </a>
                @endif
                @if (auth()->user()->canManageAdministration())
                    <a href="{{ route('admin.school-structure.edit') }}" @class(['is-active' => request()->routeIs('admin.school-structure.*')])>
                        <span>School structure</span>
                        <small>Primary and secondary class setup</small>
                    </a>
                    <a href="{{ route('admin.users.index') }}" @class(['is-active' => request()->routeIs('admin.users.*')])>
                        <span>User accounts</span>
                        <small>Roster, roles, classes, and access control</small>
                    </a>
                @endif
                @if (auth()->user()->isTeacher())
                    <a href="{{ route('teacher.timetables.index') }}" @class(['is-active' => request()->routeIs('teacher.timetables.*')])>
                        <span>My timetables</span>
                        <small>Schedules assigned directly to you</small>
                    </a>
                @endif
            </nav>

            <section class="sidebar-callout">
                <p class="eyebrow">Signed in as</p>
                <strong>{{ auth()->user()->name }}</strong>
                <p>{{ auth()->user()->email }}</p>
                <form method="POST" action="{{ route('admin.logout') }}">
                    @csrf
                    <button type="submit" class="button button-secondary">Sign out</button>
                </form>
            </section>
        </aside>

        <main class="main-stage">
            <header class="page-header">
                <div>
                    <p class="eyebrow">{{ $pageEyebrow ?? 'Administration' }}</p>
                    <h2>{{ $pageTitle ?? 'Admin Dashboard' }}</h2>
                </div>
                @hasSection('page_actions')
                    <div class="page-actions">
                    @yield('page_actions')
                </div>
                @endif
            </header>

            @if (session('status'))
                <div class="flash flash-success">{{ session('status') }}</div>
            @endif

            @if ($errors->any())
                <div class="flash flash-danger">
                    <strong>Action could not be completed.</strong>
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            @yield('content')
        </main>
    </div>
</body>
</html>
