<?php

namespace Tests\Feature\Admin;

use App\Models\School;
use App\Models\SchoolMerchandiseItem;
use App\Models\StudentRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinanceManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_accountant_can_view_student_finance_records(): void
    {
        $accountant = User::factory()->accountant()->create();

        StudentRecord::query()->create([
            'school_track' => 'primary',
            'class_name' => 'Standard 4',
            'full_name' => 'Martha Kalua',
            'student_code' => 'PRI-004',
            'guardian_name' => 'Mrs Kalua',
            'fees_balance' => 45000,
            'books_paid' => false,
            'uniform_paid' => true,
            'created_by' => $accountant->id,
        ]);

        $this->actingAs($accountant)
            ->getJson('/api/finance/students')
            ->assertOk()
            ->assertJsonPath('students.0.full_name', 'Martha Kalua')
            ->assertJsonPath('students.0.fees_balance', 45000)
            ->assertJsonPath('stats.total_students', 1)
            ->assertJsonPath('stats.books_pending', 1)
            ->assertJsonPath('stats.uniform_pending', 0);
    }

    public function test_accountant_can_update_student_finance_record(): void
    {
        $accountant = User::factory()->accountant()->create();
        $student = StudentRecord::query()->create([
            'school_track' => 'secondary',
            'class_name' => 'Form 2',
            'full_name' => 'Brian Chirwa',
            'student_code' => 'SEC-202',
            'fees_balance' => 90000,
            'books_paid' => false,
            'uniform_paid' => false,
            'created_by' => $accountant->id,
        ]);

        $this->actingAs($accountant)
            ->putJson("/api/finance/students/{$student->id}", [
                'fees_balance' => 12500,
                'books_paid' => true,
                'uniform_paid' => true,
            ])
            ->assertOk()
            ->assertJsonPath('student.fees_balance', 12500)
            ->assertJsonPath('student.books_paid', true)
            ->assertJsonPath('student.uniform_paid', true);

        $this->assertDatabaseHas('student_records', [
            'id' => $student->id,
            'fees_balance' => 12500,
            'books_paid' => true,
            'uniform_paid' => true,
        ]);
    }

    public function test_accountant_can_create_and_update_merchandise_items(): void
    {
        Storage::fake('public');

        $school = School::query()->create([
            'name' => 'Kasungu Academy',
        ]);

        $accountant = User::factory()->accountant()->create([
            'school_id' => $school->id,
        ]);

        $createResponse = $this->actingAs($accountant)
            ->postJson('/api/finance/merchandise', [
                'name' => 'School Uniform',
                'category' => 'Uniform',
                'price' => 35000,
                'description' => 'Full uniform set for new learners.',
                'is_available' => true,
                'image' => UploadedFile::fake()->image('uniform.jpg'),
            ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('item.name', 'School Uniform')
            ->assertJsonPath('item.category', 'Uniform')
            ->assertJsonPath('item.price', 35000)
            ->assertJsonPath('item.is_available', true);

        $itemId = $createResponse->json('item.id');
        $path = SchoolMerchandiseItem::query()->findOrFail($itemId)->image_path;

        Storage::disk('public')->assertExists($path);

        $this->actingAs($accountant)
            ->putJson("/api/finance/merchandise/{$itemId}", [
                'name' => 'School Uniform',
                'category' => 'Uniform',
                'price' => 40000,
                'description' => 'Updated uniform pricing.',
                'is_available' => false,
            ])
            ->assertOk()
            ->assertJsonPath('item.price', 40000)
            ->assertJsonPath('item.is_available', false);

        $this->assertDatabaseHas('school_merchandise_items', [
            'id' => $itemId,
            'school_id' => $school->id,
            'name' => 'School Uniform',
            'price' => 40000,
            'is_available' => false,
        ]);
    }

    public function test_non_finance_users_cannot_access_finance_endpoints(): void
    {
        $admin = User::factory()->admin()->create();
        $headTeacher = User::factory()->management()->create();

        $this->actingAs($admin)
            ->getJson('/api/finance/students')
            ->assertForbidden();

        $this->actingAs($headTeacher)
            ->getJson('/api/finance/students')
            ->assertForbidden();

        $this->actingAs($admin)
            ->getJson('/api/finance/merchandise')
            ->assertForbidden();
    }
}
