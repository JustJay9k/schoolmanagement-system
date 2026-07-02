<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreSchoolMerchandiseItemRequest;
use App\Http\Requests\Finance\UpdateSchoolMerchandiseItemRequest;
use App\Models\SchoolMerchandiseItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FinanceMerchandiseApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = SchoolMerchandiseItem::query()
            ->where('school_id', $request->user()?->school_id)
            ->latest()
            ->get();

        return response()->json([
            'items' => $items->map(fn (SchoolMerchandiseItem $item): array => $this->serializeItem($item))->values(),
        ]);
    }

    public function store(StoreSchoolMerchandiseItemRequest $request): JsonResponse
    {
        $item = new SchoolMerchandiseItem();
        $item->school_id = $request->user()?->school_id;
        $item->created_by = $request->user()?->id;
        $this->fillItem($item, $request);
        $item->save();

        return response()->json([
            'message' => 'Merchandise item created successfully.',
            'item' => $this->serializeItem($item->fresh()),
        ], 201);
    }

    public function update(
        UpdateSchoolMerchandiseItemRequest $request,
        SchoolMerchandiseItem $item,
    ): JsonResponse {
        $this->abortIfOutsideSchoolScope($request, $item);

        $this->fillItem($item, $request);
        $item->save();

        return response()->json([
            'message' => 'Merchandise item updated successfully.',
            'item' => $this->serializeItem($item->fresh()),
        ]);
    }

    public function destroy(Request $request, SchoolMerchandiseItem $item): JsonResponse
    {
        $this->abortIfOutsideSchoolScope($request, $item);

        $this->deleteImage($item->image_path);
        $item->delete();

        return response()->json([
            'message' => 'Merchandise item deleted successfully.',
        ]);
    }

    private function abortIfOutsideSchoolScope(
        Request $request,
        SchoolMerchandiseItem $item,
    ): void {
        if ($item->school_id !== $request->user()?->school_id) {
            abort(404);
        }
    }

    private function fillItem(
        SchoolMerchandiseItem $item,
        StoreSchoolMerchandiseItemRequest|UpdateSchoolMerchandiseItemRequest $request,
    ): void {
        $validated = $request->validated();

        $item->name = $validated['name'];
        $item->category = $validated['category'] ?? null;
        $item->price = $validated['price'];
        $item->description = $validated['description'] ?? null;
        $item->is_available = (bool) ($validated['is_available'] ?? true);

        if ($request->hasFile('image')) {
            $this->deleteImage($item->image_path);
            $item->image_path = $request->file('image')->store('school-merchandise', 'public');
        }
    }

    private function deleteImage(?string $path): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeItem(SchoolMerchandiseItem $item): array
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'category' => $item->category,
            'price' => (float) $item->price,
            'description' => $item->description,
            'is_available' => (bool) $item->is_available,
            'image_url' => $item->image_url,
            'created_at' => $item->created_at?->toIso8601String(),
            'updated_at' => $item->updated_at?->toIso8601String(),
        ];
    }
}
