import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
import FlashPesan from '@/Components/Editor/FlashPesan';
import { useMenuGeser } from '@/lib/useMenuGeser';
import LambangEdvora from './LambangEdvora';

interface MenuSubtes {
    kode: string;
    nama: string;
}

interface EditorLayoutProps {
    // Isi topbar, mis. ['Bank Soal', 'Penalaran Umum'].
    breadcrumb: string[];
    // Kode subtes halaman ini, untuk menandai submenu Bank Soal (URL halaman edit hanya memuat kode soal).
    subtesAktif?: string;
    children: ReactNode;
}

const KELAS_BARIS = 'flex h-[47px] w-full items-center gap-4 rounded-nav px-[18px] text-[15px] font-medium text-white';
const KELAS_AKTIF = 'bg-gradient-to-r from-siswa-nav-awal from-[3.846%] via-siswa-nav-tengah via-[41.346%] to-siswa-nav-akhir';

/**
 * Layout halaman editor (desain EDVORA/DASHBOARD EDITOR): sidebar dengan submenu Bank Soal per subtes, topbar
 * berisi breadcrumb dan menu akun. Di HP sidebar menjadi drawer dari kiri, dibuka lewat hamburger di topbar.
 */
export default function EditorLayout({ breadcrumb, subtesAktif, children }: EditorLayoutProps) {
    const { props } = usePage<any>();
    const menuBankSoal: MenuSubtes[] = props.menuBankSoal ?? [];
    const nama: string = props.auth.user?.name ?? '';
    const [menuTerbuka, setMenuTerbuka] = useMenuGeser();

    return (
        <div className="flex min-h-screen bg-gradient-to-r from-siswa-laman-awal from-[24.711%] to-siswa-laman-akhir font-poppins">
            <Sidebar menuBankSoal={menuBankSoal} subtesAktif={subtesAktif} terbuka={menuTerbuka} onTutup={() => setMenuTerbuka(false)} />

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar breadcrumb={breadcrumb} nama={nama} onBukaMenu={() => setMenuTerbuka(true)} />
                <main className="flex-1 px-4 py-6 md:px-10 md:py-8">
                    {/* Pesan ->with('sukses'/'gagal') dari halaman Paket Try Out. */}
                    <FlashPesan />
                    {children}
                </main>
            </div>
        </div>
    );
}

