<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\SchoolSubject;
use App\Models\Timetable;
use App\Models\TimetableEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimetableManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_management_user_can_create_a_subject(): void
    {
        $headTeacher = User::factory()->management()->create();

        $this->actingAs($headTeacher)
            ->postJson('/api/management/subjects', [
                'name' => 'Agriculture',
                'code' => 'AGR',
                'school_track' => 'secondary',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('school_subjects', [
            'name' => 'Agriculture',
            'school_track' => 'secondary',
        ]);
    }

    public function test_management_user_can_create_a_timetable_and_assign_it_to_a_teacher(): void
    {
        $headTeacher = User::factory()->management()->create();
        $teacher = User::factory()->teacher()->create([
            'role' => UserRole::Teacher,
            'status' => UserStatus::Active,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);
        $subject = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'school_track' => 'secondary',
        ]);

        $this->actingAs($headTeacher)
            ->postJson('/api/management/timetables', [
                'title' => 'Form 1 Timetable',
                'school_track' => 'secondary',
                'class_name' => 'Form 1',
                'assigned_teacher_id' => $teacher->id,
                'notes' => 'Morning schedule',
                'entries' => [
                    [
                        'day_of_week' => 'monday',
                        'period_label' => 'Period 1',
                        'start_time' => '08:00',
                        'end_time' => '08:40',
                        'subject_id' => $subject->id,
                        'room' => 'A1',
                        'notes' => 'Double-check materials',
                    ],
                ],
            ])
            ->assertCreated();

        $this->assertDatabaseHas('timetables', [
            'title' => 'Form 1 Timetable',
            'school_track' => 'secondary',
            'class_name' => 'Form 1',
            'assigned_teacher_id' => $teacher->id,
        ]);

        $timetable = Timetable::query()->firstOrFail();

        $this->assertDatabaseHas('timetable_entries', [
            'timetable_id' => $timetable->id,
            'day_of_week' => 'monday',
            'period_label' => 'Period 1',
            'subject_id' => $subject->id,
        ]);
    }

    public function test_management_user_cannot_assign_a_secondary_timetable_to_a_subject_only_teacher(): void
    {
        $headTeacher = User::factory()->management()->create();
        $teacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
            'school_track' => 'secondary',
            'assigned_class_name' => null,
        ]);
        $subject = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'school_track' => 'secondary',
        ]);

        $this->actingAs($headTeacher)
            ->postJson('/api/management/timetables', [
                'title' => 'Form 1 Timetable',
                'school_track' => 'secondary',
                'class_name' => 'Form 1',
                'assigned_teacher_id' => $teacher->id,
                'entries' => [
                    [
                        'day_of_week' => 'monday',
                        'period_label' => 'Period 1',
                        'subject_id' => $subject->id,
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['assigned_teacher_id']);
    }

    public function test_teacher_can_only_view_their_assigned_timetables(): void
    {
        $teacher = User::factory()->teacher()->create([
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 4',
        ]);
        $otherTeacher = User::factory()->teacher()->create([
            'school_track' => 'primary',
            'assigned_class_name' => 'Standard 5',
        ]);
        $subject = SchoolSubject::query()->create([
            'name' => 'Science',
            'school_track' => 'primary',
        ]);

        $visibleTimetable = Timetable::query()->create([
            'title' => 'Standard 4 Timetable',
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'assigned_teacher_id' => $teacher->id,
        ]);
        TimetableEntry::query()->create([
            'timetable_id' => $visibleTimetable->id,
            'day_of_week' => 'monday',
            'period_label' => 'Period 1',
            'subject_id' => $subject->id,
        ]);

        Timetable::query()->create([
            'title' => 'Standard 5 Timetable',
            'school_track' => 'primary',
            'class_name' => 'Standard 5',
            'assigned_teacher_id' => $otherTeacher->id,
        ]);

        $this->actingAs($teacher)
            ->getJson('/api/teacher/timetables')
            ->assertOk()
            ->assertSee('Standard 4 Timetable')
            ->assertDontSee('Standard 5 Timetable');

        $this->actingAs($teacher)
            ->getJson('/api/teacher/timetables')
            ->assertOk()
            ->assertSee('Science');

        $this->actingAs($otherTeacher)
            ->getJson('/api/teacher/timetables')
            ->assertOk()
            ->assertSee('Standard 5 Timetable')
            ->assertDontSee('Standard 4 Timetable');
    }

    public function test_admin_cannot_use_management_timetable_endpoints(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->getJson('/api/management/subjects')
            ->assertForbidden();
    }

    public function test_management_user_can_allocate_a_secondary_teacher_as_a_form_teacher(): void
    {
        $headTeacher = User::factory()->management()->create();
        $teacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
            'school_track' => 'secondary',
            'assigned_class_name' => null,
        ]);

        $this->actingAs($headTeacher)
            ->putJson("/api/management/form-teachers/{$teacher->id}", [
                'assigned_class_name' => 'Form 2',
            ])
            ->assertOk()
            ->assertJsonFragment([
                'id' => $teacher->id,
                'assigned_class_name' => 'Form 2',
                'form_class_name' => 'Form 2',
                'is_form_teacher' => true,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $teacher->id,
            'assigned_class_name' => 'Form 2',
        ]);
    }

    public function test_management_user_can_list_secondary_form_teacher_allocations(): void
    {
        $headTeacher = User::factory()->management()->create();
        $formTeacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);
        $subjectTeacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
            'school_track' => 'secondary',
            'assigned_class_name' => null,
        ]);

        $this->actingAs($headTeacher)
            ->getJson('/api/management/form-teachers')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $formTeacher->id,
                'form_class_name' => 'Form 1',
                'is_form_teacher' => true,
            ])
            ->assertJsonFragment([
                'id' => $subjectTeacher->id,
                'form_class_name' => null,
                'is_form_teacher' => false,
            ])
            ->assertJsonPath('options.secondaryClasses', ['Form 1', 'Form 2', 'Form 3', 'Form 4']);
    }

    public function test_management_user_can_allocate_a_secondary_subject_teacher_to_a_subject_and_class(): void
    {
        $headTeacher = User::factory()->management()->create();
        $teacher = User::factory()->teacher()->create([
            'status' => UserStatus::Active,
            'school_track' => 'secondary',
            'assigned_class_name' => null,
        ]);
        $subject = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'code' => 'MATH',
            'school_track' => 'secondary',
        ]);

        $this->actingAs($headTeacher)
            ->postJson('/api/management/teacher-subject-assignments', [
                'teacher_id' => $teacher->id,
                'subject_id' => $subject->id,
                'class_name' => 'Form 3',
            ])
            ->assertCreated()
            ->assertJsonFragment([
                'class_name' => 'Form 3',
                'name' => 'Mathematics',
                'code' => 'MATH',
            ]);

        $this->assertDatabaseHas('teacher_subject_assignments', [
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
            'school_track' => 'secondary',
            'class_name' => 'Form 3',
        ]);
    }

    public function test_secondary_teacher_can_view_form_class_timetable_and_assigned_subject_periods(): void
    {
        $teacher = User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 1',
        ]);
        $otherFormTeacher = User::factory()->teacher()->create([
            'school_track' => 'secondary',
            'assigned_class_name' => 'Form 2',
        ]);
        $english = SchoolSubject::query()->create([
            'name' => 'English',
            'school_track' => 'secondary',
        ]);
        $mathematics = SchoolSubject::query()->create([
            'name' => 'Mathematics',
            'school_track' => 'secondary',
        ]);
        $chemistry = SchoolSubject::query()->create([
            'name' => 'Chemistry',
            'school_track' => 'secondary',
        ]);

        $formOneTimetable = Timetable::query()->create([
            'title' => 'Form 1 Timetable',
            'school_track' => 'secondary',
            'class_name' => 'Form 1',
            'assigned_teacher_id' => $teacher->id,
        ]);
        TimetableEntry::query()->create([
            'timetable_id' => $formOneTimetable->id,
            'day_of_week' => 'monday',
            'period_label' => 'Period 1',
            'subject_id' => $english->id,
        ]);

        $formTwoTimetable = Timetable::query()->create([
            'title' => 'Form 2 Timetable',
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'assigned_teacher_id' => $otherFormTeacher->id,
        ]);
        TimetableEntry::query()->create([
            'timetable_id' => $formTwoTimetable->id,
            'day_of_week' => 'monday',
            'period_label' => 'Period 1',
            'subject_id' => $mathematics->id,
        ]);
        TimetableEntry::query()->create([
            'timetable_id' => $formTwoTimetable->id,
            'day_of_week' => 'monday',
            'period_label' => 'Period 2',
            'subject_id' => $chemistry->id,
        ]);

        $headTeacher = User::factory()->management()->create();

        $this->actingAs($headTeacher)
            ->postJson('/api/management/teacher-subject-assignments', [
                'teacher_id' => $teacher->id,
                'subject_id' => $mathematics->id,
                'class_name' => 'Form 2',
            ])
            ->assertCreated();

        $this->actingAs($teacher)
            ->getJson('/api/teacher/timetables')
            ->assertOk()
            ->assertSee('Form 1 Timetable')
            ->assertSee('Form 2 Timetable')
            ->assertSee('English')
            ->assertSee('Mathematics')
            ->assertDontSee('Chemistry');
    }
}
