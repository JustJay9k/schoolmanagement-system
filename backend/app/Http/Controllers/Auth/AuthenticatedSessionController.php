<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AuthenticatedSessionController extends Controller
{
    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): JsonResponse|Response
    {
        $request->authenticate();

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
        $request->user()?->forceFill([
            'last_login_at' => now(),
            'email_verified_at' => $request->user()?->email_verified_at ?? now(),
        ])->save();

        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'token' => $request->user()?->createToken('frontend')->plainTextToken,
            ]);
        }

        return response()->noContent();
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): Response
    {
        $request->user()?->currentAccessToken()?->delete();

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();

            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }
}
