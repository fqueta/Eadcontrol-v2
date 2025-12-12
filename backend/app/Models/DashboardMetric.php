<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DashboardMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'period',
        'investment',
        'visitors',
        'bot_conversations',
        'human_conversations',
        'proposals',
        'closed_deals',
        'campaign_id',
        'meta',
        'token',
    ];
}
