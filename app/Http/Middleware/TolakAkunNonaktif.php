<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logout paksa akun dengan is_active = false (SA8).
 * Tanpa middleware ini, sesi yang masih berjalan saat admin menonaktifkan siswa akan dibelokkan
 * ke halaman OTP dan kode baru terkirim otomatis, sehingga siswa bisa aktif lagi tanpa admin.
 * Cek HANYA is_active, jangan email_verified_at (siswa baru yang belum OTP boleh login ke halaman OTP).
 */
class TolakAkunNonaktif
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && ! $user->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            // Halaman Login hanya membaca pesan dari session('status'), bukan dari query URL.
            $request->session()->flash('status', User::PESAN_NONAKTIF);

            // Kunjungan Inertia: muat ulang penuh ke Login, seperti logout biasa.
            if ($request->inertia()) {
                return Inertia::location(route('login'));
            }

            // Panggilan axios (mis. latihan.jawab): redirect akan diikuti diam-diam dan axios menerima HTML
            // halaman Login sebagai jawaban sukses. 401 membuat pesanGagal() menampilkan message ini.
            if ($request->expectsJson()) {
                return response()->json(['message' => User::PESAN_NONAKTIF], 401);
            }

            return redirect()->route('login');
        }

        return $next($request);
    }
}
