import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, ReactNode, useState } from 'react';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import Modal from '@/Components/Modal';
import LiveTutorRiwayat from '@/Components/Tur/LiveTutorRiwayat';

// Pilihan filter; kode sama dengan FilterRiwayat::JENIS dan ::STATUS di backend.
const PILIHAN_JENIS = {
    fleksibel: 'Latihan Soal Fleksibel',
    simulasi: 'Latihan Simulasi',
    remedial: 'Remedial',
    tryout: 'Try Out',
} as const;

const PILIHAN_STATUS = {
    selesai: 'Selesai',
    belum_selesai: 'Belum Selesai',
} as const;

type JenisSesi = keyof typeof PILIHAN_JENIS;
type StatusFilter = keyof typeof PILIHAN_STATUS;

// Interface Data
interface RiwayatItem {
    id: string;
    tipe: string;
    mode_latihan?: string;
    status: 'berjalan' | 'selesai';
    jenis_pengerjaan: string;
    nama_materi: string;
    total_skor: number;
    started_at: string;
    finished_at?: string;
    try_out_id?: string;
    subtes_id?: string;
}

interface PaginatedData<T> {
    data: T[];
    // Dari paginator Laravel: [Sebelumnya, 1, 2, ..., Berikutnya]; url null bila tidak bisa dipencet.
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
}

interface IndexProps {
    title?: string;
    riwayat: PaginatedData<RiwayatItem>;
    // Pencarian dan filter yang sedang berlaku; null = tanpa filter (semua riwayat).
    filters: {
        cari: string;
        jenis: JenisSesi | null;
        status: StatusFilter | null;
    };
}

interface ModalInfoData {
    judul: string;
    tipe: string;
    mode_latihan: string;
    started_at: string;
    status: string;
    total_dijawab: number;
    jumlah_soal: number;
    skor: number;
}

// Ikon dan warna per jenis sesi, dipakai di modal informasi. Warna latar mengikuti kartu menu Beranda.
const getCardStyle = (tipe: string, mode_latihan?: string) => {
    if (tipe === 'try_out' || tipe === 'tryout') {
        return {
            bgIcon: 'bg-siswa-ikon-tryout',
            textIcon: 'text-[#4C9A3A]',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2.41L17.59 9H13V4.41zM6 20V4h5v7h7v9H6zm2-8h8v2H8v-2zm0 4h5v2H8v-2z" />
                </svg>
            ),
        };
    }

    if (mode_latihan === 'remedial') {
        return {
            bgIcon: 'bg-siswa-ikon-hover-remedial',
            textIcon: 'text-siswa-ubin-remedial',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                    <path d="m9 14 2 2 4-4" />
                </svg>
            ),
        };
    }

    if (mode_latihan === 'simulasi') {
        return {
            bgIcon: 'bg-siswa-ikon-hover-simulasi',
            textIcon: 'text-siswa-ubin-simulasi',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 2v2" />
                    <path d="M12 8v4l2 2" />
                </svg>
            ),
        };
    }

    // Default: Fleksibel
    return {
        bgIcon: 'bg-siswa-ikon-latihan',
        textIcon: 'text-edvora-primary',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
        ),
    };
};

// Tombol aksi di tiap baris; lebarnya sama supaya kolom aksi rapi.
const KELAS_AKSI =
    'flex h-9 w-full items-center justify-center rounded-[10px] px-4 text-[13px] font-semibold text-white shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md md:w-[184px]';

// Kolom tabel di tablet ke atas: Jenis Sesi, Nama Subtest, Status, Info, Aksi.
// Status dan Info ikut mendapat bagian sisa ruang (fr) supaya jaraknya rata, tidak menumpuk setelah Nama Subtest.
const KOLOM =
    'md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(128px,1fr)_minmax(40px,0.5fr)_184px] md:items-center md:gap-4 lg:gap-6';

