import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import JudulHalaman from '@/Components/Editor/JudulHalaman';
import ModalUpload from '@/Components/Editor/ModalUpload';
import PopupSukses from '@/Components/Editor/PopupSukses';
import ToastGagal from '@/Components/Editor/ToastGagal';
import EditorLayout from '@/Components/Layouts/EditorLayout';
import TurFitur, { LangkahTur } from '@/Components/Tur/TurFitur';
import { LABEL_STATUS, LABEL_TINGKAT, LABEL_TIPE } from '@/lib/labelSoal';
import { BarisSoal, Halaman, HasilSimpanUpload, PilihanTopik, StatusSoal, SubtesEditor } from '@/types/editor';

interface Filter {
    topik: string | null;
    status: StatusSoal | null;
    cari: string;
}

interface BankSoalProps {
    subtes: SubtesEditor;
    topikList: PilihanTopik[];
    filter: Filter;
    soalList: Halaman<BarisSoal>;
    adaTemplate: boolean;
    maksBarisUpload: number;
}

const WARNA_STATUS: Record<StatusSoal, string> = {
    published: 'text-siswa-umpan-benar-teks',
    draft: 'text-siswa-teks',
    review: 'text-siswa-ubin-remedial',
};

// Tur perkenalan Bank Soal, muncul sekali saat editor pertama kali membuka halaman ini.
// Kuncinya tidak memuat kode subtes: tur dijelaskan sekali saja, bukan diulang di tiap subtes.
const TUR_KUNCI = 'editor-bank-soal';

// Tiga langkah pertama selalu ada, karena elemennya tidak bergantung pada isi tabel.
const LANGKAH_UMUM: LangkahTur[] = [
    {
        target: 'upload',
        posisi: 'bawah',
        teks: (
            <>
                Gunakan fitur ini untuk <strong className="font-semibold">menambahkan banyak soal</strong> sekaligus melalui file
                Excel (.xlsx) sesuai template yang tersedia
            </>
        ),
    },
    {
        target: 'tambah',
        posisi: 'bawah',
        teks: (
            <>
                Klik di sini untuk <strong className="font-semibold">menambahkan soal baru secara manual</strong> melalui formulir
            </>
        ),
    },
    {
        target: 'tabel',
        posisi: 'atas',
        teks: (
            <>
                Tabel ini menampilkan{' '}
                <strong className="font-semibold">kode, soal, topik, tipe soal, level kesulitan, hingga status publikasinya</strong>
            </>
        ),
    },
];

// Dua langkah terakhir menyorot tombol di baris pertama tabel, jadi hanya dipakai kalau ada isinya.
const LANGKAH_BARIS: LangkahTur[] = [
    {
        target: 'edit',
        posisi: 'bawah',
        teks: (
            <>
                Klik ikon <strong className="font-semibold">edit</strong> untuk mengubah informasi, isi, atau pembahasan soal
            </>
        ),
    },
    {
        target: 'terbit',
        posisi: 'bawah',
        teks: (
            <>
                <strong className="font-semibold">Terbitkan soal</strong> agar dapat digunakan siswa dalam sesi latihan
            </>
        ),
    },
];

