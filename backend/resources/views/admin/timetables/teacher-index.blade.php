@extends('admin.layouts.app')

@php
    $pageTitle = 'My Timetables';
    $pageEyebrow = 'Teacher workspace';
@endphp

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Assigned schedules</p>
                <h3>Only timetables assigned to your teacher account appear here.</h3>
            </div>
        </div>

        <div class="feature-grid">
            @forelse ($timetables as $timetable)
                <article class="feature-card">
                    <span class="metric-pulse">{{ $trackLabels[$timetable->school_track] ?? ucfirst($timetable->school_track) }}</span>
                    <h4>{{ $timetable->title }}</h4>
                    <p>{{ $timetable->class_name }}</p>
                    <small>{{ $timetable->entries->count() }} periods assigned</small>
                    <a href="{{ route('teacher.timetables.show', $timetable) }}" class="text-link">Open timetable</a>
                </article>
            @empty
                <p class="empty-state">No timetable has been assigned to your teacher account yet.</p>
            @endforelse
        </div>
    </section>
@endsection
