<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisterController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            // 'empresa' => 'required|string|max:255',
            // 'dominio' => 'required|string|max:255',
        ]);
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            // 'empresa' => $request->empresa,
            'password' => Hash::make($request->password),
            'permission_id'=>5, // Default permission for new users
            'token'=>uniqid(), // Default permission for new users
        ]);
        event(new Registered($user));
        $ret['exec'] = false;
        if(isset($user['id'])){
            $ret['exec'] = true;
            //efetuar login na api
            // $ret['login'] =  (new AuthController)->login($request);
            $ret['user'] = $user;
            // $ret['token'] = $user->createToken('developer')->plainTextToken;
            $ret['message'] = __('Usuário cadastrado com sucesso');
            $ret['status'] = 201;
        }
        // Auth::login($user);
        return response()->json($ret);
        // return redirect()->intended(route('dashboard', absolute: false));
    }
}
