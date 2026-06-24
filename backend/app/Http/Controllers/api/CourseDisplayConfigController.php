<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CourseDisplayConfigController extends Controller
{
    public function index()
    {
        return response()->json([
            'badge_position' => tenant('course_badge_position') ?? 'top-right',
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'badge_position' => 'nullable|in:top-right,top-left,bottom-right,bottom-left,top-center,bottom-center,hidden',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $tenant = tenant();
        $tenant->course_badge_position = $request->input('badge_position', 'top-right');
        $tenant->save();

        return response()->json([
            'message' => 'Configuração de exibição atualizada.',
            'badge_position' => $tenant->course_badge_position,
        ]);
    }
}
