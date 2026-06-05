<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class VerifyEmailController extends Controller
{
    /**
     * Mark the user's email address as verified from the signed email link.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $user = User::query()->findOrFail($request->route('id'));

        if (! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
            throw new AccessDeniedHttpException('Invalid verification link.');
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        $frontendPath = $request->user()?->is($user)
            ? '/dashboard?verified=1'
            : '/login?verified=1';

        return redirect()->away(config('app.frontend_url').$frontendPath);
    }
}
