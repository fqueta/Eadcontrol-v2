<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LiveSessionAbsence extends Model
{
    use HasFactory;

    protected $table = 'live_session_absences';

    protected $fillable = [
        'live_session_id',
        'user_id',
        'observacao',
    ];

    public function session()
    {
        return $this->belongsTo(LiveSession::class, 'live_session_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
