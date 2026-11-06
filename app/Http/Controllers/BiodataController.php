<?php

namespace App\Http\Controllers;

use App\Http\Middleware\PastikanBiodataLengkap;
use App\Http\Requests\SimpanBiodataRequest;
use App\Models\Siswa;
use App\Services\ReferensiKampus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BiodataController extends Controller
{
    public function index(ReferensiKampus $referensi): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'siswa', 403);

        // Bisa null untuk akun lama yang dibuat sebelum pendaftaran ikut membuat baris siswa;
        // barisnya dibuat saat simpan().
        $siswa = Siswa::find($user->id);

        return Inertia::render('Auth/Biodata', [
            'universitasList' => $referensi->universitasAktif(),
            'pilihanKelas' => collect(Siswa::PILIHAN_KELAS)
                ->map(fn (string $label, int|string $nilai) => ['nilai' => (string) $nilai, 'label' => $label])
                ->values(),
            'biodata' => [
                'namaLengkap' => $siswa?->nama_lengkap ?? $user->name ?? '',
                'kelas' => $siswa?->kelas,
                'jenisKelamin' => $siswa?->jenis_kelamin,
                'universitasTujuanId' => $siswa?->universitas_tujuan_id,
                'prodiTujuanId' => $siswa?->prodi_tujuan_id,
            ],
        ]);
    }

    public function simpan(SimpanBiodataRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $user = Auth::user();

        DB::transaction(function () use ($data, $user) {
            $kolom = [
                'nama_lengkap' => $data['namaLengkap'],
                // Pilihan di form tetap divalidasi, tetapi yang disimpan selalu Kelas 12.
                'kelas' => Siswa::KELAS_DISIMPAN,
                'jenis_kelamin' => $data['jenisKelamin'],
                'universitas_tujuan_id' => $data['universitasTujuanId'],
                'prodi_tujuan_id' => $data['prodiTujuanId'],
            ];

            $siswa = Siswa::find($user->id);

            if ($siswa) {
                $siswa->update($kolom);
            } else {
                Siswa::create($kolom + ['user_id' => $user->id, 'xp' => 0, 'point' => 0, 'streak_saat_ini' => 0]);
            }

            // Nama di header aplikasi dibaca dari users.name.
            $user->update(['name' => $data['namaLengkap']]);
        });

        $request->session()->put(PastikanBiodataLengkap::KUNCI_SESSION, true);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
