<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class ContentType extends Model
{
    use HasFactory;

    protected $table = 'posts';
    protected $primaryKey = 'ID';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'post_author',
        'post_content',
        'post_title',
        'post_excerpt',
        'post_status',
        'comment_status',
        'ping_status',
        'post_password',
        'post_name',
        'to_ping',
        'pinged',
        'post_content_filtered',
        'post_parent',
        'guid',
        'menu_order',
        'post_type',
        'post_mime_type',
        'comment_count',
        'config',
        'token',
        'excluido',
        'reg_excluido',
        'deletado',
        'reg_deletado',
    ];

    protected $casts = [
        'config' => 'array',
        'post_author' => 'string',
        'post_parent' => 'integer',
        'menu_order' => 'integer',
        'comment_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $hidden = [
        'post_password',
    ];

    protected static function booted()
    {
        static::addGlobalScope('contentTypesOnly', function (Builder $builder) {
            $builder->where('post_type', 'tipo_conteudo');
        });
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($query) {
                $query->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($query) {
                $query->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
        static::creating(function ($model) {
            $model->post_type = 'tipo_conteudo';
        });
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'post_author');
    }

    public function parent()
    {
        return $this->belongsTo(ContentType::class, 'post_parent', 'ID');
    }

    public function children()
    {
        return $this->hasMany(ContentType::class, 'post_parent', 'ID');
    }

    public function scopePublished($query)
    {
        return $query->where('post_status', 'publish');
    }

    public function generateSlug($title)
    {
        $slug = Str::slug($title);
        $count = static::where('post_name', $slug)->count();
        if ($count > 0) {
            $slug = $slug . '-' . ($count + 1);
        }
        return $slug;
    }
}