export default function Index({ title = 'Riwayat Pengerjaan', riwayat, filters }: IndexProps) {
    const [cari, setCari] = useState(filters.cari);
    const [selectedInfo, setSelectedInfo] = useState<ModalInfoData | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filterAktif = filters.jenis !== null || filters.status !== null;
    const adaPencarian = filters.cari !== '' || filterAktif;
    const kosong = riwayat.data.length === 0;

    // Satu request per pencarian: saat Enter / tombol cari, atau saat pilihan dropdown berubah (bukan setiap ketikan).
    const tampilkan = (params: { cari: string; jenis?: JenisSesi; status?: StatusFilter }) => {
        router.get(
            route('riwayat.index'),
            { cari: params.cari.trim() || undefined, jenis: params.jenis, status: params.status },
            { preserveState: true },
        );
    };

    const kirimPencarian = (e: FormEvent) => {
        e.preventDefault();
        tampilkan({ cari, jenis: filters.jenis ?? undefined, status: filters.status ?? undefined });
    };

    // null = "Semua": parameter dihapus sehingga filter itu tidak berlaku.
    const ubahJenis = (jenis: JenisSesi | null) => tampilkan({ cari, jenis: jenis ?? undefined, status: filters.status ?? undefined });
    const ubahStatus = (status: StatusFilter | null) => tampilkan({ cari, jenis: filters.jenis ?? undefined, status: status ?? undefined });

    const handleOpenInfo = async (pengerjaanId: string) => {
        setIsLoadingInfo(true);
        setIsModalOpen(true);
        try {
            const res = await fetch(route('riwayat.info', pengerjaanId));
            const data = await res.json();
            setSelectedInfo(data);
        } catch (error) {
            console.error('Gagal mengambil info:', error);
        } finally {
            setIsLoadingInfo(false);
        }
    };

    const gayaInfo = selectedInfo ? getCardStyle(selectedInfo.tipe, selectedInfo.mode_latihan) : null;

    return (
        <>
            <Head title={title} />

            {/* Sidebar dan header dari SiswaLayout (persistent), sama dengan halaman siswa lain. */}
            <div className="w-full space-y-4 font-poppins text-siswa-judul">
                {/* Banner: gaya sama dengan banner sapaan Beranda. */}
                <section data-tur="riwayat-judul" className="flex min-h-[83px] animate-muncul-halus flex-col justify-center rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-4 shadow-kartu">
                    <h1 className="text-[24px] font-semibold leading-tight text-white">Riwayat Pengerjaan</h1>
                    <p className="mt-1 text-[15px] leading-tight text-white">Akses riwayat pengerjaan mu disini!</p>
                </section>

                {kosong && !adaPencarian ? (
                    // UCS3 2a: belum pernah mengerjakan apa pun.
                    <div data-tur="riwayat-kosong" className="mx-auto flex min-h-[260px] max-w-[820px] animate-muncul-halus items-center justify-center rounded-kartu bg-siswa-umpan-salah px-6 text-center shadow-kartu [animation-delay:100ms] [animation-fill-mode:both] md:mt-16 md:min-h-[310px]">
                        <p className="text-lg font-semibold text-siswa-umpan-salah-teks md:text-xl">Belum ada soal yang dikerjakan!</p>
                    </div>
                ) : (
                    <>
                        {/* Filter dan pencarian */}
                        <section className="relative z-10 flex animate-muncul-halus flex-col gap-4 rounded-kartu bg-white px-[26px] py-5 shadow-kartu [animation-delay:80ms] [animation-fill-mode:both] md:flex-row md:items-end">
                            <div className="grid flex-1 gap-4 sm:grid-cols-2 md:max-w-[480px]">
                                <div data-tur="riwayat-filter-jenis">
                                    <Dropdown
                                        label="Jenis Sesi"
                                        nilai={filters.jenis}
                                        pilihan={PILIHAN_JENIS}
                                        onUbah={(kode) => ubahJenis(kode as JenisSesi | null)}
                                    />
                                </div>
                                <div data-tur="riwayat-filter-status">
                                    <Dropdown
                                        label="Status Pengerjaan"
                                        nilai={filters.status}
                                        pilihan={PILIHAN_STATUS}
                                        onUbah={(kode) => ubahStatus(kode as StatusFilter | null)}
                                    />
                                </div>
                            </div>

                            {/* Pencarian: dikirim lewat tombol Cari atau Enter. */}
                            <form data-tur="riwayat-cari" onSubmit={kirimPencarian} className="flex w-full md:ml-auto md:max-w-[380px]">
                                <input
                                    type="text"
                                    value={cari}
                                    onChange={(e) => setCari(e.target.value)}
                                    placeholder="Cari Jenis Sesi atau Nama Subtest"
                                    aria-label="Cari Jenis Sesi atau Nama Subtest"
                                    className="h-10 min-w-0 flex-1 rounded-l-[10px] border border-r-0 border-siswa-garis-halus bg-white px-3.5 text-sm text-siswa-judul transition placeholder:text-siswa-teks-redup focus:border-edvora-primary focus:ring-2 focus:ring-edvora-primary/20"
                                />
                                <button
                                    type="submit"
                                    className="flex h-10 shrink-0 items-center gap-2 rounded-r-[10px] bg-ujian-biru px-4 text-sm font-semibold text-white shadow-panel transition duration-200 hover:shadow-md hover:brightness-105 active:brightness-95"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden="true">
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="m20 20-3.5-3.5" />
                                    </svg>
                                    Cari
                                </button>
                            </form>
                        </section>

                        {/* Tabel riwayat */}
                        <section data-tur="riwayat-tabel" className="animate-muncul-halus overflow-hidden rounded-kartu bg-white shadow-kartu [animation-delay:160ms] [animation-fill-mode:both]">
                            <div className={`hidden border-b border-siswa-garis-halus bg-siswa-panel-fleksibel px-[26px] py-4 text-[15px] font-semibold text-siswa-judul-seksi ${KOLOM}`}>
                                {/* Kolom teks rata kiri seperti isinya; kolom label dan tombol rata tengah. */}
                                <span>Jenis Sesi</span>
                                <span>Nama Subtest</span>
                                <span className="text-center">Status</span>
                                <span className="text-center">Info</span>
                                <span className="text-center">Aksi</span>
                            </div>

                            {kosong ? (
                                // UCS3 2b: pencarian/filter tanpa hasil.
                                <div data-tur="riwayat-tanpa-hasil" className="animate-muncul-halus px-[26px] py-12 text-center">
                                    <p className="text-lg font-semibold text-siswa-umpan-salah-teks">Data tidak ditemukan!</p>
                                    <p className="mt-1 text-sm text-siswa-teks">Coba kata kunci atau filter lain.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-siswa-garis-halus">
                                    {riwayat.data.map((item, i) => (
                                        <li
                                            key={item.id}
                                            className={`grid animate-muncul-halus grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-[26px] py-4 text-[15px] text-siswa-judul-seksi transition-colors duration-200 [animation-fill-mode:both] even:bg-siswa-laman-awal hover:bg-siswa-panel-fleksibel md:py-3 ${KOLOM}`}
                                            style={{ animationDelay: `${200 + i * 40}ms` }}
                                        >
                                            <span className="font-medium">{item.jenis_pengerjaan}</span>
                                            <span className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                                                {item.nama_materi || '–'}
                                            </span>

                                            <span
                                                data-tur={i === 0 ? 'riwayat-status' : undefined}
                                                className={`justify-self-end rounded-full px-3 py-0.5 text-center text-xs font-semibold text-white shadow-panel md:w-[128px] md:justify-self-center ${
                                                    item.status === 'berjalan' ? 'bg-ujian-merah' : 'bg-ujian-hijau'
                                                }`}
                                            >
                                                {item.status === 'berjalan' ? 'Belum Selesai' : 'Selesai'}
                                            </span>

                                            <div className="col-span-2 flex items-center gap-3 md:contents">
                                                <button
                                                    type="button"
                                                    data-tur={i === 0 ? 'riwayat-info' : undefined}
                                                    onClick={() => handleOpenInfo(item.id)}
                                                    aria-label={`Informasi ${item.jenis_pengerjaan} ${item.nama_materi}`}
                                                    title="Informasi Pengerjaan"
                                                    className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full bg-edvora-primary text-white shadow-panel transition duration-200 hover:scale-110 hover:bg-edvora-primary-hover md:justify-self-center"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                                                        <circle cx="12" cy="6.5" r="1.8" />
                                                        <rect x="10.4" y="10" width="3.2" height="9" rx="1.2" />
                                                    </svg>
                                                </button>

                                                <div data-tur={i === 0 ? 'riwayat-aksi' : undefined} className="flex-1 md:flex-none">
                                                    {item.status === 'berjalan' ? (
                                                        item.try_out_id ? (
                                                            <Link href={route('tryout.kerjakan', item.try_out_id)} className={`${KELAS_AKSI} bg-ujian-hijau`}>
                                                                Lanjut Kerjakan
                                                            </Link>
                                                        ) : (
                                                            // Latihan yang belum selesai hanya fleksibel (UCS3 2c), dilanjutkan dari database.
                                                            <Link href={route('latihan.kerjakan', item.id)} className={`${KELAS_AKSI} bg-ujian-hijau`}>
                                                                Lanjut Kerjakan
                                                            </Link>
                                                        )
                                                    ) : (
                                                        <Link
                                                            href={item.try_out_id ? route('tryout.hasil', item.try_out_id) : route('riwayat.detail', item.id)}
                                                            className={`${KELAS_AKSI} bg-ujian-biru`}
                                                        >
                                                            Lihat Hasil Pengerjaan
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Pagination 10 per halaman; tautannya sudah membawa pencarian dan filter (withQueryString). */}
                        {riwayat.last_page > 1 && (
                            <nav data-tur="riwayat-halaman" aria-label="Halaman riwayat" className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                {riwayat.links.map((link, i) => {
                                    const label = i === 0 ? '← Sebelumnya' : i === riwayat.links.length - 1 ? 'Berikutnya →' : link.label;
                                    const gaya = `flex h-9 min-w-9 items-center justify-center rounded-[10px] px-3 text-sm font-semibold shadow-panel transition duration-200 ${
                                        link.active ? 'bg-ujian-biru text-white' : 'bg-white text-siswa-judul'
                                    }`;

                                    return link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            preserveState
                                            aria-current={link.active ? 'page' : undefined}
                                            className={`${gaya} ${link.active ? '' : 'hover:-translate-y-0.5 hover:bg-siswa-panel-fleksibel'}`}
                                        >
                                            {label}
                                        </Link>
                                    ) : (
                                        <span key={i} className={`${gaya} cursor-not-allowed opacity-50`}>
                                            {label}
                                        </span>
                                    );
                                })}
                            </nav>
                        )}
                    </>
                )}
            </div>

            <LiveTutorRiwayat adaData={!kosong} adaPencarian={adaPencarian} adaPagination={riwayat.last_page > 1} />

            {/* Modal Info Pengerjaan */}
            <Modal show={isModalOpen} maxWidth="lg" onClose={() => setIsModalOpen(false)} backdropClassName="bg-siswa-judul/30 backdrop-blur-[2px]" panelClassName="rounded-kartu">
                <div className="p-5 font-poppins md:p-6">
                    {isLoadingInfo ? (
                        <div className="py-6 text-center text-sm font-medium text-siswa-teks">Memuat informasi...</div>
                    ) : selectedInfo && gayaInfo ? (
                        <div className="flex flex-col items-start gap-4 md:flex-row md:gap-5">
                            {/* Ikon kiri: warna mengikuti jenis sesi */}
                            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${gayaInfo.bgIcon} ${gayaInfo.textIcon}`}>{gayaInfo.icon}</div>

                            <div className="flex-1 pt-1">
                                <h3 className="text-xl font-semibold leading-tight text-siswa-judul">{selectedInfo.judul}</h3>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className={KELAS_CHIP}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                                        </svg>
                                        {selectedInfo.total_dijawab} / {selectedInfo.jumlah_soal} soal terjawab
                                    </span>

                                    <span className={KELAS_CHIP}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        Mulai {selectedInfo.started_at}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </Modal>
        </>
    );
}

const KELAS_CHIP = 'flex items-center gap-1.5 rounded-full border border-siswa-garis-halus px-3 py-1.5 text-xs font-medium text-siswa-teks shadow-panel';

// Dropdown filter (Figma: Riwayat). Pilihan pertama selalu "Semua" (= tanpa filter).
function Dropdown({
    label,
    nilai,
    pilihan,
    onUbah,
}: {
    label: string;
    nilai: string | null;
    pilihan: Record<string, string>;
    onUbah: (kode: string | null) => void;
}) {
    return (
        <Listbox value={nilai} onChange={onUbah}>
            <div className="relative">
                <p className="mb-1.5 text-[15px] font-semibold text-siswa-judul">{label}</p>
                <ListboxButton className="group flex h-10 w-full items-center justify-between rounded-[10px] border border-siswa-garis-halus bg-white px-3.5 text-left text-sm transition hover:border-edvora-primary/60 focus:outline-none data-[open]:border-edvora-primary">
                    <span className={nilai ? 'text-siswa-judul' : 'text-siswa-teks-redup'}>{nilai ? pilihan[nilai] : 'Semua'}</span>
                    <svg className="h-4 w-4 text-siswa-judul transition-transform duration-200 group-data-[open]:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </ListboxButton>
                <ListboxOptions
                    transition
                    className="absolute z-20 mt-1 w-full origin-top rounded-[10px] border border-siswa-garis-halus bg-white py-1 text-sm shadow-kartu transition duration-150 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                    {[[null, 'Semua'] as const, ...Object.entries(pilihan)].map(([kode, teks]) => (
                        <ListboxOption
                            key={kode ?? 'semua'}
                            value={kode}
                            className="cursor-pointer px-3.5 py-2 text-siswa-teks data-[selected]:text-siswa-judul data-[focus]:bg-siswa-panel-fleksibel data-[selected]:font-semibold"
                        >
                            {teks}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah dari/ke halaman siswa lain.
Index.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
