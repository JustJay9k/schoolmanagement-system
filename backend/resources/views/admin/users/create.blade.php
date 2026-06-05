@extends('admin.layouts.app')

@php
    $pageTitle = 'Create User';
    $pageEyebrow = 'User management';
@endphp

@section('page_actions')
    <a href="{{ route('admin.users.index') }}" class="button button-secondary">Back to users</a>
@endsection

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <p class="eyebrow">New account</p>
            <h3>Create a user for the school system</h3>
        </div>

        <form method="POST" action="{{ route('admin.users.store') }}" class="stack-form">
            @csrf
            @include('admin.users._form')
            <button type="submit" class="button button-primary">Create account</button>
        </form>
    </section>
@endsection
