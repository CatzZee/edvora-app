import { usePage } from '@inertiajs/react';
import { ReactNode } from 'react';
import { useMenuGeser } from '@/lib/useMenuGeser';
import SidebarSiswa from './SidebarSiswa';
import TopbarSiswa from './TopbarSiswa';

/**
 * Layout halaman siswa: sidebar, topbar, dan area konten.
 * Dipasang sebagai persistent layout (Halaman.layout = ...), jadi sidebar tidak dirender ulang saat pindah halaman.
 * Di HP drawer ditutup otomatis saat navigasi, dan scroll body dikunci saat drawer terbuka.
 */
export default function SiswaLayout({ children }: { children: ReactNode }) {
    const { props } = usePage<any>();
    const user = props.auth.user;
    const inisial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';
    const [menuTerbuka, setMenuTerbuka] = useMenuGeser();

    return (
        <div className="flex min-h-screen bg-gradient-to-r from-siswa-laman-awal from-[24.711%] to-siswa-laman-akhir">
            <SidebarSiswa terbuka={menuTerbuka} onTutup={() => setMenuTerbuka(false)} />

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <TopbarSiswa inisial={inisial} onBukaMenu={() => setMenuTerbuka(true)} />

                <main className="flex-1 px-6 py-[17px] md:px-[43px]">{children}</main>
            </div>
        </div>
    );
}
