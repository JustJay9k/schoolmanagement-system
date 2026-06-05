<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\SchoolContextOptions;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    public function options(): JsonResponse
    {
        return response()->json([
            'tracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack(),
            'availableClassesByTrack' => SchoolContextOptions::availableClassesByTrack(),
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): Response
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'school_track' => ['required', 'string', 'in:'.implode(',', SchoolContextOptions::trackValues())],
            'assigned_class_name' => ['required', 'string', 'in:'.implode(',', SchoolContextOptions::allClasses())],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $validator->after(function ($validator) use ($request): void {
            $track = $request->string('school_track')->toString();
            $className = $request->string('assigned_class_name')->toString();

            if (! SchoolContextOptions::isValidClassForTrack($track, $className)) {
                $validator->errors()->add('assigned_class_name', 'The selected class does not belong to the chosen track.');
                return;
            }

            if (! SchoolContextOptions::isTeacherClassAvailable($track, $className)) {
                $validator->errors()->add('assigned_class_name', 'That class is already assigned to another teacher.');
            }
        });

        $validated = $validator->validate();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => UserRole::Teacher,
            'status' => UserStatus::Active,
            'school_track' => $validated['school_track'],
            'assigned_class_name' => $validated['assigned_class_name'],
            'password' => Hash::make($request->string('password')),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return response()->noContent();
    }
}
