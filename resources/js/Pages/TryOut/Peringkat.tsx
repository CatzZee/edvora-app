import { ReactNode, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import KartuStat from '@/Components/Beranda/KartuStat';
import TabMode from '@/Components/Latihan/TabMode';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import InfoTooltip from '@/Components/Shared/InfoTooltip';
import PeringkatOnboarding from '@/Components/TryOut/PeringkatOnboarding';
import { BarisPeringkat, JenisPeringkat } from '@/types/tryout';

interface PeringkatProps {
    paket: { id: string; judul: string };
    skorSaya: number;
    jenis: JenisPeringkat;
    tujuanSaya: { universitas: string; prodi: string } | null; // khusus: tujuan siswa yang login
    podium: BarisPeringkat[]; // peringkat 1–3, hanya di halaman 1
    daftar: BarisPeringkat[];
    posisiSaya: { peringkat: number; totalPeserta: number } | null;
    halaman: { sekarang: number; terakhir: number };
}

const angka = (nilai: number) => nilai.toLocaleString('id-ID');

// ==========================================
// DATA DUMMY: hanya untuk melihat desain penuh (podium, daftar panjang, pagination).
// Aktif bila URL diberi ?dummy=1, mis. /tryout/{id}/peringkat?dummy=1. Tanpa itu, halaman memakai data server.
// Hapus blok ini (dan pemakaiannya di Peringkat) setelah desain selesai dicek.
// ==========================================
const baris = (peringkat: number, nama: string, universitas: string | null, prodi: string | null, skor: number, saya = false): BarisPeringkat => ({
    peringkat,
    nama,
    universitas,
    prodi,
    skor,
    saya,
});

const DUMMY: Record<JenisPeringkat, Pick<PeringkatProps, 'tujuanSaya' | 'podium' | 'daftar' | 'posisiSaya' | 'halaman'>> = {
    umum: {
        tujuanSaya: null,
        podium: [
            baris(1, 'Siswa Demo Dua', 'Universitas Negeri Surabaya', 'S1 Teknik Informatika', 581.2),
            baris(2, 'Siswa Demo Tiga', 'Universitas Gadjah Mada', 'S1 Kedokteran', 569.4),
            baris(3, 'Siswa Demo Empat', 'Universitas Indonesia', 'S1 Akuntansi', 562.8),
        ],
        daftar: [
            baris(4, 'Siswa Demo Lima', 'Universitas Negeri Malang', 'S1 Teknik Mesin', 559.3),
            baris(5, 'Siswa Demo Enam', 'Universitas Brawijaya', 'S1 Akuntansi', 558.1),
            baris(6, 'Siswa Demo', 'Universitas Negeri Malang', 'S1 Akuntansi', 557.9, true),
            baris(7, 'Siswa Demo Tujuh', 'Universitas Airlangga', 'S1 Gizi', 551.6),
            baris(8, 'Siswa Demo Delapan', 'Institut Teknologi Sepuluh Nopember', 'S1 Teknik Informatika', 547.0),
            baris(9, 'Siswa Demo Sembilan', null, null, 544.9),
            baris(10, 'Siswa Demo Sepuluh', 'Universitas Padjadjaran', 'S1 Psikologi', 540.2),
        ],
        posisiSaya: { peringkat: 6, totalPeserta: 48 },
        halaman: { sekarang: 1, terakhir: 5 },
    },
    khusus: {
        tujuanSaya: { universitas: 'Universitas Negeri Malang', prodi: 'S1 Akuntansi' },
        podium: [
            baris(1, 'Siswa Demo Lima', 'Universitas Negeri Malang', 'S1 Akuntansi', 559.3),
            baris(2, 'Siswa Demo', 'Universitas Negeri Malang', 'S1 Akuntansi', 557.9, true),
            baris(3, 'Siswa Demo Sebelas', 'Universitas Negeri Malang', 'S1 Akuntansi', 536.4),
        ],
        daftar: [
            baris(4, 'Siswa Demo Dua Belas', 'Universitas Negeri Malang', 'S1 Akuntansi', 529.8),
            baris(5, 'Siswa Demo Tiga Belas', 'Universitas Negeri Malang', 'S1 Akuntansi', 521.5),
            baris(6, 'Siswa Demo Empat Belas', 'Universitas Negeri Malang', 'S1 Akuntansi', 517.1),
        ],
        posisiSaya: { peringkat: 2, totalPeserta: 6 },
        halaman: { sekarang: 1, terakhir: 1 },
    },
};

function modeDummy(): boolean {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dummy') === '1';
}
// ========== akhir DATA DUMMY ==========

// Penanda "(Kamu)" di samping nama siswa yang login.
function TandaKamu() {
    return <span className="ml-1 text-[12px] font-medium text-edvora-primary">(Kamu)</span>;
}

// Lencana bulat di kartu podium: emas, perak, perunggu. Juara 1 sedikit lebih besar.
const WARNA_LENCANA: Record<number, string> = { 1: 'bg-podium-emas', 2: 'bg-podium-perak', 3: 'bg-podium-perunggu' };

function LencanaPodium({ peringkat }: { peringkat: number }) {
    const besar = peringkat === 1 ? 'h-12 w-12 text-[21px]' : 'h-10 w-10 text-[18px]';
    return (
        <span
            className={`flex items-center justify-center rounded-full font-bold text-white shadow-panel ${besar} ${WARNA_LENCANA[peringkat] ?? 'bg-ujian-biru'}`}
            aria-label={`Peringkat ${peringkat}`}
        >
            {peringkat}
        </span>
    );
}

// Tujuan universitas dan prodi sebagai pil kecil; disembunyikan di peringkat khusus (P11).
function PilTujuan({ teks }: { teks: string | null }) {
    return (
        <span className="max-w-full truncate rounded-full border border-edvora-primary/25 bg-siswa-panel-fleksibel px-2.5 py-0.5 text-[11px] font-medium text-siswa-teks">
            {teks ?? '-'}
        </span>
    );
}

// Urutan tampil podium di layar lebar: 2 – 1 – 3, dengan kartu peringkat 1 paling tinggi.
// Tinggi berbeda untuk umum (ada pil tujuan) dan khusus (tanpa pil), supaya isi selalu pas di kartu.
const GAYA_PODIUM = [
    { urutan: 'sm:order-2', umum: 'sm:min-h-[228px]', khusus: 'sm:min-h-[172px]' },
    { urutan: 'sm:order-1', umum: 'sm:min-h-[204px]', khusus: 'sm:min-h-[150px]' },
    { urutan: 'sm:order-3', umum: 'sm:min-h-[188px]', khusus: 'sm:min-h-[136px]' },
];

function KartuPodium({ baris, posisi, khusus }: { baris: BarisPeringkat; posisi: number; khusus: boolean }) {
    const gaya = GAYA_PODIUM[posisi] ?? GAYA_PODIUM[2];

    return (
        <div
            className={`flex animate-muncul-halus flex-col items-center justify-center rounded-kartu bg-white px-4 py-5 text-center shadow-kartu transition duration-200 [animation-fill-mode:both] hover:-translate-y-1 hover:shadow-xl ${gaya.urutan} ${
                khusus ? gaya.khusus : gaya.umum
            } ${
                baris.saya ? 'ring-2 ring-edvora-primary/40' : ''
            }`}
            style={{ animationDelay: `${120 + posisi * 90}ms` }}
        >
            <LencanaPodium peringkat={baris.peringkat} />
            <p className="mt-2 text-[14px] font-semibold text-siswa-teks">
                {baris.nama}
                {baris.saya && <TandaKamu />}
            </p>
            <p className="mt-0.5 text-[24px] font-bold leading-tight text-siswa-judul">{angka(baris.skor)}</p>
            {!khusus && (
                <div className="mt-3 flex w-full flex-col items-center gap-1.5">
                    <PilTujuan teks={baris.universitas} />
                    <PilTujuan teks={baris.prodi} />
                </div>
            )}
        </div>
    );
}

// Satu baris tabel peringkat; universitas dan prodi disembunyikan di peringkat khusus (P11).
function Baris({ baris, khusus, urutan }: { baris: BarisPeringkat; khusus: boolean; urutan: number }) {
    return (
        <tr
            className={`animate-muncul-halus transition-colors duration-200 [animation-fill-mode:both] ${
                baris.saya ? 'bg-siswa-panel-fleksibel font-semibold' : 'even:bg-siswa-laman-awal hover:bg-siswa-panel-fleksibel/70'
            }`}
            style={{ animationDelay: `${350 + urutan * 45}ms` }}
        >
            {/* Garis biru di kiri menandai baris milik siswa yang login. */}
            <td className={`whitespace-nowrap py-3 pl-5 pr-3 ${baris.saya ? 'border-l-4 border-edvora-primary pl-4' : ''}`}>
                <span className="inline-flex min-w-[46px] items-center justify-center rounded-full bg-siswa-panel-fleksibel px-2.5 py-0.5 text-[13px] font-bold text-siswa-judul">
                    #{baris.peringkat}
                </span>
            </td>
            <td className="px-3 py-3 font-medium text-siswa-judul-seksi">
                {baris.nama}
                {baris.saya && <TandaKamu />}
            </td>
            {!khusus && <td className="px-3 py-3 text-siswa-teks">{baris.universitas ?? '-'}</td>}
            {!khusus && <td className="px-3 py-3 text-siswa-teks">{baris.prodi ?? '-'}</td>}
            <td className="whitespace-nowrap py-3 pl-3 pr-5 text-right text-[15px] font-bold text-siswa-judul">{angka(baris.skor)}</td>
        </tr>
    );
}

const kelasTombolHalaman =
    'flex h-9 items-center rounded-[10px] bg-white px-4 text-sm font-semibold text-siswa-judul shadow-panel transition duration-200 hover:-translate-y-0.5 hover:bg-siswa-panel-fleksibel';

// Peringkat Try Out (RANCANGAN-peringkat-pembahasan-tryout.md 5.4), mengikuti Figma node 1234:2372.
export default function Peringkat(propsServer: PeringkatProps) {
    const tabRef = useRef<HTMLDivElement>(null);
    const podiumRef = useRef<HTMLDivElement>(null);
    const daftarRef = useRef<HTMLElement>(null);

    // DATA DUMMY: ?dummy=1 mengganti data peringkat dengan contoh; paket tetap dari server supaya tautan benar.
    const dummy = modeDummy();
    const { paket, skorSaya, jenis, tujuanSaya, podium, daftar, posisiSaya, halaman } = dummy
        ? { ...propsServer, skorSaya: 557.9, ...DUMMY[propsServer.jenis] }
        : propsServer;

    const khusus = jenis === 'khusus';
    // dummy ikut dibawa saat pindah tab/halaman, supaya pratinjau tidak hilang.
    const keHalaman = (j: JenisPeringkat, nomor = 1) =>
        route('tryout.peringkat', { tryOut: paket.id, jenis: j, halaman: nomor, ...(dummy ? { dummy: 1 } : {}) });
    const kolom = khusus
        ? ['Peringkat', 'Nama Pengguna', 'Skor']
        : ['Peringkat', 'Nama Pengguna', 'Tujuan Universitas', 'Program Studi Tujuan', 'Skor'];

    return (
        <>
            <Head title={`Peringkat ${paket.judul} - EDVORA`} />

            {/* Ukuran huruf, kartu, dan jarak mengikuti Beranda dan Hasil Try Out. */}
            <div className="w-full space-y-4 font-poppins text-siswa-judul">
                {/* Banner: gaya sama dengan banner sapaan Beranda; Skor IRT memakai kotak angka yang sama dengan Level/Poin. */}
                <section className="flex min-h-[83px] animate-muncul-halus flex-wrap items-center justify-between gap-4 rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-4 shadow-kartu">
                    <div className="min-w-0">
                        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/85">Riwayat Hasil Pengerjaan Try Out</p>
                        <h1 className="mt-0.5 text-[24px] font-semibold leading-tight text-white">{paket.judul}</h1>
                        {posisiSaya && (
                            <p className="mt-1 text-[13px] leading-tight text-white/90">
                                Peringkatmu: #{posisiSaya.peringkat} dari {posisiSaya.totalPeserta}
                            </p>
                        )}
                    </div>

                    <dl className="flex shrink-0 gap-4">
                        <KartuStat
                            label="Skor IRT"
                            nilai={angka(skorSaya)}
                            tooltip={
                                <InfoTooltip
                                    text="IRT adalah metode penilaian yang mempertimbangkan tingkat kesulitan soal. Jadi, skor tidak hanya dihitung berdasarkan jumlah jawaban benar"
                                    placement="left"
                                    tone="light"
                                />
                            }
                        />
                    </dl>
                </section>

                {/* Pindah tab membuka halaman peringkat jenis itu (halaman 1), sama seperti tautan sebelumnya. */}
                <div ref={tabRef} className="mx-auto max-w-[420px] animate-muncul-halus [animation-delay:60ms] [animation-fill-mode:both]">
                    <TabMode
                        ukuran="kecil"
                        label="Jenis pemeringkatan"
                        daftar={[
                            { mode: 'umum' as JenisPeringkat, label: 'Pemeringkatan Umum' },
                            { mode: 'khusus' as JenisPeringkat, label: 'Pemeringkatan Khusus' },
                        ]}
                        aktif={jenis}
                        onPilih={(j) => j !== jenis && router.visit(keHalaman(j), { preserveScroll: true })}
                    />
                </div>

                {/* Peringkat khusus: tujuan siswa sebagai pil ringkas di tengah, tepat di bawah tab. */}
                {khusus && (
                    <div className="mx-auto flex w-fit max-w-full animate-muncul-halus items-center gap-2.5 rounded-full border border-siswa-garis-halus bg-white px-4 py-2 text-center text-[13px] text-siswa-teks shadow-panel">
                        <svg className="h-4 w-4 shrink-0 text-edvora-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <circle cx="12" cy="12" r="5" />
                            <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                        </svg>
                        {tujuanSaya ? (
                            <p>
                                <span className="font-semibold text-siswa-judul">
                                    {tujuanSaya.universitas} · {tujuanSaya.prodi}
                                </span>
                                . Peringkat dihitung berdasarkan tujuan peserta saat ini.
                            </p>
                        ) : (
                            <p>
                                Isi universitas dan prodi tujuan di{' '}
                                <Link href={route('akun.profil')} className="font-semibold text-edvora-primary hover:underline">
                                    Profil
                                </Link>{' '}
                                untuk melihat peringkat khusus.
                            </p>
                        )}
                    </div>
                )}

                {podium.length > 0 && (
                    <section aria-labelledby="judul-podium" className="pt-2">
                        <h2 id="judul-podium" className="sr-only">
                            Tiga Teratas
                        </h2>
                        <div ref={podiumRef} className="mx-auto grid max-w-[760px] grid-cols-1 items-end gap-4 sm:grid-cols-3 md:gap-5">
                            {podium.map((b, i) => (
                                <KartuPodium key={i} baris={b} posisi={i} khusus={khusus} />
                            ))}
                        </div>
                    </section>
                )}

                {daftar.length > 0 && (
                    <section ref={daftarRef} className="animate-muncul-halus overflow-hidden rounded-kartu bg-white shadow-kartu [animation-delay:300ms] [animation-fill-mode:both]">
                        {/* Di layar sempit tabel bisa digeser ke samping, kolom tidak berdesakan. */}
                        <div className="overflow-x-auto">
                            <table className={`w-full text-left text-[14px] ${khusus ? 'min-w-[420px]' : 'min-w-[680px]'}`}>
                                <thead className="bg-siswa-panel-fleksibel text-[13px] font-semibold text-siswa-judul-seksi">
                                    <tr className="border-b border-siswa-garis-halus">
                                        {kolom.map((k, i) => (
                                            <th
                                                key={k}
                                                scope="col"
                                                className={`py-3.5 ${i === 0 ? 'pl-5 pr-3' : i === kolom.length - 1 ? 'pl-3 pr-5 text-right' : 'px-3'}`}
                                            >
                                                {k}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-siswa-garis-halus">
                                    {daftar.map((b, i) => (
                                        <Baris key={i} baris={b} khusus={khusus} urutan={i} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <div className="flex flex-col-reverse items-center justify-between gap-3 pt-2 sm:flex-row">
                    <Link
                        href={route('tryout.hasil', paket.id)}
                        className="flex h-10 items-center gap-2 rounded-[10px] border border-siswa-garis-halus bg-white px-5 text-sm font-semibold text-siswa-judul shadow-panel transition duration-200 hover:-translate-x-0.5 hover:shadow-md"
                    >
                        <span aria-hidden="true">&larr;</span> Kembali ke Hasil Pengerjaan Try Out
                    </Link>

                    {halaman.terakhir > 1 && (
                        <nav aria-label="Halaman peringkat" className="flex items-center gap-2 text-sm text-siswa-teks">
                            {halaman.sekarang > 1 && (
                                <Link href={keHalaman(jenis, halaman.sekarang - 1)} preserveScroll className={kelasTombolHalaman}>
                                    ‹ Sebelumnya
                                </Link>
                            )}
                            <span className="px-2">
                                Halaman {halaman.sekarang} dari {halaman.terakhir}
                            </span>
                            {halaman.sekarang < halaman.terakhir && (
                                <Link href={keHalaman(jenis, halaman.sekarang + 1)} preserveScroll className={kelasTombolHalaman}>
                                    Berikutnya ›
                                </Link>
                            )}
                        </nav>
                    )}
                </div>

                <PeringkatOnboarding tabRef={tabRef} podiumRef={podiumRef} daftarRef={daftarRef} />
            </div>
        </>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah ke halaman siswa lain.
Peringkat.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
