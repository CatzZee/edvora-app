import { ReactNode, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import KartuStat from '@/Components/Beranda/KartuStat';
import InfoTooltip from '@/Components/Shared/InfoTooltip';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import { warnaSubtes } from '@/Components/Latihan/KartuSubtes';
import { formatWaktuWib } from '@/lib/waktu';
import { HasilSubtesTryOut } from '@/types/tryout';

interface HasilProps {
    paket: { id: string; judul: string; selesaiAt: string };
    ditutup: boolean;
    skorTotal: number | null; // null sampai skor IRT dihitung setelah paket ditutup
    perSubtes: HasilSubtesTryOut[];
    xp: number;
    poin: number;
}

// Singkatan subtes dari huruf depan kata berhuruf kapital: "Pengetahuan dan Pemahaman Umum" → "PPU".
function singkatan(nama: string): string {
    return nama
        .split(/\s+/)
        .filter((kata) => /^[A-Z]/.test(kata))
        .map((kata) => kata[0])
        .join('');
}

// Satu kartu subtes di bagian Rincian (Figma: Hasil Try Out). Setelah paket dinilai, angka dan bilah memakai skor IRT
// subtes (bilah = skor/1000); sebelumnya jumlah benar dari jumlah soal (RANCANGAN-peringkat-pembahasan-tryout.md P4).
// Warna lencana sama dengan kartu Pilih Subtes.
function KartuSubtes({ subtes, urutan }: { subtes: HasilSubtesTryOut; urutan: number }) {
    const kode = singkatan(subtes.nama);
    const persen = subtes.skor !== null ? subtes.skor / 10 : subtes.jumlahSoal > 0 ? (subtes.benar / subtes.jumlahSoal) * 100 : 0;

    return (
        <div
            className="animate-muncul-halus rounded-subtes border border-siswa-garis-halus bg-white px-4 py-3.5 transition duration-200 [animation-fill-mode:both] hover:-translate-y-0.5 hover:shadow-kartu"
            style={{ animationDelay: `${150 + urutan * 60}ms` }}
        >
            <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${warnaSubtes(kode).lingkaran}`}>
                    {kode || '–'}
                </span>
                <p className="min-w-0 flex-1 text-[15px] font-medium leading-tight text-siswa-judul">{subtes.nama}</p>
                <span className="shrink-0 text-[16px] font-semibold text-siswa-judul">
                    {subtes.skor !== null ? (
                        subtes.skor.toLocaleString('id-ID')
                    ) : (
                        <>
                            {subtes.benar}
                            <span className="text-[13px] font-medium text-siswa-teks">/{subtes.jumlahSoal}</span>
                        </>
                    )}
                </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-siswa-panel-fleksibel">
                <div className="h-full rounded-full bg-ujian-biru transition-[width] duration-700 ease-out" style={{ width: `${persen}%` }} />
            </div>

            <p className="mt-2 text-[11px] leading-4">
                <span className="text-siswa-umpan-benar-teks">{subtes.benar} Benar</span>
                <span className="text-siswa-teks-redup"> · </span>
                <span className="text-siswa-umpan-salah-teks">{subtes.salah} Salah</span>
                <span className="text-siswa-teks"> · {subtes.kosong} Kosong</span>
            </p>
        </div>
    );
}

const kelasTombol = 'flex h-10 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold shadow-panel transition duration-200';

// Sama dengan TryOutController::PESAN_PERINGKAT_BELUM.
const PESAN_PERINGKAT_BELUM = 'Peringkat belum tersedia, silakan menunggu event Try Out berakhir.';

export default function Hasil({ paket, ditutup, skorTotal, perSubtes, xp, poin }: HasilProps) {
    // Pesan dari server (URL peringkat/pembahasan dibuka terlalu cepat) memakai pop-up yang sama dengan tombol.
    const { flash } = usePage();
    const [pesan, setPesan] = useState<string | null>(typeof flash.error === 'string' ? flash.error : null);

    return (
        <>
            <Head title={`Hasil ${paket.judul} - EDVORA`} />

            {/* Ukuran huruf, kartu, dan jarak mengikuti Beranda supaya halaman siswa terasa satu keluarga. */}
            <div className="w-full space-y-4 font-poppins text-siswa-judul">
                {/* Banner judul: gaya sama dengan banner sapaan Beranda, XP dan Poin memakai kotak angka yang sama. */}
                <section className="flex min-h-[83px] animate-muncul-halus flex-wrap items-center justify-between gap-4 rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-4 shadow-kartu">
                    <div className="min-w-0">
                        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/85">Hasil Evaluasi Try Out</p>
                        <h1 className="mt-0.5 text-[24px] font-semibold leading-tight text-white">{paket.judul}</h1>
                        <p className="mt-1 text-[13px] leading-tight text-white/90">
                            {skorTotal === null
                                ? `Skor IRT dan peringkat muncul setelah periode berakhir, ${formatWaktuWib(paket.selesaiAt)}.`
                                : `Skor IRT: ${skorTotal.toLocaleString('id-ID')} dari 1000`}
                        </p>
                    </div>

                    <dl className="flex shrink-0 gap-4">
                        {skorTotal !== null && (
                            <KartuStat
                                label="Skor IRT"
                                nilai={skorTotal.toLocaleString('id-ID')}
                                tooltip={
                                    <InfoTooltip
                                        text="IRT adalah metode penilaian yang mempertimbangkan tingkat kesulitan soal. Jadi, skor tidak hanya dihitung berdasarkan jumlah jawaban benar"
                                        placement="left"
                                        tone="light"
                                    />
                                }
                            />
                        )}
                        <KartuStat label="XP" nilai={xp} awalan="+" />
                        <KartuStat label="Poin" nilai={poin} awalan="+" />
                    </dl>
                </section>

                {/* Rincian per subtes */}
                <section className="animate-muncul-halus rounded-kartu bg-white px-[26px] py-[14px] pb-6 shadow-kartu [animation-delay:80ms] [animation-fill-mode:both]">
                    <h2 className="text-[18px] font-semibold leading-[33px] text-siswa-judul-seksi">Rincian</h2>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {perSubtes.map((s, i) => (
                            <KartuSubtes key={s.id} subtes={s} urutan={i} />
                        ))}
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    {/* Peringkat tersedia setelah paket dinilai; sebelumnya pop-up tanpa request ke server (P1, P2). */}
                    {skorTotal === null ? (
                        <button
                            type="button"
                            onClick={() => setPesan(PESAN_PERINGKAT_BELUM)}
                            className={`${kelasTombol} bg-ujian-biru text-white hover:-translate-y-0.5 hover:shadow-md`}
                        >
                            Peringkat Try Out
                        </button>
                    ) : (
                        <Link href={route('tryout.peringkat', paket.id)} className={`${kelasTombol} bg-ujian-biru text-white hover:-translate-y-0.5 hover:shadow-md`}>
                            Peringkat Try Out
                        </Link>
                    )}
                    {/* Pembahasan dibuka setelah paket ditutup, supaya kunci tidak bocor ke peserta lain (P3). */}
                    <div>
                        {ditutup ? (
                            <Link
                                href={route('tryout.pembahasan', [paket.id, 1])}
                                className={`${kelasTombol} w-full bg-ujian-biru text-white hover:-translate-y-0.5 hover:shadow-md`}
                            >
                                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14" />
                                </svg>
                                Lihat Pembahasan
                            </Link>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    disabled
                                    title="Tersedia setelah periode berakhir"
                                    className={`${kelasTombol} w-full cursor-not-allowed bg-siswa-ujian-redup text-white/90 shadow-none`}
                                >
                                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14" />
                                    </svg>
                                    Lihat Pembahasan
                                </button>
                                <p className="mt-1.5 text-center text-[11px] text-siswa-teks sm:text-right">Pembahasan tersedia setelah periode berakhir.</p>
                            </>
                        )}
                    </div>
                </div>

                <Modal show={pesan !== null} maxWidth="sm" onClose={() => setPesan(null)}>
                    <div className="p-6 text-siswa-judul">
                        <p className="text-sm">{pesan}</p>
                        <div className="mt-4 flex justify-end">
                            <button type="button" onClick={() => setPesan(null)} className="rounded-lg bg-ujian-biru px-4 py-2 text-sm font-semibold text-white">
                                OK
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah ke halaman siswa lain.
Hasil.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
