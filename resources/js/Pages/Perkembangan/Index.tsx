import { Head, Link } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import Modal from '@/Components/Modal';
import { warnaSubtes } from '@/Components/Latihan/KartuSubtes';
import GrafikTryOut, { TitikTryOut } from '@/Components/Perkembangan/GrafikTryOut';
import { formatWaktuWib } from '@/lib/waktu';
import { LabelPenguasaan } from '@/types/latihan';

interface RemedialSubtes {
    kode: string | null;
    nama: string;
    jumlah: number; // > 0
}

interface TryOutSelesai {
    id: string; // try_out.id
    judul: string;
    selesaiPada: string; // ISO, waktu siswa selesai
    periodeSelesai: string; // ISO, akhir periode paket
    skor: number | null; // null = belum dinilai IRT
}

interface TopikHeatmap {
    id: string;
    nama: string;
    persen: number; // 0–100 (K14)
    label: LabelPenguasaan;
    nJendela: number; // isi jendela 0–20
}

interface SubtesHeatmap {
    kode: string | null;
    nama: string;
    persen: number; // rata-rata persen topik subtes ini
    topikList: TopikHeatmap[];
}

interface TopikRekomendasi {
    topikId: string;
    kodeSubtes: string | null;
    namaTopik: string;
    persen: number;
}

interface PerkembanganProps {
    totalSoalDikerjakan: number;
    remedial: { total: number; perSubtes: RemedialSubtes[] };
    tryOutList: TryOutSelesai[]; // urut waktu selesai
    penguasaan: SubtesHeatmap[]; // 7 subtes, urut subtes.urutan
    batasJendela: number; // 20
    rekomendasi: TopikRekomendasi[]; // maks 3
}

// ==========================================
// DATA DUMMY: hanya untuk melihat Grafik Try Out dengan banyak titik.
// Aktif bila URL diberi ?dummy=1, mis. /perkembangan?dummy=1. Tanpa itu, grafik memakai data server.
// Hapus blok ini (dan pemakaiannya di Perkembangan) setelah desain selesai dicek.
// ==========================================
const DUMMY_TRYOUT: TryOutSelesai[] = [
    { id: 'dummy-1', judul: 'Try Out EDVORA 1', selesaiPada: '2026-07-05T03:00:00Z', periodeSelesai: '2026-07-07T16:59:00Z', skor: 447.2 },
    { id: 'dummy-2', judul: 'Try Out EDVORA 2', selesaiPada: '2026-07-19T03:00:00Z', periodeSelesai: '2026-07-21T16:59:00Z', skor: 498.6 },
    { id: 'dummy-3', judul: 'Try Out EDVORA 3', selesaiPada: '2026-08-02T03:00:00Z', periodeSelesai: '2026-08-04T16:59:00Z', skor: 476.1 },
    { id: 'dummy-4', judul: 'Try Out EDVORA 4', selesaiPada: '2026-08-16T03:00:00Z', periodeSelesai: '2026-08-18T16:59:00Z', skor: 531.9 },
    { id: 'dummy-5', judul: 'Try Out EDVORA 5', selesaiPada: '2026-08-30T03:00:00Z', periodeSelesai: '2026-09-01T16:59:00Z', skor: 569.4 },
    { id: 'dummy-6', judul: 'Try Out EDVORA 6', selesaiPada: '2026-09-13T03:00:00Z', periodeSelesai: '2026-09-15T16:59:00Z', skor: 557.9 },
    { id: 'dummy-7', judul: 'Try Out EDVORA 7', selesaiPada: '2026-09-27T03:00:00Z', periodeSelesai: '2026-09-29T16:59:00Z', skor: 612.3 },
    // Belum dinilai: muncul di daftar "Menunggu nilai", tidak digambar di grafik.
    { id: 'dummy-8', judul: 'Try Out EDVORA 8', selesaiPada: '2026-10-03T03:00:00Z', periodeSelesai: '2026-10-05T05:00:00Z', skor: null },
];

function modeDummy(): boolean {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dummy') === '1';
}
// ========== akhir DATA DUMMY ==========

// Warna card heatmap per label (UCS4), memakai warna umpan balik yang sama dengan halaman pengerjaan.
const LABEL: Record<LabelPenguasaan, { teks: string; warna: string; titik: string }> = {
    belum_cukup_data: { teks: 'Belum Cukup Data', warna: 'bg-siswa-umpan-kosong', titik: 'bg-siswa-titik-terisi' },
    belum_dikuasai: { teks: 'Belum Dikuasai', warna: 'bg-siswa-umpan-salah', titik: 'bg-siswa-titik-salah' },
    berkembang: { teks: 'Berkembang', warna: 'bg-siswa-hint-latar', titik: 'bg-[#E9B10C]' },
    dikuasai: { teks: 'Dikuasai', warna: 'bg-siswa-umpan-benar', titik: 'bg-siswa-titik-benar' },
};

