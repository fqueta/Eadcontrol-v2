<?php

namespace App\Models;

use App\Http\Controllers\Api\ClientController;
use Illuminate\Database\Eloquent\Builder;
use App\Models\User;
use App\Models\Permission;
use App\Services\Qlib;

class Client extends User
{
    protected $table = 'users';

    /**
     * Escopos e eventos do modelo Client.
     *
     * PT: Define dinamicamente o `permission_id` do perfil "Cliente" ao criar
     * e aplica escopo global para retornar somente clientes desse perfil.
     * O ID é obtido da tabela `permissions` pelo nome "Cliente";
     * caso não exista, usa 7 como fallback.
     * EN: Dynamically sets the "Cliente" role `permission_id` on create
     * and applies a global scope to only return clients of that role.
     * The ID is resolved from `permissions` by name "Cliente"; falls back to 7.
     */
    protected static function booted()
    {
        // Resolve o ID do perfil "Cliente" dinamicamente
        $cliente_permission_id = (new ClientController)->cliente_permission_id;

        static::creating(function ($client) use ($cliente_permission_id) {
            $client->permission_id = $cliente_permission_id;
        });

        static::addGlobalScope('client', function (Builder $builder) use ($cliente_permission_id) {
            $builder->where('permission_id', $cliente_permission_id);
        });
    }

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
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];
}
