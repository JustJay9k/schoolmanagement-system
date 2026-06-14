<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>School Portal Login | Phunziro Class Management System (PCMS)</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/tokens.css') }}">
    <link rel="stylesheet" href="{{ asset('css/admin.css') }}">
</head>
<body class="login-page">
    <main class="login-shell">
        <section class="login-hero">
            <p class="eyebrow">Phunziro Class Management System (PCMS)</p>
            <h1>School operations without the clutter.</h1>
            <p class="hero-copy">This portal is for active administrators, head teachers, and teachers. Use it to manage users, define school subjects, and work with class timetables.</p>

            <div class="hero-grid">
                <article>
                    <span class="hero-stat">Users</span>
                    <p>Manage staff, teachers, students, and guardians from one roster.</p>
                </article>
                <article>
                    <span class="hero-stat">Subjects</span>
                    <p>Keep separate primary and secondary subject lists ready for scheduling.</p>
                </article>
                <article>
                    <span class="hero-stat">Timetables</span>
                    <p>Assign class schedules to teachers so each teacher sees the timetable meant for them.</p>
                </article>
            </div>
        </section>

        <section class="panel-card login-card">
            <div class="panel-heading">
                <p class="eyebrow">Secure access</p>
                <h2>School portal sign in</h2>
            </div>

            @if ($errors->any())
                <div class="flash flash-danger">
                    <ul>
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <form method="POST" action="{{ route('admin.login.store') }}" class="stack-form">
                @csrf

                <label class="field">
                    <span>Email address</span>
                    <input type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="username">
                </label>

                <label class="field">
                    <span>Password</span>
                    <input type="password" name="password" required autocomplete="current-password">
                </label>

                <label class="checkbox-row">
                    <input type="checkbox" name="remember" value="1" @checked(old('remember'))>
                    <span>Keep this browser signed in</span>
                </label>

                <button type="submit" class="button button-primary button-block">Enter school portal</button>
            </form>

            @if (app()->isLocal())
                <p class="login-note">
                    Seeded administrator defaults to
                    <code>{{ env('ADMIN_EMAIL', 'admin@school.test') }}</code>
                    with password
                    <code>{{ env('ADMIN_PASSWORD', 'password') }}</code>.
                    The seeded <code>test@example.com</code> account is a management user and can now sign in here.
                </p>
            @endif
        </section>
    </main>
</body>
</html>
