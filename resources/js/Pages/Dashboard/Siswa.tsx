import { Head, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useState } from 'react';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import BannerSapaan from '@/Components/Beranda/BannerSapaan';
import KartuMenu from '@/Components/Beranda/KartuMenu';
import KartuPenguasaan from '@/Components/Beranda/KartuPenguasaan';
import KartuRekomendasi from '@/Components/Beranda/KartuRekomendasi';
import TurFitur, { LangkahTur } from '@/Components/Tur/TurFitur';
import { sudahLihatTur, tandaiTurSelesai } from '@/lib/turFitur';

interface TopikRekomendasi {
    topikId: string;
    kodeSubtes: string | null;
    namaTopik: string;
    persen: number;
}

interface PenguasaanSubtes {
    kode: string | null;
    nama: string;
    persen: number;
    adaData: boolean;
}

interface SiswaProps {
    judul?: string;
    level: number;
    poin: number;
    rekomendasi: TopikRekomendasi[];
    penguasaanSubtes: PenguasaanSubtes[];
    tampilkanTur: boolean;
}

// Di luar komponen supaya identitas array-nya tetap dan efek di TurFitur tidak jalan ulang tiap render.
const LANGKAH_TUR: LangkahTur[] = [
    {
        target: 'beranda-latihan-tryout',
        posisi: 'bawah',
        teks: (
            <>
                Pilih <strong className="font-semibold">Latihan Soal</strong> atau <strong className="font-semibold">Try Out</strong> untuk mengasah kemampuanmu!
            </>
        ),
    },
    {
        target: 'beranda-rekomendasi',
        posisi: 'bawah',
        teks: (
            <>
                Cek <strong className="font-semibold">rekomendasi topik</strong> yang menjadi titik awal buat meningkatkan kemampuanmu.
            </>
        ),
    },
    {
        target: 'beranda-penguasaan',
        posisi: 'atas',
        teks: (
            <>
                Sejauh mana prosesmu? Pantau melalui lingkaran yang menunjukkan <strong className="font-semibold">tingkat penguasaanmu</strong>
            </>
        ),
    },
];

export default function Siswa({ judul = 'Beranda', level, poin, rekomendasi, penguasaanSubtes, tampilkanTur }: SiswaProps) {
    const user = usePage<any>().props.auth.user;

    // Modal sambutan lebih dulu; tur sorotannya (TurFitur) baru jalan setelah "Mulai Tur" ditekan.
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [turJalan, setTurJalan] = useState(false);

    // Penanda per akun, supaya dua akun di satu browser tidak saling memengaruhi.
    const kunciTur = 'beranda';
    // Penanda lama (sebelum tur dipindah ke TurFitur) tetap dihormati agar siswa lama tidak melihatnya lagi.
    const kunciLama = `edvora_has_seen_beranda_tour_${user.id}`;

    useEffect(() => {
        const sudahLihat = sudahLihatTur(kunciTur, 1, user.id) || localStorage.getItem(kunciLama) !== null;

        if (tampilkanTur && !sudahLihat) {
            setShowWelcomeModal(true);
        }
    }, [tampilkanTur, kunciTur, kunciLama, user.id]);

    const startStepByStepTour = () => {
        setShowWelcomeModal(false);
        setTurJalan(true);
    };

    // Lewati di Modal Awal
    const handleSkipModal = () => {
        setShowWelcomeModal(false);
        tandaiTurSelesai(kunciTur, 1, user.id);
    };

    return (
        <>
            <Head title={judul} />

            {/* MODAL WELCOME AWAL */}
            {showWelcomeModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl text-[#2b4c7e] animate-fade-in">
                        <h3 className="text-2xl font-bold text-[#3b5998]">Selamat Datang di EDVORA!</h3>
                        <p className="mt-4 text-base leading-relaxed text-[#2b4c7e] font-medium">
                            Yuk, kenali <strong className="text-[#1a365d] font-bold">Beranda</strong> untuk melihat tempat mulai latihan, melihat rekomendasi, dan memantau perkembangan belajarmu!
                        </p>

                        <div className="mt-8 flex items-center justify-between">
                            <button
                                onClick={handleSkipModal}
                                className="rounded-full border border-slate-300 px-7 py-2.5 text-sm font-semibold text-[#3b5998] transition hover:bg-slate-50 cursor-pointer"
                            >
                                Lewati
                            </button>
                            <button
                                onClick={startStepByStepTour}
                                className="rounded-full bg-gradient-to-r from-[#4c78dd] to-[#3b5998] px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-95 cursor-pointer"
                            >
                                Mulai Tur
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full space-y-4 font-poppins relative">
                <BannerSapaan nama={user?.name || 'Siswa'} level={level} poin={poin} />

                <div className="grid grid-cols-1 gap-[21px] md:grid-cols-2 xl:grid-cols-3">
                    {/* STEP 1: LATIHAN SOAL & TRY OUT */}
                    <div
                        data-tur="beranda-latihan-tryout"
                        className="col-span-1 md:col-span-2 xl:col-span-2 grid grid-cols-1 gap-[21px] md:grid-cols-2"
                    >
                        <KartuMenu
                            href={route('latihan.index')}
                            prefetch
                            judul="Latihan Soal"
                            keterangan="Kerjakan soal latihan sesuai subtest yang kamu inginkan!"
                            ikon="/images/ikon/kartu-latihan.png"
                            kelasIkon="h-[37.775px] w-[39.68px]"
                            kelasLatarIkon="bg-siswa-ikon-latihan"
                        />

                        <KartuMenu
                            href={route('tryout.index')}
                            judul="Try Out"
                            keterangan="Latih kemampuan kamu dan dapatkan pengalaman ujian sesungguhnya dengan timer!"
                            ikon="/images/ikon/kartu-tryout.png"
                            kelasIkon="h-[35.568px] w-[36.042px]"
                            kelasLatarIkon="bg-siswa-ikon-tryout"
                        />
                    </div>

                    {/* STEP 2: REKOMENDASI TOPIK */}
                    <div data-tur="beranda-rekomendasi" className="md:col-span-2 xl:col-span-1">
                        <KartuRekomendasi rekomendasi={rekomendasi} />
                    </div>
                </div>

                {/* STEP 3: PENGUASAAN PER SUBTES */}
                <div data-tur="beranda-penguasaan">
                    <KartuPenguasaan penguasaanSubtes={penguasaanSubtes} />
                </div>
            </div>

            <TurFitur kunci={kunciTur} langkah={LANGKAH_TUR} aktif={turJalan} />
        </>
    );
}

Siswa.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;