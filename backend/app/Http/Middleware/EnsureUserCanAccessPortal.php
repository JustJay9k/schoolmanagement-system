<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserCanAccessPortal
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->isAdmin() && $request->user()->schoolIsLocked()) {
            abort(403, 'Your school has been locked by the administrator. Actions are unavailable until it is unlocked.');
        }

        abort_unless(
            $request->user()?->canAccessPortal(),
            403,
            'You do not have permission to access this portal.',
        );

        return $next($request);
    }
}
