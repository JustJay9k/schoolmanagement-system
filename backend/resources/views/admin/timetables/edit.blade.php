@extends('admin.layouts.app')

@php
    $pageTitle = 'Edit Timetable';
    $pageEyebrow = 'Head teacher tools';
@endphp

@section('page_actions')
    <a href="{{ route('admin.timetables.show', $timetable) }}" class="button button-secondary">Back to timetable</a>
@endsection

@section('content')
    <form method="POST" action="{{ route('admin.timetables.update', $timetable) }}" class="stack-form">
        @csrf
        @method('PUT')
        @include('admin.timetables._form')
    </form>
@endsection
