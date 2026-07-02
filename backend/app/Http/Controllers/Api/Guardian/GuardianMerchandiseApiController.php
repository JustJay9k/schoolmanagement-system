<?php

namespace App\Http\Controllers\Api\Guardian;

use App\Http\Controllers\Controller;
use App\Models\SchoolMerchandiseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GuardianMerchandiseApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $guardian = $request->user();

        abort_unless($guardian?->isGuardian(), 403);

        $items = SchoolMerchandiseItem::query()
            ->where('school_id', $guardian->school_id)
            ->where('is_available', true)
            ->latest()
            ->get();

        return response()->json([
            'items' => $items->map(fn (SchoolMerchandiseItem $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category,
                'price' => (float) $item->price,
                'description' => $item->description,
                'image_url' => $item->image_url,
                'updated_at' => $item->updated_at?->toIso8601String(),
            ])->values(),
        ]);
    }
}
