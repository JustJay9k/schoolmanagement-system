<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileSettingsController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'profile_photo' => ['nullable', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
            'remove_profile_photo' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($request->boolean('remove_profile_photo')) {
            $this->deleteProfilePhoto($user->profile_photo_path);
            $user->profile_photo_path = null;
        }

        if ($request->hasFile('profile_photo')) {
            $this->deleteProfilePhoto($user->profile_photo_path);
            $user->profile_photo_path = $request->file('profile_photo')->store('profile-photos', 'public');
        }

        $user->save();

        return response()->json([
            'message' => 'Personal settings updated successfully.',
            'user' => $user->fresh()->load('school:id,name'),
        ]);
    }

    private function deleteProfilePhoto(?string $path): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}
