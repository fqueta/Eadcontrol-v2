<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Helpers\StringHelper;
class UserController extends Controller
{
    public function __construct(protected StringHelper $helper) {}

    public function mostrar()
    {
        $cpf = $this->helper->formatarCpf('12345678900');
    }

}
