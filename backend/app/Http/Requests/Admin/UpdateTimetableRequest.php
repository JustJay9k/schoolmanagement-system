<?php

namespace App\Http\Requests\Admin;

use Illuminate\Validation\Rule;

class UpdateTimetableRequest extends StoreTimetableRequest
{
    public function rules(): array
    {
        $rules = parent::rules();
        $rules['class_name'] = ['required', 'string', Rule::in(\App\Support\SchoolContextOptions::allClasses()), Rule::unique('timetables', 'class_name')
            ->ignore($this->route('timetable'))
            ->where(fn ($query) => $query->where('school_track', $this->input('school_track')))];

        return $rules;
    }
}
