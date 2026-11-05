<?php

namespace App\Http\Controllers;

use App\Models\Pengerjaan;
use App\Models\Siswa;
use App\Models\Subtes;
use App\Services\LevelXp;
use App\Services\Penguasaan;
use App\Services\RekomendasiTopik;
use App\Services\RingkasanPenguasaan;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BerandaController extends Controller
{
    public function index(RingkasanPenguasaan $ringkasan, RekomendasiTopik $rekomendasi): Response
    {
        $userId = Auth::id();
        // Akun tanpa baris siswa (admin, akun lama) dianggap 0 XP dan 0 poin.
        $siswa = Siswa::whereKey($userId)->first(['xp', 'point']);
        $subtesList = Subtes::orderBy('urutan')->get(['id', 'kode_subtes', 'nama_subtes']);
        // subtes_id => topik beserta tahap dan skor siswa, dalam satu query untuk semua subtes.
        $topikPerSubtes = $ringkasan->perSubtes($userId);

        // Tur ditampilkan bila created_at belum lewat 7 hari DAN belum punya riwayat pengerjaan.
        // created_at null (akun lama) dianggap false. Query riwayat hanya jalan untuk akun baru (&& berhenti lebih awal).
        $akunBaru = Auth::user()->created_at?->gt(now()->subDays(7)) ?? false;
        $tampilkanTur = $akunBaru && ! Pengerjaan::where('user_id', $userId)->exists();

        return Inertia::render('Dashboard/Siswa', [
            'level' => LevelXp::dariXp((int) ($siswa?->xp ?? 0))['level'],
            'poin' => (int) ($siswa?->point ?? 0),
            'rekomendasi' => array_map(fn (array $topik) => [
                'topikId' => $topik['id'],
                'kodeSubtes' => $topik['kodeSubtes'],
                'namaTopik' => $topik['nama'],
                'persen' => Penguasaan::persen($topik['tahap'], $topik['skor']),
            ], $rekomendasi->teratas($subtesList, $topikPerSubtes)),
            'penguasaanSubtes' => $subtesList
                ->map(fn (Subtes $subtes) => $this->penguasaanSubtes($subtes, $topikPerSubtes[$subtes->id] ?? []))
                ->values(),
            'tampilkanTur' => $tampilkanTur,
        ]);
    }

    /**
     * Lingkaran satu subtes. Rumusnya di Penguasaan::persenSubtes(), dipakai juga halaman Perkembangan.
     *
     * @return array{kode: ?string, nama: string, persen: float, adaData: bool}
     */
    private function penguasaanSubtes(Subtes $subtes, array $topikList): array
    {
        return [
            'kode' => $subtes->kode_subtes,
            'nama' => $subtes->nama_subtes,
            ...Penguasaan::persenSubtes($topikList),
        ];
    }
}
