import TurFitur, { LangkahTur } from './TurFitur';

type ModeLatihan = 'fleksibel' | 'simulasi' | 'remedial';

interface LiveTutorModeProps {
    mode: ModeLatihan;
    remedialTersedia: boolean;
}

// Satu tur untuk halaman Pilih Mode, tidak diulang pada setiap subtes yang dibuka.
// Atribut data-tur dipasang di PilihMode.tsx, bukan di komponen bersama.
const LANGKAH_AWAL: LangkahTur[] = [
    {
        target: 'mode-subtes',
        posisi: 'bawah',
        teks: (
            <>
                Ini adalah <strong className="font-semibold">subtes yang kamu pilih</strong>. Periksa nama dan deskripsinya sebelum mulai berlatih!
            </>
        ),
    },
    {
        target: 'mode-tab',
        posisi: 'bawah',
        teks: (
            <>
                Ada tiga pilihan: <strong className="font-semibold">Fleksibel</strong> untuk latihan sesuai kebutuhan,{' '}
                <strong className="font-semibold">Simulasi</strong> untuk latihan berbatas waktu, dan{' '}
                <strong className="font-semibold">Remedial</strong> untuk mengulang soal yang pernah salah.
                Pilih tab untuk mengganti mode.
            </>
        ),
    },
];

const LANGKAH_PANEL: LangkahTur = {
    target: 'mode-penjelasan',
    posisi: 'bawah',
    teks: (
        <>
            Perhatikan <strong className="font-semibold">penjelasan mode</strong> ini untuk mengetahui aturan latihan dan jenis soal yang akan dikerjakan.
        </>
    ),
};

const LANGKAH_FLEKSIBEL: LangkahTur[] = [
    {
        target: 'mode-topik',
        posisi: 'atas',
        teks: (
            <>
                <strong className="font-semibold">Pilih topik</strong> yang ingin kamu pelajari. Kamu bisa memilih satu, beberapa, atau semua topik sekaligus!
            </>
        ),
    },
    {
        target: 'mode-jumlah',
        posisi: 'atas',
        teks: (
            <>
                Gunakan tombol <strong className="font-semibold">kurang dan tambah</strong> untuk mengatur jumlah soal dalam batas yang tersedia.
            </>
        ),
    },
    {
        target: 'mode-mulai',
        posisi: 'atas',
        teks: (
            <>
                Jika topik dan jumlah soal sudah sesuai, klik <strong className="font-semibold">Mulai Mengerjakan</strong> untuk memulai sesi latihanmu!
            </>
        ),
    },
];

const LANGKAH_MULAI: LangkahTur = {
    target: 'mode-mulai',
    posisi: 'atas',
    teks: (
        <>
            Sudah siap? Tekan <strong className="font-semibold">Mulai Mengerjakan</strong> untuk membuka sesi sesuai mode yang dipilih.
        </>
    ),
};

const LANGKAH_REMEDIAL_KOSONG: LangkahTur = {
    target: 'mode-penjelasan',
    posisi: 'bawah',
    teks: (
        <>
            <strong className="font-semibold">Remedial belum tersedia</strong> karena belum ada soal yang perlu diulang.
            Kamu bisa mengerjakan mode Fleksibel atau Simulasi terlebih dahulu.
        </>
    ),
};

const LANGKAH_SIMULASI = [...LANGKAH_AWAL, LANGKAH_PANEL, LANGKAH_MULAI];
const LANGKAH_REMEDIAL = [...LANGKAH_AWAL, LANGKAH_PANEL, LANGKAH_MULAI];
const LANGKAH_REMEDIAL_BELUM_ADA = [...LANGKAH_AWAL, LANGKAH_REMEDIAL_KOSONG];
const LANGKAH_MODE_FLEKSIBEL = [...LANGKAH_AWAL, LANGKAH_PANEL, ...LANGKAH_FLEKSIBEL];

/** Panduan pertama kali membuka halaman Pilih Mode (memakai komponen tur dari Cindy). */
export default function LiveTutorMode({ mode, remedialTersedia }: LiveTutorModeProps) {
    const langkah = mode === 'fleksibel'
        ? LANGKAH_MODE_FLEKSIBEL
        : mode === 'simulasi'
          ? LANGKAH_SIMULASI
          : remedialTersedia
            ? LANGKAH_REMEDIAL
            : LANGKAH_REMEDIAL_BELUM_ADA;

    // Setiap mode dipandu sekali; remedial yang belum tersedia tidak menghabiskan tur remedial aktif.
    const kunci = mode === 'remedial' && !remedialTersedia
        ? 'siswa-pilih-mode-remedial-terkunci'
        : `siswa-pilih-mode-${mode}`;

    return <TurFitur kunci={kunci} langkah={langkah} />;
}
