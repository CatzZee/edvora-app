import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * Status menu geser (drawer) sidebar di HP, dipakai SiswaLayout, AdminLayout, dan EditorLayout.
 * Menutup drawer saat pindah halaman atau tombol Escape ditekan, dan mengunci scroll body selama drawer terbuka.
 */
export function useMenuGeser(): [boolean, (terbuka: boolean) => void] {
    const [terbuka, setTerbuka] = useState(false);

    // router.on mengembalikan fungsi pelepas listener. Perlu karena layout siswa persisten (tidak di-mount ulang saat pindah halaman).
    useEffect(() => router.on('navigate', () => setTerbuka(false)), []);

    useEffect(() => {
        if (!terbuka) {
            return;
        }

        const tutupDenganEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setTerbuka(false);
            }
        };
        document.addEventListener('keydown', tutupDenganEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', tutupDenganEscape);
            document.body.style.overflow = '';
        };
    }, [terbuka]);

    return [terbuka, setTerbuka];
}
