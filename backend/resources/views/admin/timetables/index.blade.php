@extends('admin.layouts.app')

@php
    $pageTitle = 'Class Timetables';
    $pageEyebrow = 'Head teacher tools';
@endphp

@section('page_actions')
    <a href="{{ route('admin.timetables.create') }}" class="button button-primary">Create timetable</a>
@endsection

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Timetable roster</p>
                <h3>One timetable per class, with a teacher account attached to it.</h3>
            </div>
            <p class="meta-copy">Choose the school track during creation so primary and secondary schedules stay separate.</p>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Track</th>
                        <th>Class</th>
                        <th>Teacher</th>
                        <th>Periods</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @forelse ($timetables as $timetable)
                        <tr>
                            <td>
                                <strong>{{ $timetable->title }}</strong>
                                <span>{{ $timetable->notes ?: 'No extra notes.' }}</span>
                            </td>
                            <td>{{ $trackLabels[$timetable->school_track] ?? ucfirst($timetable->school_track) }}</td>
                            <td>{{ $timetable->class_name }}</td>
                            <td>{{ $timetable->assignedTeacher?->name ?? 'Unassigned' }}</td>
                            <td>{{ number_format($timetable->entries->count()) }}</td>
                            <td>
                                <div class="row-actions">
                                    <a href="{{ route('admin.timetables.show', $timetable) }}" class="text-link">View</a>
                                    <a href="{{ route('admin.timetables.edit', $timetable) }}" class="text-link">Edit</a>
                                    <form method="POST" action="{{ route('admin.timetables.destroy', $timetable) }}">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-button">Delete</button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="6" class="empty-state">No class timetables have been created yet.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>
@endsection
