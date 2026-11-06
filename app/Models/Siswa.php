<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Siswa extends Model
{
    use HasFactory;

    // Pilihan kelas di form Biodata dan Edit Biodata (nilai => label), juga dipakai validasinya.
    // PHP mengubah kunci angka seperti '10' menjadi int, jadi ubah ke string saat dikirim ke React.
    public const PILIHAN_KELAS = [
        '10' => 'Kelas 10 SMA/SMK',
        '11' => 'Kelas 11 SMA/SMK',
        '12' => 'Kelas 12 SMA/SMK',
        'kuliah-awal' => 'Tingkat 1 - 2 (Semester Awal)',
        'kuliah-akhir' => 'Tingkat 3 - 4 (Semester Akhir)',
        'umum' => 'Alumni / Mahasiswa Pasca',
    ];

    // Keputusan tim: form menampilkan semua pilihan, tetapi yang disimpan ke kolom kelas selalu '12'.
    public const KELAS_DISIMPAN = '12';

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
