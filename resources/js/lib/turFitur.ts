/**
 * Penanda "tur fitur ini sudah pernah dilihat".
 *
 * Disimpan di localStorage browser, bukan di database: tur hanya bantuan tampilan sekali jalan,
 * jadi tidak perlu ikut tersimpan per akun di server. Konsekuensinya tur akan muncul lagi kalau
 * siswa berganti browser/perangkat, membuka mode penyamaran, atau menghapus data situs.
 *
 * Penanda dipisah per akun (`pemilik` = id user), jadi dua akun yang memakai satu browser tidak
 * saling memengaruhi.
 */

const AWALAN = 'edvora.tur';

/**
 * Kunci penyimpanan selalu memuat nomor versi, supaya tur yang isinya diperbarui bisa
 * ditampilkan ulang ke siswa yang sudah pernah melihat versi lamanya: cukup naikkan versinya.
 */
function kunciSimpan(kunci: string, versi: number, pemilik?: string): string {
    return pemilik ? `${AWALAN}.${pemilik}.${kunci}.v${versi}` : `${AWALAN}.${kunci}.v${versi}`;
}

function baca(kunciPenyimpanan: string): boolean {
    return window.localStorage.getItem(kunciPenyimpanan) === 'selesai';
}

export function sudahLihatTur(kunci: string, versi: number, pemilik?: string): boolean {
    try {
        // Penanda tanpa id akun dibuat sebelum penanda dipisah per akun; tetap dihormati agar siswa
        // yang sudah pernah melihat tur tidak melihatnya lagi.
        return baca(kunciSimpan(kunci, versi, pemilik)) || (pemilik !== undefined && baca(kunciSimpan(kunci, versi)));
    } catch {
        // localStorage bisa ditolak browser (mode penyamaran Safari, penyimpanan situs diblokir).
        // Anggap belum pernah melihat: tur tetap muncul dan tetap bisa ditutup.
        return false;
    }
}

export function tandaiTurSelesai(kunci: string, versi: number, pemilik?: string): void {
    try {
        window.localStorage.setItem(kunciSimpan(kunci, versi, pemilik), 'selesai');
    } catch {
        // Diabaikan dengan sengaja: gagal menyimpan hanya berarti tur muncul lagi nanti.
    }
}

/** Dipakai saat menguji tampilan tur: hapus penanda, lalu muat ulang halaman. */
export function ulangiTur(kunci: string, versi: number, pemilik?: string): void {
    try {
        window.localStorage.removeItem(kunciSimpan(kunci, versi, pemilik));
        window.localStorage.removeItem(kunciSimpan(kunci, versi));
    } catch {
        // Diabaikan: lihat catatan di tandaiTurSelesai.
    }
}
