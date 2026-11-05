import { Link, usePage } from '@inertiajs/react';
import { ReactNode } from 'react';
import GambarAvatar from '@/Components/Gamifikasi/GambarAvatar';
import LambangEdvora from './LambangEdvora';

// Satu langkah breadcrumb; href diisi bila langkah itu punya halaman yang bisa dibuka.
export type LangkahBreadcrumb = string | { label: string; href?: string };

interface LatihanLayoutProps {
    breadcrumb?: LangkahBreadcrumb[];
    // Try Out: judul di tengah topbar menggantikan breadcrumb, tanpa tautan ke Beranda
    // (siswa tidak boleh meninggalkan Try Out lewat topbar).
    judulTengah?: string;
    // Halaman pengerjaan soal: lambang, ikon Beranda, dan langkah breadcrumb jadi tulisan biasa yang tidak bisa diklik,
    // supaya siswa tidak keluar dari ujian lewat topbar. Keluar hanya lewat tombol di panel Navigasi Soal.
    tanpaTautan?: boolean;
    // Panel kanan (Navigasi Soal). Di layar sempit turun ke bawah konten, dan bulatan nomornya
    // disembunyikan ke lembar bawah oleh NavigasiSoal supaya tombol aksi menempel di bawah opsi jawaban.
    sidebar?: ReactNode;
    children: ReactNode;
}

/**
 * Layout halaman pengerjaan (Figma node 669:7082): topbar penuh dengan lambang, breadcrumb rata kiri di sampingnya,
 * dan avatar; tanpa sidebar menu supaya siswa fokus mengerjakan soal.
 */
export default function LatihanLayout({ breadcrumb = [], judulTengah, tanpaTautan = false, sidebar, children }: LatihanLayoutProps) {
    const auth = usePage<any>().props.auth;
    const namaUser: string = auth?.user?.name ?? '';
    const inisial = namaUser.charAt(0).toUpperCase() || 'A';
    // Avatar aktif siswa (shared props); kosong untuk admin dan editor, jadi bulatannya memakai inisial.
    const avatarUrl: string | null = auth?.avatarUrl ?? null;

    return (
        <div className="flex h-screen flex-col bg-gradient-to-r from-siswa-laman-awal from-[24.711%] to-siswa-laman-akhir font-poppins text-siswa-judul">
            {/* Tinggi, jarak tepi, bayangan, dan ukuran ikon/avatar disamakan dengan TopbarSiswa di Beranda. */}
            <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-4 bg-white px-6 shadow-kartu md:pl-[52px] md:pr-[38px]">
                {judulTengah || tanpaTautan ? (
                    <LambangEdvora className="h-[40px] w-[34px]" />
                ) : (
                    <Link href={route('dashboard')} aria-label="Beranda" className="transition hover:opacity-80">
                        <LambangEdvora className="h-[40px] w-[34px]" />
                    </Link>
                )}

                {judulTengah ? (
                    <h1 className="min-w-0 flex-1 truncate text-center text-sm font-medium text-siswa-teks md:text-[15px]">{judulTengah}</h1>
                ) : (
                    <nav aria-label="Breadcrumb" className="ml-2 flex min-w-0 flex-1 items-center gap-2 text-sm text-siswa-teks md:ml-4 md:gap-3 md:text-[15px]">
                        {tanpaTautan ? (
                            <span className="shrink-0">
                                <img src="/images/ikon/topbar-beranda.png" alt="" className="h-[33.939px] w-[33.939px] object-contain" />
                            </span>
                        ) : (
                            <Link href={route('dashboard')} aria-label="Beranda" className="shrink-0 transition hover:opacity-70">
                                <img src="/images/ikon/topbar-beranda.png" alt="" className="h-[33.939px] w-[33.939px] object-contain" />
                            </Link>
                        )}
                        {breadcrumb.map((item, i) => {
                            const terakhir = i === breadcrumb.length - 1;
                            const { label, href } = typeof item === 'string' ? { label: item, href: undefined } : item;
                            return (
                                // Item selain yang terakhir disembunyikan di layar sempit supaya breadcrumb tidak terpotong.
                                <span key={i} className={`min-w-0 items-center gap-2 md:gap-3 ${terakhir ? 'flex' : 'hidden sm:flex'}`}>
                                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 6l6 6-6 6" />
                                    </svg>
                                    {href && !terakhir && !tanpaTautan ? (
                                        <Link href={href} className="truncate transition hover:text-edvora-primary">
                                            {label}
                                        </Link>
                                    ) : (
                                        <span aria-current={terakhir ? 'page' : undefined} className={`truncate ${terakhir ? 'font-medium text-siswa-judul/80' : ''}`}>
                                            {label}
                                        </span>
                                    )}
                                </span>
                            );
                        })}
                    </nav>
                )}

                {/* Tanpa ikon dropdown: menu akun hanya ada di topbar halaman menu, bukan di halaman pengerjaan. */}
                <div className="flex shrink-0 items-center">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-edvora-primary text-[24px] font-normal leading-none text-white">
                        {avatarUrl ? <GambarAvatar src={avatarUrl} nama={inisial} className="h-full w-full object-cover" /> : inisial}
                    </span>
                </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto">
                {sidebar ? (
                    // Selebar layar seperti di Figma: hanya jarak tepi yang membesar di layar lebar, tanpa batas lebar konten.
                    <div className="grid w-full gap-4 px-4 py-6 md:grid-cols-[minmax(0,1fr)_260px] md:gap-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_338px] lg:gap-[18px] lg:px-[52px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6 2xl:px-16">
                        <div className="min-w-0">{children}</div>
                        <aside className="md:sticky md:top-6 md:self-start">{sidebar}</aside>
                    </div>
                ) : (
                    children
                )}
            </main>
        </div>
    );
}
