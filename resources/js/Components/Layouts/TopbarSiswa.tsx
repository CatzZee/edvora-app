import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import GambarAvatar from '@/Components/Gamifikasi/GambarAvatar';

// Halaman menu utama sidebar: tidak punya "halaman sebelumnya", jadi tombol kembali disembunyikan.
const HALAMAN_UTAMA = [
    'dashboard',
    'latihan.index',
    'latihan.persiapan',
    'tryout.index',
    'riwayat.index',
    'perkembangan.index',
    'akun.profil.utama',
    'admin.index',
    'admin.user.index',
];

// Tujuan cadangan bila tidak ada riwayat di tab ini (mis. halaman dibuka langsung dari tautan).
const INDUK: [string, string][] = [
    ['latihan.*', 'latihan.index'],
    ['tryout.*', 'tryout.index'],
    ['riwayat.*', 'riwayat.index'],
    ['akun.*', 'akun.profil.utama'],
    ['admin.*', 'admin.index'],
];

// Breadcrumb di samping ikon rumah. Hanya halaman yang desainnya memakai breadcrumb (Figma: Try Out).
const BREADCRUMB: [string, string[]][] = [
    ['tryout.index', ['Try Out']],
    ['tryout.hasil', ['Try Out', 'Hasil Try Out']],
    ['tryout.peringkat', ['Try Out', 'Peringkat Try Out']],
];

function kembali(rutBeranda: string) {
    if (window.history.length > 1) {
        window.history.back();
        return;
    }
    const induk = INDUK.find(([pola]) => route().current(pola))?.[1] ?? rutBeranda;
    router.visit(route(induk));
}

interface TopbarSiswaProps {
    inisial: string;
    rutBeranda?: string; // tujuan ikon rumah; admin memakai 'admin.index'
    onBukaMenu?: () => void; // buka drawer menu HP
}

/**
 * Topbar halaman siswa: hamburger menu (HP), tombol kembali (hanya di sub-halaman), dan pintasan ke Beranda di kiri, avatar pengguna di kanan.
 * Avatar membuka menu berisi nama, email, dan tombol Keluar. Akun Pribadi dibuka lewat sidebar.
 */
export default function TopbarSiswa({ inisial, rutBeranda = 'dashboard', onBukaMenu }: TopbarSiswaProps) {
    // usePage: SiswaLayout persisten, jadi topbar perlu dirender ulang setiap pindah halaman untuk mengecek rute aktif.
    const auth = usePage<any>().props.auth;
    const user = auth?.user;
    // Avatar aktif siswa (shared props); kosong untuk admin, jadi bulatannya memakai inisial.
    const avatarUrl: string | null = auth?.avatarUrl ?? null;
    const subHalaman = !HALAMAN_UTAMA.some((nama) => route().current(nama));
    const breadcrumb = BREADCRUMB.find(([nama]) => route().current(nama))?.[1] ?? [];

    const [menuTerbuka, setMenuTerbuka] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Tutup menu saat klik di luar.
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuTerbuka(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        // sticky top-0: tetap menempel di atas saat halaman di-scroll.
        // z-30: kartu yang di-hover (transform) membuat lapisan baru, jadi topbar perlu di atasnya.
        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between bg-white px-6 font-poppins shadow-kartu md:pl-[52px] md:pr-[38px]">
            <div className="flex min-w-0 items-center gap-3">
                {/* Hamburger menu HP: buka drawer sidebar. */}
                {onBukaMenu && (
                    <button
                        type="button"
                        onClick={onBukaMenu}
                        aria-label="Buka menu"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-siswa-judul transition hover:bg-siswa-laman-awal md:hidden"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                            <path d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                    </button>
                )}

                {subHalaman && (
                    <button
                        type="button"
                        onClick={() => kembali(rutBeranda)}
                        aria-label="Kembali ke halaman sebelumnya"
                        title="Kembali"
                        className="-ml-2 flex h-9 w-9 animate-muncul-halus items-center justify-center rounded-full text-[#6F6F6F] transition duration-200 hover:-translate-x-0.5 hover:bg-siswa-badge-subtes hover:text-siswa-judul"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M11 6l-6 6 6 6" />
                        </svg>
                    </button>
                )}

                <Link href={route(rutBeranda)} aria-label="Beranda" className="shrink-0 transition hover:opacity-70">
                    <img src="/images/ikon/topbar-beranda.png" alt="" className="h-[33.939px] w-[33.939px] object-contain" />
                </Link>

                {breadcrumb.map((item, i) => (
                    <span key={item} className={`min-w-0 animate-muncul-halus items-center gap-3 text-[15px] text-siswa-teks md:text-base ${i < breadcrumb.length - 1 ? 'hidden sm:flex' : 'flex'}`}>
                        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 6l6 6-6 6" />
                        </svg>
                        <span className="truncate">{item}</span>
                    </span>
                ))}
            </div>

            <div className="relative" ref={menuRef}>
                <button
                    type="button"
                    onClick={() => setMenuTerbuka(!menuTerbuka)}
                    aria-label="Menu akun"
                    aria-expanded={menuTerbuka}
                    className="flex items-center gap-4"
                >
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-edvora-primary text-[24px] font-normal leading-none text-white transition hover:bg-edvora-primary-hover">
                        {avatarUrl ? <GambarAvatar src={avatarUrl} nama={inisial} className="h-full w-full object-cover" /> : inisial}
                    </span>
                    <img
                        src="/images/ikon/panah-bawah.png"
                        alt=""
                        className={`h-[19.542px] w-[19.542px] object-contain transition-transform duration-300 ${menuTerbuka ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Menu akun: selalu dirender supaya membuka/menutup dengan memudar; gaya kartu sama dengan halaman siswa. */}
                <div
                    className={`absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-[14px] border border-siswa-garis-halus bg-white py-1.5 shadow-kartu transition duration-200 ease-out ${
                        menuTerbuka ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
                    }`}
                >
                    <div className="flex items-center gap-3 border-b border-siswa-garis-halus px-4 pb-3 pt-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-edvora-primary text-[16px] text-white">
                            {avatarUrl ? <GambarAvatar src={avatarUrl} nama={inisial} className="h-full w-full object-cover" /> : inisial}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-siswa-judul-seksi">{user?.name}</p>
                            <p className="truncate text-[12px] text-siswa-teks">{user?.email}</p>
                        </div>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        tabIndex={menuTerbuka ? 0 : -1}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-siswa-umpan-salah-teks transition-colors duration-150 hover:bg-siswa-umpan-salah"
                    >
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11" />
                        </svg>
                        Keluar
                    </Link>
                </div>
            </div>
        </header>
    );
}
