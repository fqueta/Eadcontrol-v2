<?
namespace App\Facades;
use Illuminate\Support\Facades\Facade;

/**
 *
 */
class QlibFacade extends Facade
{
    protected static function getFacadeAccessor()
    {
        return 'qlib';
    }

}