// Bank soal satu subtes (desain "dashboard _ bank soal"): filter, tabel soal, upload Excel, dan tombol tambah soal.
export default function BankSoal({ subtes, topikList, filter, soalList, adaTemplate, maksBarisUpload }: BankSoalProps) {
    const { flash } = usePage();
    const [cari, setCari] = useState(filter.cari);
    const [uploadTerbuka, setUploadTerbuka] = useState(false);
    const [sukses, setSukses] = useState<{ pesan: string; lihatDraft: boolean } | null>(null);
    const [gagal, setGagal] = useState<string[]>([]);

    // Pesan sekali tampil dari server (Inertia::flash), mis. setelah tambah/edit soal atau ubah status.
    useEffect(() => {
        if (typeof flash.sukses === 'string') {
            setSukses({ pesan: flash.sukses, lihatDraft: false });
        }
    }, [flash]);

    // Tabel yang kosong tidak punya tombol edit/terbitkan, jadi dua langkah terakhir ikut dilewati
    // dan penghitung langkah tetap jujur ("1 / 3", bukan "1 / 5" dengan dua langkah yang menyorot ruang kosong).
    const adaBaris = soalList.data.length > 0;
    const langkahTur = useMemo(() => (adaBaris ? [...LANGKAH_UMUM, ...LANGKAH_BARIS] : LANGKAH_UMUM), [adaBaris]);

    const terapkan = (ubah: Partial<Filter>) => {
        const baru = { ...filter, cari, ...ubah };
        // Filter kosong tidak ditulis di URL.
        const query = Object.fromEntries(Object.entries(baru).filter(([, nilai]) => nilai !== null && nilai !== ''));

        router.get(route('editor.soal.index', subtes.kode), query, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Pencarian dikirim setelah berhenti mengetik sebentar.
    useEffect(() => {
        if (cari === filter.cari) {
            return;
        }

        const waktu = window.setTimeout(() => terapkan({ cari }), 400);

        return () => window.clearTimeout(waktu);
    }, [cari]);

    const ubahStatus = (soal: BarisSoal) => {
        const status = soal.status === 'published' ? 'draft' : 'published';
        const tanya =
            status === 'published'
                ? `Publish soal ${soal.kode}? Soal akan tampil di latihan siswa.`
                : `Kembalikan soal ${soal.kode} ke Draft? Soal tidak tampil lagi di latihan siswa.`;

        if (window.confirm(tanya)) {
            router.patch(route('editor.soal.status', soal.kode), { status }, { preserveScroll: true, onError: () => setGagal(['Perubahan Belum Berhasil']) });
        }
    };

    const uploadBerhasil = (hasil: HasilSimpanUpload) => {
        setUploadTerbuka(false);
        setSukses({
            pesan:
                `${hasil.baru} soal berhasil ditambahkan sebagai Draft` +
                (hasil.diperbarui > 0 ? `, ${hasil.diperbarui} soal diperbarui` : '') +
                (hasil.topikBaru > 0 ? `, ${hasil.topikBaru} topik baru` : ''),
            lihatDraft: hasil.baru > 0,
        });
        router.reload({ only: ['soalList', 'topikList'] });
    };

    const adaFilter = filter.topik !== null || filter.status !== null || filter.cari !== '';

    return (
        <EditorLayout breadcrumb={['Bank Soal', subtes.nama]} subtesAktif={subtes.kode}>
            <Head title={`Bank Soal ${subtes.kode}`} />
            <ToastGagal pesan={gagal} onHilang={() => setGagal([])} />

            <JudulHalaman
                atas={`Bank Soal . ${subtes.kode}`}
                judul={subtes.nama}
                keterangan={`Kelola semua soal ${subtes.nama.toLowerCase()}`}
                aksi={
                    <>
                        <button
                            type="button"
                            data-tur="upload"
                            onClick={() => setUploadTerbuka(true)}
                            className="inline-flex items-center gap-2 rounded-lg bg-ujian-biru px-4 py-2 text-sm font-medium text-white shadow-panel transition hover:opacity-90"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                                <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />
                            </svg>
                            Upload Bank Soal
                        </button>
                        <Link
                            href={route('editor.soal.tambah', subtes.kode)}
                            data-tur="tambah"
                            className="inline-flex items-center gap-2 rounded-lg bg-ujian-biru px-4 py-2 text-sm font-medium text-white shadow-panel transition hover:opacity-90"
                        >
                            <span className="text-lg leading-none">+</span> Tambah Soal
                        </Link>
                    </>
                }
            />

            <div className="flex flex-wrap items-end gap-4 rounded-kartu bg-white px-5 py-4 shadow-kartu">
                <label className="w-full sm:w-56">
                    <span className="text-sm font-semibold text-siswa-judul">Topik</span>
                    <select
                        value={filter.topik ?? ''}
                        onChange={(e) => terapkan({ topik: e.target.value || null })}
                        className="mt-1 w-full rounded-lg border-siswa-garis-halus text-sm"
                    >
                        <option value="">Semua topik</option>
                        {topikList.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.nama}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="w-full sm:w-56">
                    <span className="text-sm font-semibold text-siswa-judul">Status</span>
                    <select
                        value={filter.status ?? ''}
                        onChange={(e) => terapkan({ status: (e.target.value || null) as StatusSoal | null })}
                        className="mt-1 w-full rounded-lg border-siswa-garis-halus text-sm"
                    >
                        <option value="">Semua status</option>
                        {(Object.keys(LABEL_STATUS) as StatusSoal[]).map((s) => (
                            <option key={s} value={s}>
                                {LABEL_STATUS[s]}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="w-full sm:ml-auto sm:w-60">
                    <span className="sr-only">Cari soal</span>
                    <input
                        type="search"
                        value={cari}
                        onChange={(e) => setCari(e.target.value)}
                        placeholder="Cari kode atau teks soal"
                        className="w-full rounded-lg border-siswa-garis-halus text-sm"
                    />
                </label>
            </div>

            <div data-tur="tabel" className="mt-5 overflow-x-auto rounded-kartu bg-white shadow-kartu">
                <table className="w-full min-w-[820px] text-left text-sm text-siswa-judul">
                    <thead className="bg-surface-container text-base">
                        <tr>
                            <th className="px-5 py-4 font-semibold">Kode</th>
                            <th className="px-3 py-4 font-semibold">Soal</th>
                            <th className="px-3 py-4 font-semibold">Topik</th>
                            <th className="px-3 py-4 font-semibold">Tipe</th>
                            <th className="px-3 py-4 font-semibold">Level</th>
                            <th className="px-3 py-4 font-semibold">Status</th>
                            <th className="px-3 py-4 text-center font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Tur menyorot tombol di baris pertama saja; baris lain tidak diberi penanda
                            supaya data-tur tetap unik di halaman ini. */}
                        {soalList.data.map((soal, baris) => (
                            <tr key={soal.kode} className="border-t border-siswa-garis-halus">
                                <td className="whitespace-nowrap px-5 py-3 font-medium">{soal.kode}</td>
                                <td className="max-w-[260px] truncate px-3 py-3" title={soal.teks}>
                                    {soal.teks}
                                </td>
                                <td className="px-3 py-3">{soal.topik}</td>
                                <td className="whitespace-nowrap px-3 py-3">{LABEL_TIPE[soal.tipe]}</td>
                                <td className="px-3 py-3">{LABEL_TINGKAT[soal.tingkat]}</td>
                                <td className={`px-3 py-3 font-medium ${WARNA_STATUS[soal.status]}`}>{LABEL_STATUS[soal.status]}</td>
                                <td className="px-3 py-3">
                                    <div className="flex justify-center gap-3">
                                        <Link
                                            href={route('editor.soal.edit', soal.kode)}
                                            data-tur={baris === 0 ? 'edit' : undefined}
                                            title="Edit soal"
                                            aria-label={`Edit soal ${soal.kode}`}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-edvora-primary text-white transition hover:bg-edvora-primary-hover"
                                        >
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <path d="M15.2 5.2l3.6 3.6L8.6 19H5v-3.6L15.2 5.2zM16.6 3.8l1.4-1.4a1.5 1.5 0 012.1 0l1.5 1.5a1.5 1.5 0 010 2.1l-1.4 1.4-3.6-3.6z" />
                                            </svg>
                                        </Link>
                                        {/* Ikon kedua di desain: dipakai untuk publish / kembalikan ke Draft. */}
                                        <button
                                            type="button"
                                            data-tur={baris === 0 ? 'terbit' : undefined}
                                            onClick={() => ubahStatus(soal)}
                                            title={soal.status === 'published' ? 'Kembalikan ke Draft' : 'Publish'}
                                            aria-label={soal.status === 'published' ? `Kembalikan soal ${soal.kode} ke Draft` : `Publish soal ${soal.kode}`}
                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-white transition ${
                                                soal.status === 'published' ? 'bg-[#6F6F6F] hover:bg-[#5a5a5a]' : 'bg-siswa-titik-benar hover:opacity-90'
                                            }`}
                                        >
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                {soal.status === 'published' ? <path d="M4 7h11a5 5 0 010 10H9M8 3L4 7l4 4" /> : <path d="M5 12.5l4.5 4.5L19 7.5" />}
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {soalList.data.length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-siswa-teks">
                        {adaFilter ? 'Tidak ada soal yang cocok dengan filter ini.' : 'Belum ada soal di subtes ini. Upload file Excel atau tambah soal manual.'}
                    </p>
                )}
            </div>

            <Paginasi halaman={soalList} />

            <ModalUpload
                show={uploadTerbuka}
                subtes={subtes}
                adaTemplate={adaTemplate}
                maksBaris={maksBarisUpload}
                onTutup={() => setUploadTerbuka(false)}
                onBerhasil={uploadBerhasil}
                onGagal={setGagal}
            />

            <PopupSukses
                pesan={sukses?.pesan ?? null}
                tombol={sukses?.lihatDraft ? 'Lihat Draft' : 'Oke'}
                onTombol={
                    sukses?.lihatDraft
                        ? () => {
                              setSukses(null);
                              setCari('');
                              terapkan({ status: 'draft', topik: null, cari: '' });
                          }
                        : undefined
                }
                onTutup={() => setSukses(null)}
            />

            {/* Tur perkenalan, jalan sekali per browser; penandanya disimpan di localStorage (lihat lib/turFitur.ts).
                Ditahan selama pop-up sukses masih tampil supaya dua lapis gelap tidak bertumpuk. */}
            <TurFitur kunci={TUR_KUNCI} langkah={langkahTur} aktif={sukses === null} />
        </EditorLayout>
    );
}

function Paginasi({ halaman }: { halaman: Halaman<BarisSoal> }) {
    if (halaman.last_page <= 1) {
        return halaman.total > 0 ? <p className="mt-3 text-sm text-siswa-teks">{halaman.total} soal</p> : null;
    }

    return (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-siswa-teks">
                {halaman.from}–{halaman.to} dari {halaman.total} soal
            </p>
            <nav className="flex flex-wrap gap-1" aria-label="Halaman">
                {halaman.links.map((link, i) => {
                    // Label bawaan Laravel memakai entitas HTML: "&laquo; Previous", "Next &raquo;".
                    const label = link.label.replace('&laquo;', '‹').replace('&raquo;', '›').replace('Previous', '').replace('Next', '').trim();

                    return link.url ? (
                        <Link
                            key={i}
                            href={link.url}
                            preserveScroll
                            preserveState
                            aria-current={link.active ? 'page' : undefined}
                            className={`min-w-9 rounded-lg px-3 py-1.5 text-center ${link.active ? 'bg-edvora-primary text-white' : 'bg-white text-siswa-judul hover:bg-siswa-badge-subtes'}`}
                        >
                            {label}
                        </Link>
                    ) : (
                        <span key={i} className="min-w-9 rounded-lg px-3 py-1.5 text-center text-siswa-teks-redup">
                            {label}
                        </span>
                    );
                })}
            </nav>
        </div>
    );
}
