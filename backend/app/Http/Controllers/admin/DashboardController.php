<?php

namespace App\Http\Controllers\admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user(); // ou qualquer dado que queira passar
        // $user = tenant(); // ou qualquer dado que queira passar
        $user['name'] .= ' - '.tenant('id');
        // dd($user);
        $title = 'Dashboard';
        $notifications = ['Mensagem 1', 'Mensagem 3'];
        $ret = [
            'user' => $user,
            'title' => $title,
            'notifications' => $notifications,
        ];
        return Inertia::render('Dashboard', $ret);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
