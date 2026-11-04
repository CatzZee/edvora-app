import { ReactNode, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import Modal from '@/Components/Modal';
import { formatWaktuWib } from '@/lib/waktu';
import { PaketTryOut } from '@/types/tryout';

interface IndexProps {
    paketList: PaketTryOut[];
}

const gayaTombol =
    'inline-flex h-9 items-center whitespace-nowrap rounded-[10px] bg-ujian-biru px-5 text-[13px] font-semibold text-white shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

// 195 → "195", 42.5 → "42,5"
const formatMenit = (menit: number) => menit.toLocaleString('id-ID');

export default function Index({ paketList }: IndexProps) {
    const [paketDipilih, setPaketDipilih] = useState<PaketTryOut | null>(null);
    const [memulai, setMemulai] = useState(false);
    // Isi modal tetap tampil selama animasi menutup, walaupun paketDipilih sudah null.
    const paketTerakhir = useRef<PaketTryOut | null>(null);
    if (paketDipilih) paketTerakhir.current = paketDipilih;
    const paketModal = paketDipilih ?? paketTerakhir.current;

    // Pesan sekali tampil dari backend (Inertia::flash), mis. paket sudah tidak dibuka.
    const { flash } = usePage();
    const pesanError = typeof flash.error === 'string' ? flash.error : null;

    const mulaiKerjakan = () => {
        if (!paketDipilih) return;
        router.post(route('tryout.mulai', paketDipilih.id), {}, {
            onStart: () => setMemulai(true),
            onFinish: () => setMemulai(false),
        });
    };

    return (
        <>
            <Head title="Try Out - EDVORA" />

            {/* Sidebar dan header dari SiswaLayout (persistent layout di bawah).
                Judul, ukuran huruf, dan jarak antar kartu disamakan dengan halaman Pilih Subtes. */}
            <div className="w-full font-poppins">
                <h1 className="pt-[15px] text-[24px] font-semibold leading-tight text-siswa-judul-seksi">Try Out Simulasi UTBK</h1>
                <p className="mt-[9px] text-[15px] font-medium leading-tight text-siswa-teks">
                    Kerjakan semua subtes secara berurutan dengan waktu yang ditentukan.
                </p>

                {pesanError && (
                    <div role="alert" className="mt-4 rounded-lg border border-[#E86565] bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#8A2B2B]">
                        {pesanError}
                    </div>
                )}

                <div className="mt-[23px] space-y-[21px]">
                    {paketList.length === 0 && (
                        <div className="rounded-subtes bg-white px-[19px] py-5 text-[13px] font-medium text-siswa-teks shadow-kartu">Belum ada Try Out yang dibuka.</div>
                    )}

                    {paketList.map((to, i) => (
                        <div
                            key={to.id}
                            className="flex animate-muncul-halus flex-wrap items-center gap-x-4 gap-y-3 rounded-subtes bg-white py-[14px] pl-[19px] pr-[15px] shadow-kartu transition duration-200 [animation-fill-mode:both] hover:-translate-y-1 hover:shadow-xl"
                            style={{ animationDelay: `${i * 70}ms` }}
                        >
                            <IkonPaket />

                            {/* min-w-[140px]: lebar minimum ini yang membuat tombol turun baris di layar sempit (min-w-0 membuat teks diperas sampai tertimpa). */}
                            <div className="min-w-[140px] flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[16px] font-semibold leading-[22px] text-siswa-judul">{to.judul}</h2>
                                    <LencanaDibuka />
                                </div>
                                <InfoPaket paket={to} gaya="chip" />
                            </div>

                            {/* Di layar sempit tombol turun ke baris sendiri, rata kanan. */}
                            <div className="ml-auto shrink-0">
                                {to.statusPengerjaan === 'belum' && (
                                    <button type="button" onClick={() => setPaketDipilih(to)} className={gayaTombol}>
                                        Kerjakan &rarr;
                                    </button>
                                )}
                                {to.statusPengerjaan === 'berjalan' && (
                                    <Link href={route('tryout.kerjakan', to.id)} className={gayaTombol}>
                                        Lanjut Kerjakan &rarr;
                                    </Link>
                                )}
                                {to.statusPengerjaan === 'selesai' && (
                                    <Link href={route('tryout.hasil', to.id)} className={gayaTombol}>
                                        Lihat Hasil Try Out &rarr;
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* POP UP PERATURAN (MODAL): ukuran huruf mengikuti kartu Try Out dan Pilih Subtes. */}
            <Modal
                show={paketDipilih !== null}
                maxWidth="lg"
                onClose={() => setPaketDipilih(null)}
                backdropClassName="bg-siswa-judul/40 backdrop-blur-[2px]"
                panelClassName="rounded-[24px]"
            >
                {paketModal && (
                    <div className="p-6 font-poppins md:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[20px] font-semibold leading-tight text-siswa-judul">{paketModal.judul}</h2>
                                    <LencanaDibuka />
                                </div>
                                <InfoPaket paket={paketModal} gaya="polos" />
                            </div>

                            <button
                                type="button"
                                onClick={() => setPaketDipilih(null)}
                                aria-label="Tutup"
                                className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-siswa-teks transition duration-200 hover:rotate-90 hover:bg-siswa-panel-fleksibel hover:text-edvora-primary"
                            >
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-5 rounded-[14px] border border-siswa-garis-halus bg-siswa-panel-fleksibel px-5 py-4">
                            <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-siswa-judul">Peraturan</h3>
                            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] leading-[19px] text-siswa-teks marker:text-siswa-teks-redup">
                                {paketModal.peraturan.map((aturan, idx) => (
                                    <li key={idx} className="pl-1">
                                        {aturan}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Mulai tetap boleh, tetapi Try Out akan terpotong di akhir periode (T13). */}
                        {!paketModal.waktuCukup && (
                            <p className="mt-3 rounded-[14px] border border-siswa-hint-garis bg-siswa-hint-latar px-4 py-3 text-[13px] leading-[19px] text-siswa-hint-teks">
                                Periode berakhir {formatWaktuWib(paketModal.selesaiAt)}. Jawaban dikirim otomatis saat periode berakhir walaupun waktu subtes
                                masih tersisa.
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={mulaiKerjakan}
                            disabled={memulai}
                            className="mt-6 h-10 w-full rounded-[10px] bg-ujian-biru text-sm font-semibold text-white shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                        >
                            Mulai Kerjakan &rarr;
                        </button>
                    </div>
                )}
            </Modal>
        </>
    );
}

// Lingkaran hijau muda dengan ikon dokumen (Figma: kartu Try Out).
function IkonPaket() {
    return (
        <span className="flex h-14 w-[57px] shrink-0 items-center justify-center rounded-full bg-siswa-ikon-tryout">
            <svg className="h-7 w-7 text-[#6BAF4E]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm1 7V3.5L18.5 9H15zM8 13h8v1.6H8V13zm0 3.4h6V18H8v-1.6z" />
            </svg>
        </span>
    );
}

function LencanaDibuka() {
    return (
        <span className="rounded-full border border-[#9BD27E] bg-siswa-ikon-tryout px-2.5 py-px text-[11px] font-medium uppercase leading-4 text-[#4C9A3A]">DIBUKA</span>
    );
}

// Jumlah soal, durasi, dan batas periode. "chip": berbingkai di kartu; "polos": baris teks di modal.
function InfoPaket({ paket, gaya }: { paket: PaketTryOut; gaya: 'chip' | 'polos' }) {
    const butir = [
        { ikon: <IkonBuku />, teks: `${paket.totalSoal} soal` },
        { ikon: <IkonJam />, teks: `${formatMenit(paket.totalMenit)} menit` },
        { ikon: <IkonKalender />, teks: `s.d. ${formatWaktuWib(paket.selesaiAt)}` },
    ];

    return (
        <div className={`flex flex-wrap ${gaya === 'chip' ? 'mt-1.5 gap-1.5' : 'mt-1.5 gap-x-4 gap-y-1'}`}>
            {butir.map(({ ikon, teks }) => (
                <span
                    key={teks}
                    className={`flex items-center gap-1.5 text-siswa-teks ${
                        gaya === 'chip' ? 'rounded-full border border-siswa-ujian-garis px-2.5 py-0.5 text-[13px] leading-[19px]' : 'text-[13px] leading-[19px]'
                    }`}
                >
                    {ikon}
                    {teks}
                </span>
            ))}
        </div>
    );
}

const kelasIkon = 'h-[1.1em] w-[1.1em] shrink-0';

function IkonBuku() {
    return (
        <svg className={kelasIkon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 3h11a1 1 0 011 1v14H7a2 2 0 00-2 2V5a2 2 0 011-2zM5 20a1 1 0 001 1h12" />
        </svg>
    );
}

function IkonJam() {
    return (
        <svg className={kelasIkon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    );
}

function IkonKalender() {
    return (
        <svg className={kelasIkon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah ke halaman siswa lain.
Index.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
