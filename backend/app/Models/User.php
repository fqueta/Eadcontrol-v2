<?php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Notifications\ResetPasswordNotification;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasUuids;
    protected $fillable = [
        'tipo_pessoa',
        'name',
        'razao',
        'cpf',
        'cnpj',
        'email',
        'password',
        'status',
        'genero',
        'verificado',
        'permission_id',
        'config',
        'preferencias',
        'foto_perfil',
        'ativo',
        'autor',
        'token',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
        'celular',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'config' => 'array',
        'preferencias' => 'array',
        'genero' => 'string',
        'celular' => 'string',
        'cpf' => 'string',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'token',
    ];
    public $incrementing = false;   // 👈 precisa porque o id não é int
    protected $keyType = 'string';  // 👈 precisa porque UUID é string
    // RELACIONAMENTOS
    public function permission()
    {
        return $this->belongsTo(Permission::class);
    }

    public function menus()
    {
        return $this->belongsToMany(Menu::class, 'menu_permission', 'permission_id', 'menu_id');
    }


    // MÉTODO PARA RETORNAR MENUS FORMATADOS
    // public function menusPermitidosFiltrados()
    // {
    //     return $this->menus()
    //         ->with('submenus') // Caso queira carregar itens de menus
    //         ->orderBy('title')
    //         ->get()
    //         ->map(function ($menu) {
    //             return [
    //                 'title' => $menu->title,
    //                 'url'   => $menu->url,
    //                 'icon'  => $menu->icon,
    //                 'items' => $menu->items ? json_decode($menu->items, true) : null,
    //             ];
    //         });
    // }

    /**
     * Mutator para garantir que genero seja sempre string
     */
    public function setGeneroAttribute($value)
    {
        $this->attributes['genero'] = $value !== null ? (string) $value : null;
    }

    /**
     * Mutator para garantir que celular seja sempre string
     */
    public function setCelularAttribute($value)
    {
        $this->attributes['celular'] = $value !== null ? (string) $value : null;
    }

    /**
     * Mutator para garantir que CPF seja sempre string
     */
    public function setCpfAttribute($value)
    {
        $this->attributes['cpf'] = $value !== null ? (string) $value : null;
    }

    /**
     * Dispara a notificação de redefinição de senha usando nossa
     * ResetPasswordNotification, que por sua vez seleciona o canal Brevo
     * quando a API key estiver configurada e constrói o link para o frontend.
     *
     * EN: Send the password reset notification using our custom
     * ResetPasswordNotification which uses Brevo channel when configured
     * and builds the link to the frontend.
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Registra eventos do ciclo de vida do modelo para sincronização automática com o Asaas.
     */
    protected static function booted()
    {
        static::updated(function ($user) {
            // Só sincroniza se o usuário estiver integrado com o Asaas (possui id_asaas nos metadados)
            $idAsaas = \App\Services\Qlib::get_usermeta($user->id, 'id_asaas', true);
            if (!empty($idAsaas)) {
                // Só dispara sincronização se houver alteração em campos cadastrais relevantes para o Asaas
                if ($user->wasChanged(['name', 'email', 'cpf', 'cnpj', 'celular'])) {
                    try {
                        $gateway = \App\Services\Payment\PaymentGatewayFactory::create('asaas');
                        if (method_exists($gateway, 'ensureAsaasCustomer')) {
                            $gateway->ensureAsaasCustomer($user);
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error("Erro ao sincronizar atualização de usuário com Asaas (ID: {$user->id}): " . $e->getMessage());
                    }
                }
            }
        });
    }
}
