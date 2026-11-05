import { usePage } from '@inertiajs/react';
import { PropsWithChildren, useEffect, useState } from 'react';
import { useMenuGeser } from '@/lib/useMenuGeser';
import SidebarSiswa, { MenuSidebar } from './SidebarSiswa';
import TopbarSiswa from './TopbarSiswa';

interface AdminLayoutProps {
    judul: string;
}

export default function AdminLayout({ judul, children }: PropsWithChildren<AdminLayoutProps>) {
    const page = usePage();
    const flash = ((page as any).flash || (page.props as any).flash || {}) as {
        sukses?: string | null;
        error?: string | null;
    };
    const user = (page.props as any).auth?.user || null;

    const [pesanSukses, setPesanSukses] = useState<string | null>(typeof flash.sukses === 'string' ? flash.sukses : null);
    const [pesanError, setPesanError] = useState<string | null>(typeof flash.error === 'string' ? flash.error : null);
    const [menuTerbuka, setMenuTerbuka] = useMenuGeser();

    // Perbarui notifikasi ketika flash props berubah
    useEffect(() => {
        if (typeof flash.sukses === 'string') {
            setPesanSukses(flash.sukses);
            const timer = setTimeout(() => setPesanSukses(null), 4000);
            return () => clearTimeout(timer);
        } else {
            setPesanSukses(null);
        }
    }, [flash.sukses]);

    useEffect(() => {
        if (typeof flash.error === 'string') {
            setPesanError(flash.error);
            const timer = setTimeout(() => setPesanError(null), 4000);
            return () => clearTimeout(timer);
        } else {
            setPesanError(null);
        }
    }, [flash.error]);

    const inisialNama = (user?.name?.trim().charAt(0) || 'A').toUpperCase();

    return (
        // Latar, sidebar, topbar, dan jarak isi sama dengan SiswaLayout, supaya admin dan siswa terasa satu aplikasi.
        <div className="flex min-h-screen w-full bg-gradient-to-r from-siswa-laman-awal from-[24.711%] to-siswa-laman-akhir font-poppins text-siswa-judul antialiased">
            <SidebarSiswa menu={MENU_ADMIN} rutBeranda="admin.index" terbuka={menuTerbuka} onTutup={() => setMenuTerbuka(false)} />

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <TopbarSiswa inisial={inisialNama} rutBeranda="admin.index" onBukaMenu={() => setMenuTerbuka(true)} />

                {/* Notifikasi melayang di atas tengah; hilang sendiri setelah 4 detik. */}
                {pesanSukses && <Notifikasi jenis="sukses" pesan={pesanSukses} />}
                {pesanError && <Notifikasi jenis="error" pesan={pesanError} />}

                <main className="flex-1 px-6 py-[17px] md:px-[43px]">{children}</main>
            </div>
        </div>
    );
}

const kelasIkonMenu = 'h-6 w-6 text-white';

// Menu sidebar admin; ikon SVG putih seukuran ikon menu siswa.
const MENU_ADMIN: MenuSidebar[] = [
    {
        label: 'Dashboard',
        rute: 'admin.index',
        ikon: (
            <svg className={kelasIkonMenu} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <rect height="7" rx="1.5" width="7" x="3" y="3" />
                <rect height="7" rx="1.5" width="7" x="14" y="3" />
                <rect height="7" rx="1.5" width="7" x="14" y="14" />
                <rect height="7" rx="1.5" width="7" x="3" y="14" />
            </svg>
        ),
    },
    {
        label: 'Kelola User',
        rute: 'admin.user.index',
        aktifUntuk: 'admin.user.*',
        ikon: (
            <svg className={kelasIkonMenu} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
];

// Kapsul notifikasi sukses/error dengan gaya kartu halaman siswa.
function Notifikasi({ jenis, pesan }: { jenis: 'sukses' | 'error'; pesan: string }) {
    const sukses = jenis === 'sukses';
    return (
        <div role={sukses ? 'status' : 'alert'} className="fixed left-1/2 top-4 z-50 -translate-x-1/2 animate-muncul-halus">
            <div
                className={`flex items-center gap-3 rounded-kartu border bg-white px-5 py-3 shadow-kartu ${sukses ? 'border-siswa-umpan-benar-teks/40' : 'border-siswa-umpan-salah-teks/40'
                    }`}
            >
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${sukses ? 'bg-siswa-umpan-benar text-siswa-umpan-benar-teks' : 'bg-siswa-umpan-salah text-siswa-umpan-salah-teks'
                        }`}
                >
                    {sukses ? '✓' : '!'}
                </span>
                <span className={`text-[14px] font-semibold ${sukses ? 'text-siswa-umpan-benar-teks' : 'text-siswa-umpan-salah-teks'}`}>{pesan}</span>
            </div>
        </div>
    );
}
