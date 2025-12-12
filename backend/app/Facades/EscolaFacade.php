<?php
namespace App\Facades;

use Illuminate\Support\Facades\Facade;

class EscolaFacade extends Facade
{
    protected static function getFacadeAccessor()
    {
        return 'escola';
    }
}