function Sidebar({ menuBankSoal, subtesAktif, terbuka, onTutup }: { menuBankSoal: MenuSubtes[]; subtesAktif?: string; terbuka: boolean; onTutup: () => void }) {
    const diBankSoal = route().current('editor.soal.*');
    // Desain punya dua keadaan submenu: tertutup (DASHBOARD EDITOR) dan terbuka (DASHBOARD EDITOR-1).
    const [bankSoalTerbuka, setBankSoalTerbuka] = useState<boolean>(diBankSoal);

    return (
        <>
            {/* Backdrop: tutup drawer saat klik di luar, hanya tampil di HP. */}
            {terbuka && <div onClick={onTutup} className="fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm md:hidden" aria-hidden="true" />}

            {/* Di HP: drawer dari kiri. Saat tertutup di-invisible supaya link menunya tidak bisa dijangkau lewat Tab. Di md ke atas: sidebar tetap. */}
            <aside
                className={`fixed left-0 top-0 z-[40] flex h-screen w-sidebar shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-siswa-sidebar-awal via-siswa-sidebar-tengah via-[41.674%] to-siswa-sidebar-akhir pb-8 transition-[transform,visibility] duration-300 md:visible md:sticky md:translate-x-0 ${
                    terbuka ? 'visible translate-x-0' : 'invisible -translate-x-full'
                }`}
            >
                {/* Tombol tutup drawer, hanya tampil di HP. */}
                <button
                    type="button"
                    onClick={onTutup}
                    aria-label="Tutup menu"
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-white transition hover:bg-white/10 md:hidden"
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>

                <Link href={route('editor.dashboard')} onClick={onTutup} className="flex flex-col items-center pt-[18px]" aria-label="Dashboard editor">
                    <LambangEdvora />
                    <span className="mt-[1px] text-[24px] font-extrabold tracking-[3.6px] text-white">EDVORA</span>
                </Link>

                <nav className="mt-[26px] space-y-1 px-6">
                    <Link
                        href={route('editor.dashboard')}
                        onClick={onTutup}
                        aria-current={route().current('editor.dashboard') ? 'page' : undefined}
                        className={`${KELAS_BARIS} transition ${route().current('editor.dashboard') ? KELAS_AKTIF : 'hover:bg-white/10'}`}
                    >
                        <IkonMenu d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                        Dashboard
                    </Link>

                    <button
                        type="button"
                        onClick={() => setBankSoalTerbuka(!bankSoalTerbuka)}
                        aria-expanded={bankSoalTerbuka}
                        className={`${KELAS_BARIS} transition ${diBankSoal ? KELAS_AKTIF : 'hover:bg-white/10'}`}
                    >
                        <IkonMenu d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" />
                        <span className="flex-1 text-left">Bank Soal</span>
                        <svg className={`h-5 w-5 transition-transform ${bankSoalTerbuka ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                            <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>

                    {bankSoalTerbuka && (
                        <ul className="ml-[30px] space-y-0.5 border-l border-white/50 py-1 pl-3">
                            {menuBankSoal.map((s) => (
                                <li key={s.kode}>
                                    <Link
                                        href={route('editor.soal.index', s.kode)}
                                        onClick={onTutup}
                                        title={s.nama}
                                        aria-current={s.kode === subtesAktif ? 'page' : undefined}
                                        className={`flex gap-2 rounded-full px-2.5 py-1.5 text-[11px] text-white transition ${
                                            s.kode === subtesAktif ? 'bg-white/25 font-semibold' : 'hover:bg-white/10'
                                        }`}
                                    >
                                        <span className="w-7 shrink-0 font-semibold">{s.kode}</span>
                                        <span className="truncate">{s.nama}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Link
                        href={route('editor.tryout.index')}
                        onClick={onTutup}
                        aria-current={route().current('editor.tryout.*') ? 'page' : undefined}
                        className={`${KELAS_BARIS} transition ${route().current('editor.tryout.*') ? KELAS_AKTIF : 'hover:bg-white/10'}`}
                    >
                        <IkonMenu d="M9 4h6v3H9zM7 5.5H5.5A1.5 1.5 0 004 7v12.5A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5V7a1.5 1.5 0 00-1.5-1.5H17M8.5 13l2.5 2.5 4.5-4.5" />
                        Paket Try Out
                    </Link>
                    <Link
                        href={route('editor.analitik')}
                        onClick={onTutup}
                        aria-current={route().current('editor.analitik') ? 'page' : undefined}
                        className={`${KELAS_BARIS} transition ${route().current('editor.analitik') ? KELAS_AKTIF : 'hover:bg-white/10'}`}
                    >
                        <IkonMenu d="M5 20V11M12 20V4M19 20v-6M3 20h18" />
                        Analitik
                    </Link>
                </nav>
            </aside>
        </>
    );
}

function Topbar({ breadcrumb, nama, onBukaMenu }: { breadcrumb: string[]; nama: string; onBukaMenu: () => void }) {
    const [menuAkun, setMenuAkun] = useState(false);

    return (
        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between gap-3 bg-white px-4 shadow-kartu md:px-10">
            <div className="flex min-w-0 items-center gap-3">
                {/* Hamburger menu HP: buka drawer sidebar. */}
                <button
                    type="button"
                    onClick={onBukaMenu}
                    aria-label="Buka menu"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-siswa-judul transition hover:bg-siswa-laman-awal md:hidden"
                >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                        <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                </button>

                {/* Di HP hanya bagian terakhir breadcrumb yang tampil, supaya tidak terpotong; bagian lain muncul mulai sm. */}
                <p className="min-w-0 truncate text-[15px] text-siswa-teks md:text-lg">
                    {breadcrumb.map((bagian, i) => {
                        const terakhir = i === breadcrumb.length - 1;
                        return (
                            <span key={i} className={terakhir ? '' : 'hidden sm:inline'}>
                                {i > 0 && <span className="mx-2 hidden sm:inline">›</span>}
                                {bagian}
                            </span>
                        );
                    })}
                </p>
            </div>

            <div className="relative">
                <button type="button" onClick={() => setMenuAkun(!menuAkun)} aria-haspopup="menu" aria-expanded={menuAkun} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-edvora-primary text-[22px] leading-none text-white">
                        {nama ? nama.charAt(0).toUpperCase() : 'E'}
                    </span>
                    <svg className="h-5 w-5 text-siswa-teks" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {menuAkun && (
                    <div role="menu" className="absolute right-0 mt-2 w-52 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5">
                        <p className="truncate px-4 pb-2 text-xs text-siswa-teks">{nama}</p>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            role="menuitem"
                            className="block w-full px-4 py-2 text-left text-sm font-medium text-siswa-judul hover:bg-siswa-badge-subtes"
                        >
                            Keluar
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}

function IkonMenu({ d }: { d: string }) {
    return (
        <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}
