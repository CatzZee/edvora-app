<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ], [
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
        ]);

        // Akun yang dinonaktifkan admin tidak boleh beraktivitas, termasuk meminta tautan ubah kata sandi.
        if (Password::getUser($request->only('email'))?->is_active === false) {
            throw ValidationException::withMessages(['email' => User::PESAN_NONAKTIF]);
        }

        // Email tautan dikirim User::sendPasswordResetNotification(); pesan status broker diterjemahkan di sini.
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status == Password::RESET_LINK_SENT) {
            return back()->with('status', 'Tautan ubah kata sandi sudah dikirim ke email Anda.');
        }

        throw ValidationException::withMessages([
            'email' => [match ($status) {
                Password::INVALID_USER => 'Email ini tidak terdaftar.',
                Password::RESET_THROTTLED => 'Tautan baru saja dikirim. Tunggu sebentar sebelum meminta lagi.',
                default => trans($status),
            }],
        ]);
    }
}
