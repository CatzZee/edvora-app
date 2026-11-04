import { ReactNode, useEffect, useState } from 'react';

export type StatusJawabanSoal = 'benar' | 'salah' | null;

interface NavigasiSoalProps {
    jumlahSoal: number;
    indeksAktif: number;
    sudahDijawab: (indeks: number) => boolean;
    onPilih: (indeks: number) => void;
    // Nama subtes di pil putih di atas kartu.
    judul?: string;
    aksiBawah?: ReactNode;
    // Hanya diisi mode fleksibel, saat jawaban sudah dikunci dan boleh ketahuan benar/salahnya.
    statusJawaban?: (indeks: number) => StatusJawabanSoal;
    // Try Out: timer di kanan pil judul.
    judulKanan?: ReactNode;
    // Try Out: warna bulatan sendiri (terjawab biru, ragu-ragu kuning). undefined = gaya bawaan.
    gayaNomor?: (indeks: number) => string | undefined;
    // Try Out tidak memakai keterangan warna.
    tanpaKeterangan?: boolean;
    // Tombol di antara bulatan dan Sebelumnya/Lanjutkan (Ragu-ragu di Try Out).
    aksiTengah?: ReactNode;
}

const gayaBulatan: Record<'benar' | 'salah', string> = {
    benar: 'border-transparent bg-ujian-hijau text-white',
    salah: 'border-transparent bg-ujian-merah text-white',
};

// Tombol biru bergradasi (Sebelumnya, Lanjutkan, Kembali di modal Hint).
export const KELAS_TOMBOL_BIRU =
    'rounded-lg bg-ujian-biru font-semibold text-white shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 active:translate-y-0 disabled:pointer-events-none disabled:border disabled:border-siswa-ujian-garis disabled:bg-white disabled:bg-none disabled:text-siswa-teks-redup disabled:shadow-none';

interface TombolNavigasiSoalProps {
    jumlahSoal: number;
    indeksAktif: number;
    onPilih: (indeks: number) => void;
}

// Pindah antar soal; di md ke atas dirender di kartu Navigasi Soal, di HP langsung di bawah opsi jawaban.
// Di HP tombolnya ditinggikan supaya nyaman ditekan dengan jempol.
export function TombolNavigasiSoal({ jumlahSoal, indeksAktif, onPilih }: TombolNavigasiSoalProps) {
    const gaya = `${KELAS_TOMBOL_BIRU} h-11 px-2 text-sm md:h-9 md:text-xs lg:text-[13px]`;

    return (
        <div className="grid grid-cols-2 gap-2.5 md:gap-1.5">
            <button type="button" className={gaya} disabled={indeksAktif === 0} onClick={() => onPilih(indeksAktif - 1)}>
                ← Sebelumnya
            </button>
            <button type="button" className={gaya} disabled={indeksAktif === jumlahSoal - 1} onClick={() => onPilih(indeksAktif + 1)}>
                Lanjutkan →
            </button>
        </div>
    );
}

function Keterangan({ titik, label }: { titik: string; label: string }) {
    return (
        <span className="flex items-center gap-1">
            <span className={`h-2 w-2 shrink-0 rounded-full ${titik}`} />
            {label}
        </span>
    );
}

/**
 * Panel kanan halaman pengerjaan: pil nama subtes dan kartu "Navigasi Soal". Dirender di slot sidebar LatihanLayout.
 *
 * Di md ke atas tampilannya tetap: satu kartu putih berisi bulatan nomor, keterangan warna, lalu tombol aksi.
 * Di HP kartu itu dipecah supaya bulatan nomor tidak menyela antara opsi jawaban dan tombolnya: bulatan nomor
 * pindah ke lembar bawah yang dibuka lewat tombol di baris judul, sedangkan Sebelumnya/Lanjutkan/Simpan Jawaban
 * tetap mengalir persis di bawah opsi jawaban.
 */
