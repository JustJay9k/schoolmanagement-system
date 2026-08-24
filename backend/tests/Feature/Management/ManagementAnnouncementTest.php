<?php

namespace Tests\Feature\Management;

use App\Models\Announcement;
use App\Models\AnnouncementAttachment;
use App\Models\School;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ManagementAnnouncementTest extends TestCase
{
    use RefreshDatabase;

    public function test_head_teacher_can_publish_announcement_with_attachments_to_school_guardians(): void
    {
        Storage::fake('public');

        $managedSchool = School::query()->create(['name' => 'Managed School']);
        $otherSchool = School::query()->create(['name' => 'Other School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $managedSchool->id,
        ]);

        $guardianA = User::factory()->guardian()->create(['school_id' => $managedSchool->id]);
        $guardianB = User::factory()->guardian()->create(['school_id' => $managedSchool->id]);
        User::factory()->guardian()->inactive()->create(['school_id' => $managedSchool->id]);
        User::factory()->guardian()->create(['school_id' => $otherSchool->id]);

        $response = $this->actingAs($headTeacher)
            ->post('/api/management/announcements', [
                'title' => 'Parents day notice',
                'body' => 'Parents day holds on Friday. Please review the attached programme.',
                'attachments' => [
                    UploadedFile::fake()->createWithContent('programme.pdf', '%PDF-1.4 test'),
                    UploadedFile::fake()->createWithContent('photo.jpg', 'jpeg-bytes'),
                ],
            ]);

        $response->assertCreated()
            ->assertJsonPath('announcement.title', 'Parents day notice')
            ->assertJsonPath('announcement.recipients_count', 2)
            ->assertJsonPath('announcement.author_name', $headTeacher->name)
            ->assertJsonCount(2, 'announcement.attachments');

        $announcement = Announcement::query()->sole();
        $this->assertSame($managedSchool->id, $announcement->school_id);
        $this->assertSame($headTeacher->id, $announcement->author_id);

        $attachments = AnnouncementAttachment::query()->get();
        $this->assertCount(2, $attachments);
        $this->assertTrue($attachments->contains(fn (AnnouncementAttachment $attachment): bool => $attachment->is_image));

        foreach ($attachments as $attachment) {
            Storage::disk('public')->assertExists($attachment->file_path);
        }

        $notificationCount = UserNotification::query()
            ->where('announcement_id', $announcement->id)
            ->count();
        $this->assertSame(2, $notificationCount);

        $this->assertTrue(
            UserNotification::query()->where('user_id', $guardianA->id)->exists(),
        );
        $this->assertTrue(
            UserNotification::query()->where('user_id', $guardianB->id)->exists(),
        );
    }

    public function test_announcement_requires_a_message_or_attachment(): void
    {
        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);

        $this->actingAs($headTeacher)
            ->postJson('/api/management/announcements', [
                'title' => 'Empty announcement',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['body']);

        $this->assertSame(0, Announcement::query()->count());
    }

    public function test_guardian_notifications_include_announcement_attachments(): void
    {
        Storage::fake('public');

        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);
        $guardian = User::factory()->guardian()->create(['school_id' => $school->id]);

        $this->actingAs($headTeacher)
            ->post('/api/management/announcements', [
                'title' => 'Fee reminder',
                'body' => 'Term fees are due next week.',
                'attachments' => [
                    UploadedFile::fake()->createWithContent('statement.pdf', '%PDF-1.4 test'),
                ],
            ])
            ->assertCreated();

        $this->actingAs($guardian)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('notifications.0.title', 'Fee reminder')
            ->assertJsonPath('notifications.0.attachments.0.name', 'statement.pdf')
            ->assertJsonPath('notifications.0.attachments.0.is_image', false);
    }

    public function test_head_teacher_cannot_delete_another_schools_announcement(): void
    {
        $managedSchool = School::query()->create(['name' => 'Managed School']);
        $otherSchool = School::query()->create(['name' => 'Other School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $managedSchool->id,
        ]);
        $announcement = Announcement::query()->create([
            'school_id' => $otherSchool->id,
            'author_id' => $headTeacher->id,
            'title' => 'Foreign post',
        ]);

        $this->actingAs($headTeacher)
            ->deleteJson("/api/management/announcements/{$announcement->id}")
            ->assertNotFound();

        $this->assertModelExists($announcement);
    }

    public function test_head_teacher_can_delete_own_announcement_and_its_files(): void
    {
        Storage::fake('public');

        $school = School::query()->create(['name' => 'Managed School']);
        $headTeacher = User::factory()->management()->create([
            'school_id' => $school->id,
        ]);
        $announcement = Announcement::query()->create([
            'school_id' => $school->id,
            'author_id' => $headTeacher->id,
            'title' => 'Old post',
        ]);
        $attachment = AnnouncementAttachment::query()->create([
            'announcement_id' => $announcement->id,
            'file_path' => 'announcement-attachments/old.png',
            'original_name' => 'old.png',
            'mime_type' => 'image/png',
            'size_in_kb' => 12,
            'is_image' => true,
        ]);
        Storage::disk('public')->put($attachment->file_path, 'png-bytes');

        $guardian = User::factory()->guardian()->create(['school_id' => $school->id]);
        $notification = UserNotification::query()->create([
            'user_id' => $guardian->id,
            'announcement_id' => $announcement->id,
            'title' => $announcement->title,
            'message' => 'Old post body.',
            'level' => 'info',
            'action_url' => '/notifications',
        ]);

        $this->actingAs($headTeacher)
            ->deleteJson("/api/management/announcements/{$announcement->id}")
            ->assertOk();

        Storage::disk('public')->assertMissing($attachment->file_path);
        $this->assertSame(0, AnnouncementAttachment::query()->count());

        // Guardian notifications are preserved as plain history without the attachment payload.
        $this->assertDatabaseHas('user_notifications', [
            'id' => $notification->id,
            'announcement_id' => null,
        ]);
    }
}
