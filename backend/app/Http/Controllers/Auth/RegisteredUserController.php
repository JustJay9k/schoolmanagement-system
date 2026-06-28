<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\StudentRecord;
use App\Models\User;
use App\Support\SchoolContextOptions;
use App\Support\UserNotificationCenter;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    public function options(): JsonResponse
    {
        $schools = School::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'tracks' => SchoolContextOptions::tracks(),
            'classesByTrack' => SchoolContextOptions::classesByTrack(),
            'takenClassesByTrack' => SchoolContextOptions::takenClassesByTrack(),
            'availableClassesByTrack' => SchoolContextOptions::availableClassesByTrack(),
            'schools' => $schools->map(fn (School $school): array => [
                'value' => (string) $school->id,
                'label' => $school->name,
            ])->values(),
            'takenClassesByTrackBySchool' => $schools
                ->mapWithKeys(fn (School $school): array => [
                    (string) $school->id => SchoolContextOptions::takenClassesByTrackForSchool($school->id),
                ]),
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
            'account_type' => ['required', 'string', 'in:teacher,guardian'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'school_name' => ['nullable', 'string', 'max:180'],
            'school_track' => ['nullable', 'string', 'in:'.implode(',', SchoolContextOptions::trackValues())],
            'assigned_class_name' => ['nullable', 'string', 'in:'.implode(',', SchoolContextOptions::allClasses())],
            'child_name' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $validator->after(function ($validator) use ($request): void {
            $accountType = $request->string('account_type')->toString();
            $schoolId = $this->resolveSchoolIdFromRequest($request);
            $track = $request->string('school_track')->toString();
            $className = $request->string('assigned_class_name')->toString();
            $childName = Str::squish($request->string('child_name')->toString());

            if (! $request->input('school_id') && Str::squish($request->string('school_name')->toString()) === '') {
                $validator->errors()->add('school_id', 'Choose an existing school or enter a new school name.');
            }

            if ($accountType === 'guardian') {
                if ($request->input('school_id') === null && $schoolId === null) {
                    $validator->errors()->add('school_id', 'Guardians must choose the school already linked to the learner record.');
                }

                if ($childName === '') {
                    $validator->errors()->add('child_name', 'Enter the learner name exactly as saved by the school.');
                }

                if ($schoolId !== null && $childName !== '' && ! $this->resolveLinkedStudentRecord($schoolId, $childName)) {
                    $validator->errors()->add('child_name', 'No learner with that name was found in the selected school.');
                }

                return;
            }

            if ($track === '') {
                $validator->errors()->add('school_track', 'Choose whether you belong to the primary or secondary section.');
                return;
            }

            if ($track === 'primary' && $className === '') {
                $validator->errors()->add('assigned_class_name', 'Choose the primary class this teacher will manage.');
                return;
            }

            if ($className === '') {
                return;
            }

            if (! SchoolContextOptions::isValidClassForTrack($track, $className)) {
                $validator->errors()->add('assigned_class_name', 'The selected class does not belong to the chosen track.');
                return;
            }

            if (! SchoolContextOptions::isTeacherClassAvailableForSchool($track, $className, $schoolId)) {
                $message = $track === 'secondary'
                    ? 'That form class already has a form teacher.'
                    : 'That class is already assigned to another teacher.';

                $validator->errors()->add('assigned_class_name', $message);
            }
        });

        $validated = $validator->validate();
        $accountType = $validated['account_type'];
        $school = $this->resolveSchoolFromRequest($request, $accountType === 'teacher');
        $linkedStudent = $accountType === 'guardian' && $school
            ? $this->resolveLinkedStudentRecord($school->id, $validated['child_name'] ?? '')
            : null;

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $accountType === 'guardian' ? UserRole::Guardian : UserRole::Teacher,
            'status' => UserStatus::Active,
            'school_id' => $school?->id,
            'linked_student_record_id' => $linkedStudent?->id,
            'school_track' => $accountType === 'teacher'
                ? ($validated['school_track'] ?? null)
                : null,
            'assigned_class_name' => $accountType === 'teacher'
                ? ($validated['assigned_class_name'] ?? null)
                : null,
            'password' => Hash::make($request->string('password')),
        ]);
        UserNotificationCenter::welcome($user);

        event(new Registered($user));

        Auth::login($user);

        return response()->noContent();
    }

    private function resolveSchoolIdFromRequest(Request $request): ?int
    {
        $schoolId = $request->input('school_id');
        if (is_numeric($schoolId)) {
            return (int) $schoolId;
        }

        $schoolName = Str::squish($request->string('school_name')->toString());
        if ($schoolName === '') {
            return null;
        }

        return School::query()
            ->whereRaw('LOWER(name) = ?', [Str::lower($schoolName)])
            ->value('id');
    }

    private function resolveSchoolFromRequest(Request $request, bool $createIfMissing = true): ?School
    {
        $schoolName = Str::squish($request->string('school_name')->toString());
        if ($schoolName !== '') {
            $existingSchool = School::query()
                ->whereRaw('LOWER(name) = ?', [Str::lower($schoolName)])
                ->first();

            if ($existingSchool) {
                return $existingSchool;
            }

            if (! $createIfMissing) {
                return null;
            }

            return School::query()->create([
                'name' => $schoolName,
            ]);
        }

        $schoolId = $request->input('school_id');

        return is_numeric($schoolId)
            ? School::query()->find((int) $schoolId)
            : null;
    }

    private function resolveLinkedStudentRecord(?int $schoolId, string $childName): ?StudentRecord
    {
        $childName = Str::squish($childName);

        if ($schoolId === null || $childName === '') {
            return null;
        }

        return StudentRecord::query()
            ->where('school_id', $schoolId)
            ->whereRaw('LOWER(full_name) = ?', [Str::lower($childName)])
            ->first();
    }
}
