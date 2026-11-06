<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Siswa extends Model
{
    use HasFactory;

    // Nilai kolom kelas => label yang ditampilkan; dipakai props halaman Biodata dan validasinya.
    // PHP mengubah kunci angka seperti '10' menjadi int, jadi ubah ke string saat dikirim ke React.
    public const PILIHAN_KELAS = [
        '12' => 'Kelas 12 SMA/SMK',
    ];

    protected $table = 'siswa';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'nama_lengkap',
        'kelas',
        'jenis_kelamin',
        'xp',
        'point',
        'streak_saat_ini',
        'universitas_tujuan_id',
        'prodi_tujuan_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function universitasTujuan()
    {
        return $this->belongsTo(Universitas::class, 'universitas_tujuan_id', 'id');
    }

    public function prodiTujuan()
    {
        return $this->belongsTo(ProgramStudi::class, 'prodi_tujuan_id', 'id');
    }

    // Kosong berarti avatar Default (RANCANGAN-badge-avatar.md bagian 5).
    public function avatarAktif()
    {
        return $this->belongsTo(Avatar::class, 'avatar_aktif_id');
    }
}
