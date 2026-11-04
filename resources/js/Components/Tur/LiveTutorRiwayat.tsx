import TurFitur, { LangkahTur } from './TurFitur';

interface LiveTutorRiwayatProps {
    /** Riwayat berisi setidaknya satu baris pada halaman ini. */
    adaData: boolean;
    /** Ada filter atau pencarian yang sedang digunakan. */
    adaPencarian: boolean;
    /** Navigasi antarhalaman tampil bila hasil lebih dari satu halaman. */
    adaPagination: boolean;
}

const LANGKAH_JUDUL: LangkahTur = {
    target: 'riwayat-judul',
    posisi: 'bawah',
    teks: (
        <>
            Selamat datang di <strong className="font-semibold">Riwayat Pengerjaan!</strong> Di sini kamu dapat melihat sesi latihan dan Try Out yang pernah dikerjakan.
        </>
    ),
};

const LANGKAH_FILTER: LangkahTur[] = [
    {
        target: 'riwayat-filter-jenis',
        posisi: 'bawah',
        teks: (
            <>
                Gunakan filter <strong className="font-semibold">Jenis Sesi</strong> untuk menampilkan Fleksibel, Simulasi, Remedial, atau Try Out saja.
            </>
        ),
    },
    {
        target: 'riwayat-filter-status',
        posisi: 'bawah',
        teks: (
            <>
                Filter <strong className="font-semibold">Status Pengerjaan</strong> membantu memisahkan sesi yang sudah selesai dan yang masih berjalan.
            </>
        ),
    },
    {
        target: 'riwayat-cari',
        posisi: 'bawah',
        teks: (
            <>
                Ketik <strong className="font-semibold">jenis sesi atau nama subtes</strong>, lalu tekan Cari atau Enter untuk menemukan riwayat tertentu.
            </>
        ),
    },
];

const LANGKAH_DATA: LangkahTur[] = [
    {
        target: 'riwayat-tabel',
        posisi: 'atas',
        teks: (
            <>
                Daftar ini berisi <strong className="font-semibold">jenis sesi, subtes, status, dan aksi</strong> untuk setiap pengerjaanmu.
            </>
        ),
    },
    {
        target: 'riwayat-status',
        posisi: 'bawah',
        teks: (
            <>
                <strong className="font-semibold">Status</strong> menunjukkan apakah pengerjaan sudah selesai atau masih bisa dilanjutkan.
            </>
        ),
    },
    {
        target: 'riwayat-info',
        posisi: 'kiri',
        bulat: true,
        jarakSorot: 5,
        teks: (
            <>
                Klik ikon <strong className="font-semibold">informasi</strong> untuk melihat detail singkat, seperti jumlah soal terjawab dan waktu mulai sesi.
            </>
        ),
    },
    {
        target: 'riwayat-aksi',
        posisi: 'atas',
        teks: (
            <>
                Dari tombol ini kamu dapat <strong className="font-semibold">melanjutkan sesi</strong> yang belum selesai atau{' '}
                <strong className="font-semibold">melihat hasil</strong> jika pengerjaan sudah selesai.
            </>
        ),
    },
];

const LANGKAH_PAGINATION: LangkahTur = {
    target: 'riwayat-halaman',
    posisi: 'atas',
    teks: <>Jika riwayatmu panjang, gunakan <strong className="font-semibold">navigasi halaman</strong> ini untuk melihat sesi lainnya.</>,
};

const LANGKAH_KOSONG: LangkahTur = {
    target: 'riwayat-kosong',
    posisi: 'atas',
    teks: (
        <>
            Kamu <strong className="font-semibold">belum memiliki riwayat pengerjaan</strong>. Mulai kerjakan latihan atau Try Out, lalu kembali ke sini untuk melihat hasilnya!
        </>
    ),
};

const LANGKAH_TANPA_HASIL: LangkahTur = {
    target: 'riwayat-tanpa-hasil',
    posisi: 'atas',
    teks: (
        <>
            Belum ada hasil yang cocok. Coba <strong className="font-semibold">mengubah filter atau kata kunci</strong> untuk melihat riwayat lain.
        </>
    ),
};

const LANGKAH_RIWAYAT_KOSONG = [LANGKAH_JUDUL, LANGKAH_KOSONG];
const LANGKAH_RIWAYAT_TANPA_HASIL = [LANGKAH_JUDUL, ...LANGKAH_FILTER, LANGKAH_TANPA_HASIL];
const LANGKAH_RIWAYAT_DATA = [LANGKAH_JUDUL, ...LANGKAH_FILTER, ...LANGKAH_DATA];
const LANGKAH_RIWAYAT_DATA_BANYAK = [...LANGKAH_RIWAYAT_DATA, LANGKAH_PAGINATION];

/** Tur halaman Riwayat: menyesuaikan isi dengan kondisi tanpa data, hasil pencarian, dan pagination. */
export default function LiveTutorRiwayat({ adaData, adaPencarian, adaPagination }: LiveTutorRiwayatProps) {
    const langkah = adaData
        ? adaPagination
            ? LANGKAH_RIWAYAT_DATA_BANYAK
            : LANGKAH_RIWAYAT_DATA
        : adaPencarian
          ? LANGKAH_RIWAYAT_TANPA_HASIL
          : LANGKAH_RIWAYAT_KOSONG;

    // Siswa yang pertama datang saat kosong tetap mendapat tur lengkap ketika riwayat sudah tersedia.
    const kunci = adaData
        ? 'siswa-riwayat-pengerjaan'
        : adaPencarian
          ? 'siswa-riwayat-hasil-kosong'
          : 'siswa-riwayat-belum-ada';

    return <TurFitur kunci={kunci} langkah={langkah} />;
}
