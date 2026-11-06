<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    private const PESAN_TAUTAN_TIDAK_VALID = 'Tautan ubah kata sandi tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.';

    /**
     * Display the password reset view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
            // Layar "Ubah kata sandi berhasil" ditampilkan di halaman ini setelah store() sukses.
            'berhasil' => (bool) session('sandiDiperbarui', false),
        ]);
    }

    /**
     * Handle an incoming new password request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // Email dan token berasal dari tautan (tidak diketik user), jadi kesalahannya ditampilkan sebagai tautan tidak valid.
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ], [
            'email.required' => self::PESAN_TAUTAN_TIDAK_VALID,
            'email.email' => self::PESAN_TAUTAN_TIDAK_VALID,
            'password.required' => 'Kata sandi wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
        ]);

        // Tautan yang diminta sebelum akun dinonaktifkan admin tidak boleh dipakai selama akun nonaktif.
        if (Password::getUser($request->only('email'))?->is_active === false) {
            throw ValidationException::withMessages(['email' => User::PESAN_NONAKTIF]);
        }

        // Here we will attempt to reset the user's password. If it is successful we
        // will update the password on an actual user model and persist it to the
        // database. Otherwise we will parse the error and return the response.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        // Berhasil: kembali ke halaman reset yang sama untuk menampilkan layar berhasil
        // (tombolnya mengarah ke Login). Gagal: pesan dikirim di kunci email.
        if ($status == Password::PASSWORD_RESET) {
            return redirect()->route('password.reset', ['token' => $request->token, 'email' => $request->email])
                ->with('sandiDiperbarui', true);
        }

        throw ValidationException::withMessages([
            'email' => [match ($status) {
                Password::INVALID_TOKEN => self::PESAN_TAUTAN_TIDAK_VALID,
                Password::INVALID_USER => 'Email ini tidak terdaftar.',
                default => trans($status),
            }],
        ]);
    }
}