export function NavigasiSoal({
    jumlahSoal,
    indeksAktif,
    sudahDijawab,
    onPilih,
    judul,
    aksiBawah,
    statusJawaban,
    judulKanan,
    gayaNomor,
    tanpaKeterangan = false,
    aksiTengah,
}: NavigasiSoalProps) {
    const [lembarBuka, setLembarBuka] = useState(false);

    // Escape menutup lembar; begitu pula saat layar dilebarkan ke md, karena di sana bulatan nomor
    // sudah tampil di kartu dan lembar yang masih terbuka hanya menutupi halaman.
    useEffect(() => {
        if (!lembarBuka) return;

        const tutupDenganEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLembarBuka(false);
        };
        const layarLebar = window.matchMedia('(min-width: 768px)');
        const tutupDiLayarLebar = () => layarLebar.matches && setLembarBuka(false);

        document.addEventListener('keydown', tutupDenganEscape);
        layarLebar.addEventListener('change', tutupDiLayarLebar);

        return () => {
            document.removeEventListener('keydown', tutupDenganEscape);
            layarLebar.removeEventListener('change', tutupDiLayarLebar);
        };
    }, [lembarBuka]);

    // Dipakai dua kali: di kartu (md ke atas) dan di lembar bawah (HP).
    const bulatanNomor = (onKlik: (indeks: number) => void) =>
        Array.from({ length: jumlahSoal }, (_, i) => {
            const aktif = i === indeksAktif;
            const terjawab = sudahDijawab(i);
            const status = statusJawaban?.(i) ?? null;
            const gayaBawaan = status
                ? gayaBulatan[status]
                : terjawab
                  ? 'border-transparent bg-siswa-titik-terisi text-white'
                  : 'border-siswa-ujian-garis bg-white text-siswa-teks hover:border-edvora-primary hover:text-edvora-primary';
            const gaya = gayaNomor?.(i) ?? gayaBawaan;
            const labelStatus = status ? `, jawaban ${status}` : terjawab ? ', sudah dijawab' : '';
            return (
                <button
                    key={i}
                    type="button"
                    onClick={() => onKlik(i)}
                    aria-current={aktif ? 'step' : undefined}
                    aria-label={`Soal ${i + 1}${labelStatus}`}
                    className={`mx-auto flex aspect-square w-full max-w-[40px] items-center justify-center rounded-full border text-[13px] font-medium transition duration-200 hover:scale-105 ${gaya} ${
                        aktif ? 'ring-2 ring-edvora-primary/60 ring-offset-2' : ''
                    }`}
                >
                    {i + 1}
                </button>
            );
        });

    // Mode simulasi (tanpa statusJawaban) tidak pernah menampilkan benar/salah, jadi hanya Kosong dan Terisi, rata kiri.
    // Di mode lain setiap soal yang sudah dijawab selalu berwarna benar/salah, jadi "Terisi" tidak dipakai.
    const keterangan = tanpaKeterangan ? null : (
        <div className={`flex flex-wrap gap-y-1 text-[10px] text-siswa-teks ${statusJawaban ? 'justify-between gap-x-3' : 'justify-start gap-x-5'}`}>
            {statusJawaban && (
                <>
                    <Keterangan titik="bg-siswa-titik-benar" label="Benar" />
                    <Keterangan titik="bg-siswa-titik-salah" label="Salah" />
                </>
            )}
            <Keterangan titik="border border-siswa-titik-terisi bg-white" label="Kosong" />
            {!statusJawaban && <Keterangan titik="bg-siswa-titik-terisi" label="Terisi" />}
        </div>
    );

    // Hanya di HP: pembuka lembar bulatan nomor, sekaligus penunjuk soal keberapa yang sedang dibuka.
    const tombolBukaLembar = (
        <button
            type="button"
            onClick={() => setLembarBuka(true)}
            aria-expanded={lembarBuka}
            aria-label="Buka navigasi soal"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-siswa-ujian-garis bg-white px-2.5 text-[12px] font-semibold text-siswa-judul transition duration-200 hover:border-edvora-primary hover:text-edvora-primary md:hidden"
        >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
            <span className="tabular-nums">
                {indeksAktif + 1}/{jumlahSoal}
            </span>
        </button>
    );

    return (
        <div className="animate-muncul-halus">
            {judul ? (
                <div
                    className={`mb-2.5 flex min-h-10 items-center justify-between gap-2 rounded-[10px] bg-white text-[13px] font-semibold text-siswa-judul md:gap-3 ${
                        judulKanan ? 'py-1.5 pl-4 pr-1.5 shadow-kartu' : 'border border-siswa-ujian-garis px-4 max-md:py-1.5 max-md:pr-1.5'
                    }`}
                >
                    <span className="truncate">{judul}</span>
                    <div className="flex shrink-0 items-center gap-2">
                        {judulKanan}
                        {tombolBukaLembar}
                    </div>
                </div>
            ) : (
                <div className="mb-2.5 flex justify-end md:hidden">{tombolBukaLembar}</div>
            )}

            {/* Di HP kotak putih kartu dilepas: yang tersisa hanya tombol aksi, supaya menyambung dengan opsi jawaban di atasnya. */}
            <div className="rounded-[14px] bg-white p-4 shadow-kartu max-md:rounded-none max-md:bg-transparent max-md:p-0 max-md:shadow-none lg:p-5">
                <div className="hidden md:block">
                    <h3 className="text-[13px] font-semibold text-siswa-judul">Navigasi Soal</h3>

                    <div className="mt-3 grid grid-cols-5 gap-2">{bulatanNomor(onPilih)}</div>

                    {keterangan && <div className="mt-3">{keterangan}</div>}
                </div>

                {aksiTengah && <div className="mt-4 max-md:mt-0">{aksiTengah}</div>}

                <div className="mt-4 max-md:mt-3">
                    <TombolNavigasiSoal jumlahSoal={jumlahSoal} indeksAktif={indeksAktif} onPilih={onPilih} />
                </div>

                {aksiBawah && <div className="mt-2.5">{aksiBawah}</div>}
            </div>

            {/* Lembar bawah berisi bulatan nomor, hanya di HP. Saat tertutup di-invisible supaya nomornya tidak terjangkau lewat Tab. */}
            <div className="md:hidden">
                {lembarBuka && <div onClick={() => setLembarBuka(false)} className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm" aria-hidden="true" />}

                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navigasi Soal"
                    className={`fixed inset-x-0 bottom-0 z-[46] max-h-[75vh] overflow-y-auto overscroll-contain rounded-t-[20px] bg-white px-5 pb-8 pt-4 shadow-[0_-8px_30px_rgba(15,23,42,0.18)] transition-[transform,visibility] duration-300 ${
                        lembarBuka ? 'visible translate-y-0' : 'invisible translate-y-full'
                    }`}
                >
                    <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-siswa-ujian-garis" aria-hidden="true" />

                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[15px] font-semibold text-siswa-judul">Navigasi Soal</h3>
                        <button
                            type="button"
                            onClick={() => setLembarBuka(false)}
                            aria-label="Tutup navigasi soal"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-siswa-teks transition duration-200 hover:bg-siswa-laman-awal hover:text-siswa-judul"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                                <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                        </button>
                    </div>

                    {/* Memilih nomor langsung menutup lembar supaya siswa kembali ke soalnya. */}
                    <div className="mt-4 grid grid-cols-6 gap-2.5">
                        {bulatanNomor((i) => {
                            onPilih(i);
                            setLembarBuka(false);
                        })}
                    </div>

                    {keterangan && <div className="mt-4 text-[11px]">{keterangan}</div>}
                </div>
            </div>
        </div>
    );
}

interface ArenaPengerjaanProps {
    judul: string;
    aksiHeader?: ReactNode;
    footerKiri?: ReactNode;
    footerKanan?: ReactNode;
    children: ReactNode;
}

export default function ArenaPengerjaan({ judul, aksiHeader, footerKiri, footerKanan, children }: ArenaPengerjaanProps) {
    return (
        <div className="flex flex-col">
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 px-1">
                <h2 className="text-xl font-semibold text-siswa-judul lg:text-[22px]">{judul}</h2>
                {aksiHeader}
            </div>

            <div className="mt-2">{children}</div>

            {(footerKiri || footerKanan) && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div>{footerKiri}</div>
                    <div className="ml-auto">{footerKanan}</div>
                </div>
            )}
        </div>
    );
}
