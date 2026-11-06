<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminEditor;
use App\Models\AuditLog;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Daftar User (UCS6): daftar siswa dan editor, tambah editor, reset password editor,
 * nonaktifkan dan hapus siswa. Setiap aksi dicatat di audit log.
 */
class UserController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        // Pencarian siswa berdasarkan nama, email, atau kelas.
        $cari = trim((string) $request->input('cari', ''));

        $siswaQuery = User::where('role', 'siswa')->with('siswa:user_id,nama_lengkap,kelas,jenis_kelamin');

        if ($cari !== '') {
            $pola = '%'.addcslashes($cari, '%_\\').'%';
            // Label kelas tidak disimpan di database, jadi dicocokkan ke kodenya dulu. Key '10' dibaca PHP sebagai
            // integer, sedangkan kolom kelas bertipe text, jadi diubah kembali ke string.
            $kelasCocok = array_map('strval', array_keys(array_filter(
                Siswa::PILIHAN_KELAS,
                fn (string $label) => str_contains(mb_strtolower($label), mb_strtolower($cari)),
            )));

            $siswaQuery->where(function (Builder $q) use ($pola, $kelasCocok) {
                $q->where('name', 'ilike', $pola)
                    ->orWhere('email', 'ilike', $pola)
                    ->orWhereHas('siswa', fn (Builder $s) => $s->where('nama_lengkap', 'ilike', $pola)->orWhereIn('kelas', $kelasCocok));
            });
        }

        // withQueryString: pencarian ikut terbawa saat pindah halaman.
        $siswaList = $siswaQuery->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'namaLengkap' => $user->siswa?->nama_lengkap ?? $user->name ?? '',
                'email' => $user->email,
                'kelasLabel' => Siswa::PILIHAN_KELAS[$user->siswa?->kelas ?? ''] ?? null,
                'jenisKelamin' => $user->siswa?->jenis_kelamin,
                'isActive' => (bool) $user->is_active,
                'emailTerverifikasi' => $user->email_verified_at !== null,
                'tanggalDaftar' => $user->created_at?->toIso8601String(),
                'terakhirLogin' => $user->terakhir_login_at?->toIso8601String(),
            ]);

        // Halaman terakhir bisa kosong setelah siswa terakhirnya dihapus; pindah ke halaman terakhir yang masih berisi.
        if ($siswaList->isEmpty() && $siswaList->currentPage() > 1) {
            return redirect()->to($siswaList->url($siswaList->lastPage()));
        }

        $editorList = User::where('role', 'admin_editor')
            ->with('adminEditor')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'namaLengkap' => $user->adminEditor?->nama_lengkap ?? $user->name ?? '',
                'email' => $user->email,
                'tanggalDaftar' => $user->created_at?->toIso8601String(),
                'terakhirLogin' => $user->terakhir_login_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/KelolaUser', [
            'siswaList' => $siswaList,
            'editorList' => $editorList,
            'cari' => $cari,
        ]);
    }

    public function tambahEditor(Request $request): RedirectResponse
    {
        // Email registrasi selalu huruf kecil, jadi cek unique di bawah ikut tidak peka huruf besar-kecil.
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            // Maks. 50 karena users.name di Supabase bertipe varchar(50).
            'namaLengkap' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ], [
            'namaLengkap.required' => 'Nama wajib diisi.',
            'namaLengkap.string' => 'Nama wajib diisi.',
            'namaLengkap.max' => 'Nama maksimal 50 karakter.',
            'email.required' => 'Email wajib diisi.',
            'email.string' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.max' => 'Email maksimal 255 karakter.',
            'email.unique' => 'Email sudah digunakan',
            ...$this->pesanPassword(),
        ]);

        try {
            DB::transaction(function () use ($data) {
                $user = User::create([
                    'name' => $data['namaLengkap'],
                    'email' => $data['email'],
                    'password' => Hash::make($data['password']),
                    'role' => 'admin_editor',
                    'is_active' => true,
                    // Akun dibuat admin, jadi tidak perlu verifikasi OTP email.
                    'email_verified_at' => now(),
                ]);

                AdminEditor::create([
                    'user_id' => $user->id,
                    'nama_lengkap' => $data['namaLengkap'],
                ]);

                AuditLog::catat('Menambahkan editor', $this->identitas($user));
            });
        } catch (Throwable $e) {
            report($e);
            Inertia::flash('error', 'User editor gagal ditambahkan');

            return back();
        }

        Inertia::flash('sukses', 'Editor baru berhasil ditambahkan');

        return back();
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        // Reset password hanya untuk akun editor.
        abort_unless($user->role === 'admin_editor', 404);

        $data = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ], $this->pesanPassword());

        DB::transaction(function () use ($data, $user) {
            // remember_token diganti agar sesi "ingat saya" dengan password lama tidak bisa dipakai lagi.
            $user->forceFill([
                'password' => Hash::make($data['password']),
                'remember_token' => Str::random(60),
            ])->save();

            AuditLog::catat('Mereset password editor', $this->identitas($user));
        });

        Inertia::flash('sukses', 'Password editor berhasil direset');

        return back();
    }

    public function nonaktifkan(User $user): RedirectResponse
    {
        // Menonaktifkan siswa (SA6): is_active = false, email_verified_at = null, remember_token diganti,
        // OTP cache dihapus. Syarat if ($user->is_active) tetap dipertahankan agar tidak mencatat audit log
        // untuk aksi yang tidak mengubah data. Sesi yang masih berjalan ditangani middleware TolakAkunNonaktif.
        abort_unless($user->role === 'siswa', 404);

        if ($user->is_active) {
            DB::transaction(function () use ($user) {
                $user->forceFill([
                    'is_active' => false,
                    'email_verified_at' => null,
                    'remember_token' => Str::random(60),
                ])->save();

                Cache::forget('otp_'.$user->id);

                AuditLog::catat('Menonaktifkan siswa', $this->identitas($user));
            });
        }

        Inertia::flash('sukses', 'User berhasil dinonaktifkan');

        return back();
    }

    public function aktifkan(User $user): RedirectResponse
    {
        // Mengaktifkan kembali siswa yang dinonaktifkan (SA9): hanya is_active = true.
        // email_verified_at tetap null (dikosongkan saat dinonaktifkan), jadi siswa wajib verifikasi OTP ulang.
        abort_unless($user->role === 'siswa', 404);

        if (! $user->is_active) {
            DB::transaction(function () use ($user) {
                $user->forceFill(['is_active' => true])->save();

                AuditLog::catat('Mengaktifkan siswa', $this->identitas($user));
            });
        }

        Inertia::flash('sukses', 'User berhasil diaktifkan');

        return back();
    }

    public function hapus(User $user): RedirectResponse
    {
        // Hapus hanya untuk akun siswa.
        abort_unless($user->role === 'siswa', 404);

        // Disalin sebelum dihapus, untuk keterangan audit log.
        $identitas = $this->identitas($user);

        try {
            DB::transaction(function () use ($identitas, $user) {
                $this->hapusDataSiswa($user->id);
                $user->delete();

                AuditLog::catat('Menghapus siswa', $identitas);
            });
        } catch (Throwable $e) {
            // Mis. siswa pernah membuat battle (battle.dibuat_oleh merujuk users.id).
            report($e);
            Inertia::flash('error', 'User Gagal Dihapus');

            return back();
        }

        Inertia::flash('sukses', 'User berhasil dihapus');

        return back();
    }

    /**
     * FK ke siswa.user_id dan users.id tidak memakai CASCADE, jadi data milik siswa dihapus dulu,
     * anak sebelum induk. pengerjaan_subtes dan jawaban_pengerjaan ikut terhapus (CASCADE dari pengerjaan).
     */
    private function hapusDataSiswa(string $userId): void
    {
        $pesertaBattleIds = DB::table('battle_peserta')->select('id')->where('user_id', $userId);
        DB::table('battle_jawaban')->whereIn('battle_peserta_id', $pesertaBattleIds)->delete();

        // xp/point_transactions merujuk pengerjaan, jadi dihapus sebelum pengerjaan.
        $tabelList = [
            'battle_peserta',
            'xp_transactions',
            'point_transactions',
            'riwayat_tahap',
            'penguasaan_topik',
            'pengerjaan',
            'siswa_avatar',
            'siswa_badge',
            'siswa',
        ];

        foreach ($tabelList as $tabel) {
            DB::table($tabel)->where('user_id', $userId)->delete();
        }
    }

    private function identitas(User $user): string
    {
        return $user->name.' ('.$user->email.')';
    }

    /**
     * Ditulis sendiri karena proyek belum punya terjemahan bahasa Indonesia (folder lang/).
     *
     * @return array<string, string>
     */
    private function pesanPassword(): array
    {
        return [
            'password.required' => 'Password wajib diisi.',
            'password.string' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
        ];
    }
}
