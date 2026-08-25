<?php

use App\Http\Controllers\Api\Admin\AdminSchoolStructureApiController;
use App\Http\Controllers\Api\Admin\AdminDeletedStudentRecordApiController;
use App\Http\Controllers\Api\Admin\AdminUserApiController;
use App\Http\Controllers\Api\AnnouncementAttachmentFileController;
use App\Http\Controllers\Api\Finance\FinanceMerchandiseApiController;
use App\Http\Controllers\Api\Finance\FinanceStudentApiController;
use App\Http\Controllers\Api\Guardian\GuardianChildApiController;
use App\Http\Controllers\Api\Guardian\GuardianHomeworkApiController;
use App\Http\Controllers\Api\Guardian\GuardianHomeworkSubmissionApiController;
use App\Http\Controllers\Api\Guardian\GuardianMerchandiseApiController;
use App\Http\Controllers\Api\HomeworkAttachmentFileController;
use App\Http\Controllers\Api\HomeworkSubmissionFileController;
use App\Http\Controllers\Api\Management\ManagementAnnouncementApiController;
use App\Http\Controllers\Api\Management\ManagementFormTeacherApiController;
use App\Http\Controllers\Api\Management\ManagementDashboardApiController;
use App\Http\Controllers\Api\Management\ManagementGradeAssessmentPeriodApiController;
use App\Http\Controllers\Api\Management\ManagementRegisterReportApiController;
use App\Http\Controllers\Api\Management\ManagementRegisterScheduleApiController;
use App\Http\Controllers\Api\Management\ManagementSchoolSubjectApiController;
use App\Http\Controllers\Api\Management\ManagementStudentRecordApiController;
use App\Http\Controllers\Api\Management\ManagementTeacherSubjectAssignmentApiController;
use App\Http\Controllers\Api\Management\ManagementTimetableApiController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileSettingsController;
use App\Http\Controllers\Api\Teacher\TeacherGradebookApiController;
use App\Http\Controllers\Api\Teacher\TeacherHomeworkApiController;
use App\Http\Controllers\Api\Teacher\TeacherRegisterReportApiController;
use App\Http\Controllers\Api\Teacher\TeacherTimetableApiController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/register/options', [RegisteredUserController::class, 'options']);
Route::post('/register', [RegisteredUserController::class, 'store']);
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::post('/forgot-password', [PasswordResetLinkController::class, 'store']);
Route::post('/reset-password', [NewPasswordController::class, 'store']);
Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
    ->middleware(['auth:sanctum', 'throttle:6,1']);
Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth:sanctum');

// Signed, expiring download URLs for announcement attachments. Public by design:
// the signature replaces auth so <img> tags work without Bearer headers.
Route::get('/announcements/attachments/{attachment}/file', AnnouncementAttachmentFileController::class)
    ->middleware('signed')
    ->name('announcements.attachments.file');

// Signed, expiring download URLs for homework attachments.
Route::get('/homework/attachments/{attachment}/file', HomeworkAttachmentFileController::class)
    ->middleware('signed')
    ->name('homework.attachments.file');

// Signed, expiring download URLs for guardian homework submission attachments.
Route::get('/homework/submissions/attachments/{attachment}/file', HomeworkSubmissionFileController::class)
    ->middleware('signed')
    ->name('homework.submissions.file');

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user()?->fresh()->load([
        'school:id,name',
        'linkedStudentRecord:id,school_id,school_track,class_name,full_name',
    ]);
});

