@extends('admin.layouts.app')

@php
    $pageTitle = 'Edit Subject';
    $pageEyebrow = 'Timetable setup';
@endphp

@section('page_actions')
    <a href="{{ route('admin.subjects.index') }}" class="button button-secondary">Back to subjects</a>
@endsection

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Update subject</p>
                <h3>Keep subject naming aligned with how your school builds timetables.</h3>
            </div>
        </div>

        <form method="POST" action="{{ route('admin.subjects.update', $subject) }}" class="stack-form">
            @csrf
            @method('PUT')

            <div class="form-grid">
                <label class="field">
                    <span>Subject name</span>
                    <input type="text" name="name" value="{{ old('name', $subject->name) }}" required>
                </label>

                <label class="field">
                    <span>Code</span>
                    <input type="text" name="code" value="{{ old('code', $subject->code) }}">
                </label>

                <label class="field field-span-2">
                    <span>School track</span>
                    <select name="school_track" required>
                        @foreach ($schoolTracks as $trackValue => $trackLabel)
                            <option value="{{ $trackValue }}" @selected(old('school_track', $subject->school_track) === $trackValue)>{{ $trackLabel }}</option>
                        @endforeach
                    </select>
                </label>
            </div>

            <div class="page-actions">
                <button type="submit" class="button button-primary">Save changes</button>
            </div>
        </form>
    </section>
@endsection
