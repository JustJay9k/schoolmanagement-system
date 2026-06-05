@extends('admin.layouts.app')

@php
    $pageTitle = 'School Structure';
    $pageEyebrow = 'Administration';
@endphp

@section('page_actions')
    <a href="{{ route('admin.users.create') }}" class="button button-secondary">Create teacher account</a>
@endsection

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Class configuration</p>
                <h3>Control how classes appear during onboarding and teacher assignment.</h3>
            </div>
            <p class="meta-copy">Enter one class per line. Changes apply to registration, admin account creation, and class assignment rules.</p>
        </div>

        <div class="definition-grid">
            <div>
                <dt>Primary default</dt>
                <dd>{{ implode(', ', $defaultClassesByTrack['primary']) }}</dd>
            </div>
            <div>
                <dt>Secondary default</dt>
                <dd>{{ implode(', ', $defaultClassesByTrack['secondary']) }}</dd>
            </div>
            <div>
                <dt>Primary teachers assigned</dt>
                <dd>{{ number_format($teacherCountsByTrack['primary']) }}</dd>
            </div>
            <div>
                <dt>Secondary teachers assigned</dt>
                <dd>{{ number_format($teacherCountsByTrack['secondary']) }}</dd>
            </div>
        </div>
    </section>

    <section class="panel-card">
        <form method="POST" action="{{ route('admin.school-structure.update') }}" class="stack-form">
            @csrf
            @method('PUT')

            <div class="form-grid">
                <label class="field">
                    <span>Primary classes</span>
                    <textarea
                        name="primary_classes"
                        rows="12"
                        placeholder="Standard 1&#10;Standard 2&#10;Standard 3">{{ old('primary_classes', implode(PHP_EOL, $classesByTrack['primary'])) }}</textarea>
                    <small>These names feed teacher onboarding and the admin user form for primary teachers.</small>
                    @error('classes_by_track.primary')
                        <small class="field-error">{{ $message }}</small>
                    @enderror
                    @error('classes_by_track.primary.*')
                        <small class="field-error">{{ $message }}</small>
                    @enderror
                </label>

                <label class="field">
                    <span>Secondary classes</span>
                    <textarea
                        name="secondary_classes"
                        rows="12"
                        placeholder="Form 1&#10;Form 2&#10;Form 3">{{ old('secondary_classes', implode(PHP_EOL, $classesByTrack['secondary'])) }}</textarea>
                    <small>Use the exact naming pattern your school follows, such as streams or custom labels.</small>
                    @error('classes_by_track.secondary')
                        <small class="field-error">{{ $message }}</small>
                    @enderror
                    @error('classes_by_track.secondary.*')
                        <small class="field-error">{{ $message }}</small>
                    @enderror
                </label>
            </div>

            <p class="helper-copy">
                You cannot remove or rename a class that is already assigned to a teacher until that teacher is moved to another class.
            </p>

            @error('classes_by_track')
                <p class="field-error">{{ $message }}</p>
            @enderror

            <div class="page-actions">
                <button type="submit" class="button button-primary">Save school structure</button>
            </div>
        </form>
    </section>
@endsection
