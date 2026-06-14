@extends('admin.layouts.app')

@php
    $pageTitle = 'School Subjects';
    $pageEyebrow = 'Timetable setup';
@endphp

@section('content')
    <section class="content-grid">
        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Subject registry</p>
                    <h3>Capture the subjects your school teaches before building timetables.</h3>
                </div>
                <p class="meta-copy">Use the track selector to separate primary subjects from secondary subjects.</p>
            </div>

            <form method="POST" action="{{ route('admin.subjects.store') }}" class="stack-form">
                @csrf

                <div class="form-grid">
                    <label class="field">
                        <span>Subject name</span>
                        <input type="text" name="name" value="{{ old('name') }}" required placeholder="Mathematics">
                    </label>

                    <label class="field">
                        <span>Code</span>
                        <input type="text" name="code" value="{{ old('code') }}" placeholder="MATH">
                    </label>

                    <label class="field field-span-2">
                        <span>School track</span>
                        <select name="school_track" required>
                            <option value="">Choose a track</option>
                            @foreach ($schoolTracks as $trackValue => $trackLabel)
                                <option value="{{ $trackValue }}" @selected(old('school_track') === $trackValue)>{{ $trackLabel }}</option>
                            @endforeach
                        </select>
                    </label>
                </div>

                <div class="page-actions">
                    <button type="submit" class="button button-primary">Save subject</button>
                </div>
            </form>
        </div>

        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Coverage</p>
                    <h3>Subject totals by track</h3>
                </div>
            </div>

            <div class="stack-list">
                @foreach ($schoolTracks as $trackValue => $trackLabel)
                    <div class="stat-row">
                        <span>{{ $trackLabel }}</span>
                        <strong>{{ number_format(($subjects[$trackValue] ?? collect())->count()) }}</strong>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    @foreach ($schoolTracks as $trackValue => $trackLabel)
        <section class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">{{ $trackLabel }}</p>
                    <h3>{{ $trackLabel }} subjects</h3>
                </div>
            </div>

            <div class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Code</th>
                            <th>Added by</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($subjects[$trackValue] ?? collect() as $subject)
                            <tr>
                                <td><strong>{{ $subject->name }}</strong></td>
                                <td>{{ $subject->code ?: 'N/A' }}</td>
                                <td>{{ $subject->creator?->name ?? 'System' }}</td>
                                <td>
                                    <div class="row-actions">
                                        <a href="{{ route('admin.subjects.edit', $subject) }}" class="text-link">Edit</a>
                                        <form method="POST" action="{{ route('admin.subjects.destroy', $subject) }}">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="text-button">Delete</button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" class="empty-state">No {{ strtolower($trackLabel) }} subjects have been added yet.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </section>
    @endforeach
@endsection