Route::middleware(['auth:sanctum', 'portal'])->prefix('settings')->group(function () {
    Route::post('/profile', [ProfileSettingsController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'portal'])->prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::patch('/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/{notification}/read', [NotificationController::class, 'markRead']);
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/users', [AdminUserApiController::class, 'index']);
    Route::post('/users', [AdminUserApiController::class, 'store']);
    Route::put('/users/{user}', [AdminUserApiController::class, 'update']);
    Route::patch('/users/{user}/status', [AdminUserApiController::class, 'updateStatus']);
    Route::delete('/users/{user}', [AdminUserApiController::class, 'destroy']);

    Route::get('/school-structure', [AdminSchoolStructureApiController::class, 'show']);
    Route::put('/school-structure', [AdminSchoolStructureApiController::class, 'update']);

    Route::get('/deleted-records/students', [AdminDeletedStudentRecordApiController::class, 'index']);
    Route::patch('/deleted-records/students/{student}/restore', [AdminDeletedStudentRecordApiController::class, 'restore']);
    Route::delete('/deleted-records/students/{student}', [AdminDeletedStudentRecordApiController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'timetable-manager'])->prefix('management')->group(function () {
    Route::get('/dashboard', [ManagementDashboardApiController::class, 'show']);

    Route::get('/announcements', [ManagementAnnouncementApiController::class, 'index']);
    Route::post('/announcements', [ManagementAnnouncementApiController::class, 'store']);
    Route::delete('/announcements/{announcement}', [ManagementAnnouncementApiController::class, 'destroy']);

    Route::get('/school-structure', [AdminSchoolStructureApiController::class, 'show']);
    Route::put('/school-structure', [AdminSchoolStructureApiController::class, 'update']);

    Route::get('/students', [ManagementStudentRecordApiController::class, 'index']);
    Route::post('/students', [ManagementStudentRecordApiController::class, 'store']);
    Route::post('/students/import', [ManagementStudentRecordApiController::class, 'import']);
    Route::put('/students/{student}', [ManagementStudentRecordApiController::class, 'update']);
    Route::delete('/students/{student}', [ManagementStudentRecordApiController::class, 'destroy']);

    Route::get('/form-teachers', [ManagementFormTeacherApiController::class, 'index']);
    Route::put('/form-teachers/{teacher}', [ManagementFormTeacherApiController::class, 'update']);
    Route::get('/teacher-subject-assignments', [ManagementTeacherSubjectAssignmentApiController::class, 'index']);
    Route::post('/teacher-subject-assignments', [ManagementTeacherSubjectAssignmentApiController::class, 'store']);
    Route::delete('/teacher-subject-assignments/{assignment}', [ManagementTeacherSubjectAssignmentApiController::class, 'destroy']);

    Route::get('/subjects', [ManagementSchoolSubjectApiController::class, 'index']);
    Route::post('/subjects', [ManagementSchoolSubjectApiController::class, 'store']);
    Route::put('/subjects/{subject}', [ManagementSchoolSubjectApiController::class, 'update']);
    Route::delete('/subjects/{subject}', [ManagementSchoolSubjectApiController::class, 'destroy']);

    Route::get('/gradebook-assessment-periods', [ManagementGradeAssessmentPeriodApiController::class, 'index']);
    Route::post('/gradebook-assessment-periods', [ManagementGradeAssessmentPeriodApiController::class, 'store']);
    Route::delete('/gradebook-assessment-periods/{period}', [ManagementGradeAssessmentPeriodApiController::class, 'destroy']);

    Route::get('/register-schedule', [ManagementRegisterScheduleApiController::class, 'show']);
    Route::put('/register-schedule', [ManagementRegisterScheduleApiController::class, 'update']);
    Route::get('/register-reports', [ManagementRegisterReportApiController::class, 'index']);

    Route::get('/timetables', [ManagementTimetableApiController::class, 'index']);
    Route::get('/timetables/{timetable}', [ManagementTimetableApiController::class, 'show']);
    Route::post('/timetables', [ManagementTimetableApiController::class, 'store']);
    Route::put('/timetables/{timetable}', [ManagementTimetableApiController::class, 'update']);
    Route::delete('/timetables/{timetable}', [ManagementTimetableApiController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'finance'])->prefix('finance')->group(function () {
    Route::get('/students', [FinanceStudentApiController::class, 'index']);
    Route::put('/students/{student}', [FinanceStudentApiController::class, 'update']);
    Route::get('/merchandise', [FinanceMerchandiseApiController::class, 'index']);
    Route::post('/merchandise', [FinanceMerchandiseApiController::class, 'store']);
    Route::put('/merchandise/{item}', [FinanceMerchandiseApiController::class, 'update']);
    Route::delete('/merchandise/{item}', [FinanceMerchandiseApiController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'portal'])->prefix('teacher')->group(function () {
    Route::get('/timetables', [TeacherTimetableApiController::class, 'index']);
    Route::get('/gradebook', [TeacherGradebookApiController::class, 'index']);
    Route::put('/gradebook/students/{student}/performance', [TeacherGradebookApiController::class, 'upsert']);
    Route::get('/register-reports', [TeacherRegisterReportApiController::class, 'index']);
    Route::put('/register-reports/current', [TeacherRegisterReportApiController::class, 'storeOrUpdateCurrent']);
    Route::put('/register-reports/{report}', [TeacherRegisterReportApiController::class, 'update']);
    Route::post('/register-reports/{report}/submit', [TeacherRegisterReportApiController::class, 'submit']);

    Route::get('/homework', [TeacherHomeworkApiController::class, 'index']);
    Route::post('/homework', [TeacherHomeworkApiController::class, 'store']);
    Route::delete('/homework/{homework}', [TeacherHomeworkApiController::class, 'destroy']);
    Route::put('/homework/{homework}/grades', [TeacherHomeworkApiController::class, 'updateGrades']);
});

Route::middleware(['auth:sanctum', 'portal'])->prefix('guardian')->group(function () {
    Route::get('/child', [GuardianChildApiController::class, 'show']);
    Route::get('/merchandise', [GuardianMerchandiseApiController::class, 'index']);
    Route::get('/homework', [GuardianHomeworkApiController::class, 'index']);
    Route::get('/homework/{homework}/submission', [GuardianHomeworkSubmissionApiController::class, 'show']);
    Route::post('/homework/{homework}/submission', [GuardianHomeworkSubmissionApiController::class, 'saveDraft']);
    Route::post('/homework/{homework}/submit', [GuardianHomeworkSubmissionApiController::class, 'submit']);
});
