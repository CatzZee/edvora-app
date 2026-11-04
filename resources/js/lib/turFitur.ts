/**
 * Penanda "tur fitur ini sudah pernah dilihat".
 *
 * Disimpan di localStorage browser, bukan di database: tur hanya bantuan tampilan sekali jalan,
 * jadi tidak perlu ikut tersimpan per akun di server. Konsekuensinya tur akan muncul lagi kalau
 * siswa berganti browser/perangkat, membuka mode penyamaran, atau menghapus data situs.
 */

const AWALAN = 'edvora.tur';

/**
 * Kunci penyimpanan selalu memuat nomor versi, supaya tur yang isinya diperbarui bisa
 * ditampilkan ulang ke siswa yang sudah pernah melihat versi lamanya: cukup naikkan versinya.
 */
function kunciSimpan(kunci: string, versi: number): string {
    return `${AWALAN}.${kunci}.v${versi}`;
}

export function sudahLihatTur(kunci: string, versi: number): boolean {
    try {
        return window.localStorage.getItem(kunciSimpan(kunci, versi)) === 'selesai';
    } catch {
        // localStorage bisa ditolak browser (mode penyamaran Safari, penyimpanan situs diblokir).
        // Anggap belum pernah melihat: tur tetap muncul dan tetap bisa ditutup.
        return false;
    }
}

export function tandaiTurSelesai(kunci: string, versi: number): void {
    try {
        window.localStorage.setItem(kunciSimpan(kunci, versi), 'selesai');
    } catch {
        // Diabaikan dengan sengaja: gagal menyimpan hanya berarti tur muncul lagi nanti.
    }
}

/** Dipakai saat menguji tampilan tur: hapus penanda, lalu muat ulang halaman. */
export function ulangiTur(kunci: string, versi: number): void {
    try {
        window.localStorage.removeItem(kunciSimpan(kunci, versi));
    } catch {
        // Diabaikan: lihat catatan di tandaiTurSelesai.
    }
}
