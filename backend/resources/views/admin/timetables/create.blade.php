@extends('admin.layouts.app')

@php
    $pageTitle = 'Create Timetable';
    $pageEyebrow = 'Head teacher tools';
@endphp

@section('page_actions')
    <a href="{{ route('admin.timetables.index') }}" class="button button-secondary">Back to timetables</a>
@endsection

@section('content')
    <form method="POST" action="{{ route('admin.timetables.store') }}" class="stack-form">
        @csrf
        @include('admin.timetables._form')
    </form>
@endsection
