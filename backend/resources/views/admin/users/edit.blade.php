@extends('admin.layouts.app')

@php
    $pageTitle = 'Edit User';
    $pageEyebrow = 'User management';
@endphp

@section('page_actions')
    <a href="{{ route('admin.users.index') }}" class="button button-secondary">Back to users</a>
@endsection

@section('content')
    <section class="panel-card">
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Account maintenance</p>
                <h3>{{ $userModel->name }}</h3>
            </div>
            <p class="meta-copy">Last login: {{ $userModel->last_login_at?->diffForHumans() ?? 'Never recorded' }}</p>
        </div>

        <form method="POST" action="{{ route('admin.users.update', $userModel) }}" class="stack-form">
            @csrf
            @method('PUT')
            @include('admin.users._form')
            <button type="submit" class="button button-primary">Save changes</button>
        </form>
    </section>
@endsection
