<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PasswordResetLinkController extends Controller
{
    public function store(Request $request, $api = false)
    {
        return (new \App\Http\Controllers\Auth\PasswordResetLinkController)->store($request, true);
    }
}