// Kartu putih seragam dengan Beranda: sudut, bayangan, dan jarak dalam yang sama.
const kartu = 'rounded-kartu bg-white px-[26px] py-5 shadow-kartu';
const judulKartu = 'text-[18px] font-semibold leading-tight text-siswa-judul-seksi';
const keterangan = 'mt-1 text-[13px] text-siswa-teks';
const tombolUtama =
    'inline-flex h-9 items-center justify-center rounded-[10px] bg-ujian-biru px-4 text-[13px] font-semibold text-white shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

// Tiap blok halaman muncul pelan bergiliran.
const ANIMASI = 'animate-muncul-halus [animation-fill-mode:both]';
const jeda = (ms: number) => ({ animationDelay: `${ms}ms` });

// Perkembangan Belajar (UCS4, RANCANGAN-perkembangan.md). Ukuran huruf, warna, dan kartu mengikuti Beranda.
export default function Perkembangan({ totalSoalDikerjakan, remedial, tryOutList: tryOutServer, penguasaan, batasJendela, rekomendasi }: PerkembanganProps) {
    // DATA DUMMY: ?dummy=1 mengganti daftar Try Out (grafik dan "Menunggu nilai") dengan contoh.
    const tryOutList = modeDummy() ? DUMMY_TRYOUT : tryOutServer;
    const [pilihRemedial, setPilihRemedial] = useState(false);

    return (
        <>
            <Head title="Perkembangan Belajar" />

            <div className="w-full space-y-4 font-poppins text-siswa-judul">
                {/* Banner: gaya sama dengan banner sapaan Beranda. */}
                <section
                    style={jeda(0)}
                    className={`${ANIMASI} flex min-h-[83px] flex-col justify-center rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-4 shadow-kartu`}
                >
                    <h1 className="text-[24px] font-semibold leading-tight text-white">Perkembangan Belajar</h1>
                    <p className="mt-1 text-[15px] leading-tight text-white">Pantau perkembanganmu dan raih skor UTBK terbaik!</p>
                </section>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <section style={jeda(60)} className={`${ANIMASI} ${kartu} flex items-center gap-4`}>
                        <IkonBulat warna="bg-siswa-ikon-latihan text-edvora-primary">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </IkonBulat>
                        <div>
                            <h2 className="text-[14px] font-medium text-siswa-teks">Total Soal Dikerjakan</h2>
                            <p className="text-[28px] font-semibold leading-tight text-siswa-judul">{totalSoalDikerjakan}</p>
                        </div>
                    </section>

                    <section style={jeda(120)} className={`${ANIMASI} ${kartu} flex flex-wrap items-center gap-4`}>
                        <IkonBulat warna="bg-siswa-umpan-salah text-siswa-umpan-salah-teks">
                            <path d="M4 4v5h5M20 20v-5h-5M5.5 15A7.5 7.5 0 0018.4 17M18.5 9A7.5 7.5 0 005.6 7" />
                        </IkonBulat>
                        {/* min-w-[140px]: lebar minimum ini yang membuat tombol turun baris di layar sempit (min-w-0 membuatnya menimpa teks). */}
                        <div className="min-w-[140px] flex-1">
                            <h2 className="text-[14px] font-medium text-siswa-teks">Antrean Remedial</h2>
                            <p className="text-[28px] font-semibold leading-tight text-siswa-judul">{remedial.total}</p>
                            {remedial.total === 0 && <p className="text-[12px] text-siswa-teks">Belum ada soal yang perlu diperbaiki</p>}
                        </div>
                        {/* Remedial dikerjakan per subtes (SDD 5.3.3), jadi siswa memilih subtesnya dulu. */}
                        <button
                            type="button"
                            disabled={remedial.total === 0}
                            onClick={() => setPilihRemedial(true)}
                            className={`${tombolUtama} w-full sm:w-auto disabled:cursor-not-allowed disabled:bg-siswa-ujian-redup disabled:bg-none disabled:shadow-none disabled:hover:translate-y-0`}
                        >
                            Latih Soal Yang Salah
                        </button>
                    </section>
                </div>

                <section style={jeda(180)} className={`${ANIMASI} ${kartu}`}>
                    <h2 className={judulKartu}>Grafik Try Out</h2>
                    <div className="mt-4">
                        <KontenGrafik tryOutList={tryOutList} />
                    </div>
                </section>

                {/* items-start: kartu Direkomendasikan setinggi isinya, tidak ikut memanjang setinggi heatmap. */}
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
                    <section style={jeda(240)} className={`${ANIMASI} ${kartu}`}>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 className={judulKartu}>Penguasaan Topik UTBK</h2>
                                <p className={keterangan}>Klik topik untuk langsung berlatih</p>
                            </div>

                            {/* Legenda: arti warna juga ditulis, tidak hanya lewat warna. */}
                            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-siswa-teks">
                                {Object.values(LABEL).map((label) => (
                                    <li key={label.teks} className="flex items-center gap-1.5">
                                        <span className={`h-2.5 w-2.5 rounded-full ${label.titik}`} aria-hidden="true" />
                                        {label.teks}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-5 space-y-5">
                            {penguasaan.map((subtes) => (
                                <div key={subtes.kode ?? subtes.nama}>
                                    <h3 className="flex items-center gap-2.5 text-[15px] font-semibold text-siswa-judul-seksi">
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${warnaSubtes(subtes.kode).lingkaran}`}
                                        >
                                            {subtes.kode}
                                        </span>
                                        <span className="min-w-0 flex-1">{subtes.nama}</span>
                                        <span className="shrink-0 rounded-full bg-siswa-panel-fleksibel px-2.5 py-0.5 text-[12px] font-semibold text-siswa-judul">
                                            {Math.round(subtes.persen)}%
                                        </span>
                                    </h3>
                                    {subtes.topikList.length === 0 ? (
                                        <p className="mt-2 text-[13px] text-siswa-teks">Belum ada topik untuk subtes ini.</p>
                                    ) : (
                                        <ul className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {subtes.topikList.map((topik) => (
                                                <li key={topik.id}>
                                                    <KartuTopik topik={topik} kodeSubtes={subtes.kode} batasJendela={batasJendela} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Menempel di samping heatmap saat halaman di-scroll (layar lebar). */}
                    <section style={jeda(300)} className={`${ANIMASI} ${kartu} lg:sticky lg:top-[76px]`}>
                        <h2 className={judulKartu}>Direkomendasikan</h2>
                        <p className={keterangan}>Topik dengan penguasaan terendah</p>

                        {rekomendasi.length > 0 ? (
                            <ul className="mt-4 space-y-3">
                                {rekomendasi.map((topik) => (
                                    <li
                                        key={topik.topikId}
                                        className="rounded-subtes border border-siswa-garis-halus px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-kartu"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${warnaSubtes(topik.kodeSubtes).lingkaran}`}
                                            >
                                                {topik.kodeSubtes}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[15px] font-semibold leading-tight text-siswa-judul">{topik.namaTopik}</p>
                                                <p className="mt-0.5 text-[12px] text-siswa-teks">Penguasaan {Math.round(topik.persen)}%</p>
                                            </div>
                                        </div>
                                        {/* Link hanya bila subtes punya kode, karena rute latihan.mode mengikat subtes lewat kode. */}
                                        {topik.kodeSubtes && (
                                            <Link href={route('latihan.mode', { subtes: topik.kodeSubtes, topik: topik.topikId })} className={`${tombolUtama} mt-3 w-full`}>
                                                Latih Topik Ini
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-4 text-[13px] text-siswa-teks">Selesaikan latihan mode fleksibel untuk mendapatkan rekomendasi topik.</p>
                        )}
                    </section>
                </div>
            </div>

            <Modal
                show={pilihRemedial}
                maxWidth="md"
                onClose={() => setPilihRemedial(false)}
                backdropClassName="bg-siswa-judul/30 backdrop-blur-[2px]"
                panelClassName="rounded-[24px]"
            >
                <div className="p-6 font-poppins text-siswa-judul">
                    <h3 className="text-[18px] font-semibold text-siswa-judul-seksi">Pilih subtes</h3>
                    <ul className="mt-3 divide-y divide-siswa-garis-halus">
                        {remedial.perSubtes.map((subtes) => {
                            const isi = (
                                <>
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${warnaSubtes(subtes.kode).lingkaran}`}
                                        >
                                            {subtes.kode}
                                        </span>
                                        <span className="truncate text-[14px] font-medium">{subtes.nama}</span>
                                    </span>
                                    <span className="shrink-0 rounded-full bg-siswa-umpan-salah px-2.5 py-0.5 text-[12px] font-semibold text-siswa-umpan-salah-teks">
                                        {subtes.jumlah} soal
                                    </span>
                                </>
                            );

                            // Link hanya bila subtes punya kode, karena rute latihan.mode mengikat subtes lewat kode.
                            return (
                                <li key={subtes.kode ?? subtes.nama}>
                                    {subtes.kode ? (
                                        <Link
                                            href={route('latihan.mode', { subtes: subtes.kode, tab: 'remedial' })}
                                            className="-mx-2 flex items-center justify-between gap-3 rounded-[10px] px-2 py-3 transition duration-200 hover:bg-siswa-panel-fleksibel"
                                        >
                                            {isi}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3 py-3">{isi}</div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setPilihRemedial(false)}
                            className="h-9 rounded-[10px] border border-siswa-garis-halus bg-white px-4 text-[13px] font-semibold text-siswa-judul transition duration-200 hover:bg-siswa-panel-fleksibel"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// Ikon garis di dalam lingkaran berwarna untuk kartu angka.
function IkonBulat({ warna, children }: { warna: string; children: ReactNode }) {
    return (
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${warna}`}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {children}
            </svg>
        </span>
    );
}

// Isi card Grafik Try Out (spec 6.3). Nomor "TO n" mengikuti urutan semua Try Out siswa, jadi nomor di grafik
// dan di daftar Menunggu nilai selalu sama. Paket yang belum dinilai tidak digambar sebagai titik 0.
function KontenGrafik({ tryOutList }: { tryOutList: TryOutSelesai[] }) {
    if (tryOutList.length === 0) {
        return (
            <p className="text-[13px] text-siswa-teks">
                Kamu belum mengerjakan Try Out.{' '}
                <Link href={route('tryout.index')} className="font-semibold text-edvora-primary hover:underline">
                    Lihat Try Out
                </Link>
            </p>
        );
    }

    const bernomor = tryOutList.map((tryOut, i) => ({ ...tryOut, nomor: i + 1 }));
    const titik: TitikTryOut[] = bernomor.flatMap((t) =>
        t.skor === null ? [] : [{ nomor: t.nomor, judul: t.judul, selesaiPada: t.selesaiPada, skor: t.skor }],
    );
    const menunggu = bernomor.filter((t) => t.skor === null);

    return (
        <>
            {titik.length > 0 ? (
                <GrafikTryOut titik={titik} />
            ) : (
                <p className="text-[13px] text-siswa-teks">Belum ada skor Try Out. Skor muncul setelah periode Try Out berakhir dan dinilai.</p>
            )}

            {menunggu.length > 0 && (
                <div className="mt-4 rounded-subtes bg-siswa-laman-awal px-4 py-3">
                    <h3 className="text-[13px] font-semibold text-siswa-judul-seksi">Menunggu nilai</h3>
                    <ul className="mt-1 space-y-1 text-[13px] text-siswa-teks">
                        {menunggu.map((t) => (
                            <li key={t.id}>
                                TO {t.nomor} · {t.judul} · periode berakhir {formatWaktuWib(t.periodeSelesai)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}

// Satu card heatmap. Warna dari label; topik dengan jendela < 20 jawaban tampil 0% dengan ikon info (UCS4 2a).
function KartuTopik({ topik, kodeSubtes, batasJendela }: { topik: TopikHeatmap; kodeSubtes: string | null; batasJendela: number }) {
    const belumCukup = topik.label === 'belum_cukup_data';
    const info = `Belum dapat ditentukan, kerjakan minimal ${batasJendela} soal`;
    const kelas = `block h-full rounded-subtes border border-black/[0.04] px-3.5 py-3 ${LABEL[topik.label].warna}`;
    const isi = (
        <>
            <span className="block text-[13px] font-medium leading-snug text-siswa-judul-seksi">{topik.nama}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[20px] font-bold leading-tight text-siswa-judul">
                {Math.round(topik.persen)}%
                {belumCukup && (
                    <span title={info} aria-label={info} className="text-[12px] font-normal text-siswa-teks">
                        ⓘ
                    </span>
                )}
            </span>
            {belumCukup && (
                <span className="mt-0.5 block text-[11px] text-siswa-teks">
                    {topik.nJendela}/{batasJendela} soal
                </span>
            )}
            <span className="sr-only">{LABEL[topik.label].teks}</span>
        </>
    );

    // Link hanya bila subtes punya kode, karena rute latihan.mode mengikat subtes lewat kode.
    return kodeSubtes ? (
        <Link
            href={route('latihan.mode', { subtes: kodeSubtes, topik: topik.id })}
            className={`${kelas} transition duration-200 hover:-translate-y-0.5 hover:shadow-panel hover:brightness-[0.98]`}
        >
            {isi}
        </Link>
    ) : (
        <div className={kelas}>{isi}</div>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah ke halaman siswa lain.
Perkembangan.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
