<?php

use App\Http\Controllers\Api\Admin\AdminSchoolStructureApiController;
use App\Http\Controllers\Api\Admin\AdminUserApiController;
use App\Http\Controllers\Api\Finance\FinanceMerchandiseApiController;
use App\Http\Controllers\Api\Finance\FinanceStudentApiController;
use App\Http\Controllers\Api\Guardian\GuardianChildApiController;
use App\Http\Controllers\Api\Guardian\GuardianMerchandiseApiController;
use App\Http\Controllers\Api\Management\ManagementFormTeacherApiController;
use App\Http\Controllers\Api\Management\ManagementGradeAssessmentPeriodApiController;
use App\Http\Controllers\Api\Management\ManagementRegisterScheduleApiController;
use App\Http\Controllers\Api\Management\ManagementSchoolSubjectApiController;
use App\Http\Controllers\Api\Management\ManagementStudentRecordApiController;
use App\Http\Controllers\Api\Management\ManagementTeacherSubjectAssignmentApiController;
use App\Http\Controllers\Api\Management\ManagementTimetableApiController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileSettingsController;
use App\Http\Controllers\Api\Teacher\TeacherGradebookApiController;
use App\Http\Controllers\Api\Teacher\TeacherTimetableApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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
});

Route::middleware(['auth:sanctum', 'timetable-manager'])->prefix('management')->group(function () {
    Route::get('/students', [ManagementStudentRecordApiController::class, 'index']);
    Route::post('/students', [ManagementStudentRecordApiController::class, 'store']);
    Route::post('/students/import', [ManagementStudentRecordApiController::class, 'import']);

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
});

Route::middleware(['auth:sanctum', 'portal'])->prefix('guardian')->group(function () {
    Route::get('/child', [GuardianChildApiController::class, 'show']);
    Route::get('/merchandise', [GuardianMerchandiseApiController::class, 'index']);
});
