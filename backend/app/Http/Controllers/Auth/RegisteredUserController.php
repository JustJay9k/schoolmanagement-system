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
use Illuminate\Validation\Rule;
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
            'classesByTrack' => SchoolContextOptions::defaultClassesByTrack(),
            'availableClassesByTrack' => SchoolContextOptions::availableClassesByTrack(),
            'schools' => $schools->map(fn (School $school): array => [
                'value' => (string) $school->id,
                'label' => $school->name,
            ])->values(),
            'classesByTrackBySchool' => $schools
                ->mapWithKeys(fn (School $school): array => [
                    (string) $school->id => SchoolContextOptions::classesByTrack($school->id),
                ]),
            'availableClassesByTrackBySchool' => $schools
                ->mapWithKeys(fn (School $school): array => [
                    (string) $school->id => SchoolContextOptions::availableClassesByTrack(null, $school->id),
                ]),
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
    public function store(Request $request): JsonResponse|Response
    {
        $schoolIdForValidation = $this->resolveSchoolIdFromRequest($request);

        $validator = Validator::make($request->all(), [
            'account_type' => ['required', 'string', 'in:teacher,guardian'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'school_name' => ['nullable', 'string', 'max:180'],
            'school_track' => ['nullable', 'string', 'in:'.implode(',', SchoolContextOptions::trackValues())],
            'assigned_class_name' => ['nullable', 'string', Rule::in(SchoolContextOptions::allClasses($schoolIdForValidation))],
            'child_id' => ['nullable', 'integer', 'exists:student_records,id'],
            'child_name' => ['nullable', 'string', 'max:255'],
            'student_code' => ['nullable', 'string', 'max:100'],
            'child_identifier' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $validator->after(function ($validator) use ($request): void {
            $accountType = $request->string('account_type')->toString();
            $schoolId = $this->resolveSchoolIdFromRequest($request);
            $track = $request->string('school_track')->toString();
            $className = $request->string('assigned_class_name')->toString();
            $childIdentifier = Str::squish(
                $request->string('child_identifier')->toString()
                ?: ($request->string('child_name')->toString()
                ?: $request->string('student_code')->toString())
            );
            $childId = $request->integer('child_id');

            if (! $request->input('school_id') && Str::squish($request->string('school_name')->toString()) === '') {
                $validator->errors()->add('school_id', 'Choose an existing school or enter a new school name.');
            }

            if ($accountType === 'guardian') {
                if ($request->input('school_id') === null && $schoolId === null) {
                    $validator->errors()->add('school_id', 'Guardians must choose the school already linked to the learner record.');
                }

                if (! $childId && $childIdentifier === '') {
                    $validator->errors()->add('child_name', 'Enter your child\'s full name or student code.');
                    return;
                }

                if ($schoolId !== null) {
                    $student = $this->resolveLinkedStudentRecord($schoolId, $childIdentifier, $childId ?: null);

                    if (! $student) {
                        $validator->errors()->add(
                            'child_name',
                            'No learner matching that name or student code was found in the selected school.',
                        );
                        return;
                    }

                    $guardianName = Str::squish($request->string('name')->toString());
                    $guardianEmail = Str::squish($request->string('email')->toString());

                    if (! $this->canGuardianLinkStudent($student, $guardianName, $guardianEmail, $childIdentifier)) {
                        $validator->errors()->add(
                            'child_name',
                            'You cannot link a learner that is not your own. Please enter the student code or ensure your guardian details match the school\'s records.',
                        );
                    }
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

            if (! SchoolContextOptions::isValidClassForTrack($track, $className, $schoolId)) {
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
        $childIdentifier = Str::squish(
            $request->string('child_identifier')->toString()
            ?: ($request->string('child_name')->toString()
            ?: $request->string('student_code')->toString())
        );
        $linkedStudent = $accountType === 'guardian' && $school
            ? $this->resolveLinkedStudentRecord(
                $school->id,
                $childIdentifier,
                isset($validated['child_id']) ? (int) $validated['child_id'] : null,
            )
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
            'email_verified_at' => now(),
            'password' => Hash::make($request->string('password')),
        ]);
        UserNotificationCenter::welcome($user);

        event(new Registered($user));

        Auth::login($user);

        if ($request->is('api/*') || $request->expectsJson()) {
            return response()->json([
                'token' => $user->createToken('frontend')->plainTextToken,
            ], 201);
        }

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

    private function resolveLinkedStudentRecord(
        ?int $schoolId,
        string $identifier,
        ?int $childId = null,
    ): ?StudentRecord
    {
        $identifier = Str::squish($identifier);

        if ($schoolId === null) {
            return null;
        }

        if ($identifier !== '') {
            $lowerIdentifier = Str::lower($identifier);

            $studentByCode = StudentRecord::query()
                ->where('school_id', $schoolId)
                ->whereRaw('LOWER(student_code) = ?', [$lowerIdentifier])
                ->first();

            if ($studentByCode) {
                return $studentByCode;
            }

            $studentByName = StudentRecord::query()
                ->where('school_id', $schoolId)
                ->whereRaw('LOWER(full_name) = ?', [$lowerIdentifier])
                ->first();

            if ($studentByName) {
                return $studentByName;
            }
        }

        if ($childId) {
            return StudentRecord::query()
                ->whereKey($childId)
                ->where('school_id', $schoolId)
                ->first();
        }

        return null;
    }

    private function canGuardianLinkStudent(
        StudentRecord $student,
        string $guardianName,
        string $guardianEmail,
        string $providedIdentifier,
    ): bool
    {
        // If the guardian provided the child's exact school-issued student code, authorization is confirmed
        $studentCode = Str::squish((string) $student->student_code);
        if ($studentCode !== '' && Str::lower($studentCode) === Str::lower(Str::squish($providedIdentifier))) {
            return true;
        }

        $recordGuardianEmail = Str::squish((string) $student->guardian_email);
        $recordGuardianName = Str::squish((string) $student->guardian_name);

        // If the student record has neither guardian email nor guardian name on file, allow linking
        if ($recordGuardianEmail === '' && $recordGuardianName === '') {
            return true;
        }

        // Check guardian email match
        if ($recordGuardianEmail !== '' && Str::lower($recordGuardianEmail) === Str::lower($guardianEmail)) {
            return true;
        }

        // Check guardian name match (exact or matching family surname / significant name tokens)
        if ($recordGuardianName !== '') {
            if (Str::lower($recordGuardianName) === Str::lower($guardianName)) {
                return true;
            }

            $titles = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'pastor', 'rev'];
            $extractTokens = function (string $name) use ($titles): array {
                $rawTokens = preg_split('/[\s,\.\-_]+/', Str::lower($name)) ?: [];
                return array_values(array_filter($rawTokens, fn (string $t) => strlen($t) >= 3 && ! in_array($t, $titles, true)));
            };

            $recordTokens = $extractTokens($recordGuardianName);
            $userTokens = $extractTokens($guardianName);

            if (! empty($recordTokens) && ! empty($userTokens) && ! empty(array_intersect($recordTokens, $userTokens))) {
                return true;
            }
        }

        return false;
    }
}

