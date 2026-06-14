@extends('admin.layouts.app')

@php
    $pageTitle = $timetable->title;
    $pageEyebrow = $canManageTimetable ? 'Timetable details' : 'My timetable';
@endphp

@if ($canManageTimetable)
    @section('page_actions')
        <a href="{{ route('admin.timetables.edit', $timetable) }}" class="button button-primary">Edit timetable</a>
    @endsection
@endif

@section('content')
    <section class="content-grid">
        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">{{ $trackLabels[$timetable->school_track] ?? ucfirst($timetable->school_track) }}</p>
                    <h3>{{ $timetable->class_name }}</h3>
                </div>
                <span class="metric-pulse">{{ $timetable->entries->count() }} periods</span>
            </div>

            <div class="definition-grid">
                <div>
                    <dt>Assigned teacher</dt>
                    <dd>{{ $timetable->assignedTeacher?->name ?? 'Unassigned' }}</dd>
                </div>
                <div>
                    <dt>Created by</dt>
                    <dd>{{ $timetable->creator?->name ?? 'System' }}</dd>
                </div>
                <div>
                    <dt>Track</dt>
                    <dd>{{ $trackLabels[$timetable->school_track] ?? ucfirst($timetable->school_track) }}</dd>
                </div>
                <div>
                    <dt>Class</dt>
                    <dd>{{ $timetable->class_name }}</dd>
                </div>
            </div>

            @if ($timetable->notes)
                <p class="helper-copy">{{ $timetable->notes }}</p>
            @endif
        </div>

        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Weekly layout</p>
                    <h3>Schedule by day</h3>
                </div>
            </div>

            <div class="schedule-day-list">
                @foreach ($daysOfWeek as $dayValue => $dayLabel)
                    @php
                        $entries = $timetable->entries->where('day_of_week', $dayValue)->values();
                    @endphp
                    <article class="schedule-day-card">
                        <h4>{{ $dayLabel }}</h4>

                        @forelse ($entries as $entry)
                            <div class="schedule-slot">
                                <strong>{{ $entry->period_label }}</strong>
                                <span>{{ $entry->subject?->name ?? 'Subject missing' }}</span>
                                <small>
                                    {{ $entry->start_time ? \Illuminate\Support\Carbon::parse($entry->start_time)->format('H:i') : '--:--' }}
                                    -
                                    {{ $entry->end_time ? \Illuminate\Support\Carbon::parse($entry->end_time)->format('H:i') : '--:--' }}
                                    @if ($entry->room)
                                        | {{ $entry->room }}
                                    @endif
                                </small>
                                @if ($entry->notes)
                                    <p>{{ $entry->notes }}</p>
                                @endif
                            </div>
                        @empty
                            <p class="empty-state">No periods saved for {{ strtolower($dayLabel) }}.</p>
                        @endforelse
                    </article>
                @endforeach
            </div>
        </div>
    </section>
@endsection
