import { Head, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useState } from 'react';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import BannerSapaan from '@/Components/Beranda/BannerSapaan';
import KartuMenu from '@/Components/Beranda/KartuMenu';
import KartuPenguasaan from '@/Components/Beranda/KartuPenguasaan';
import KartuRekomendasi from '@/Components/Beranda/KartuRekomendasi';

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
}

export default function Siswa({ judul = 'Beranda', level, poin, rekomendasi, penguasaanSubtes }: SiswaProps) {
    const user = usePage<any>().props.auth.user;

    // State untuk Modal Awal & Step Walkthrough
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [currentStep, setCurrentStep] = useState<number | null>(null); // null = walkthrough mati, 1/2/3 = step aktif

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('edvora_has_seen_beranda_tour');
        if (!hasSeenTour) {
            setShowWelcomeModal(true);
        }
    }, []);

    // Jalankan Tur Langkah demi Langkah
    const startStepByStepTour = () => {
        setShowWelcomeModal(false);
        setCurrentStep(1);
    };

    // Hentikan / Selesaikan Tur
    const finishTour = () => {
        setCurrentStep(null);
        localStorage.setItem('edvora_has_seen_beranda_tour', 'true');
    };

    // Lewati di Modal Awal
    const handleSkipModal = () => {
        setShowWelcomeModal(false);
        localStorage.setItem('edvora_has_seen_beranda_tour', 'true');
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

            {/* OVERLAY DARK BACKDROP SAAT WALKTHROUGH AKTIF */}
            {currentStep !== null && (
                <div className="fixed inset-0 z-[990] bg-slate-900/60 transition-opacity duration-300" />
            )}

            <div className="w-full space-y-4 font-poppins relative">
                <BannerSapaan nama={user?.name || 'Siswa'} level={level} poin={poin} />

                <div className="grid grid-cols-1 gap-[21px] md:grid-cols-2 xl:grid-cols-3">
                    {/* STEP 1: LATIHAN SOAL & TRY OUT */}
                    <div
                        id="tour-latihan-tryout"
                        className={`col-span-1 md:col-span-2 xl:col-span-2 grid grid-cols-1 gap-[21px] md:grid-cols-2 transition-all duration-300 relative ${currentStep === 1
                            ? 'z-[995] scale-[1.02] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white p-2'
                            : ''
                            }`}
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

                        {/* POPOVER STEP 1 */}
                        {currentStep === 1 && (
                            <div className="absolute right-0 -bottom-48 z-[1000] w-[360px] rounded-[24px] bg-white p-6 shadow-2xl animate-fade-in border border-slate-100">
                                <div className="absolute -top-3 right-12 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-white" />

                                <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                    Pilih <strong className="font-bold text-[#1a365d]">Latihan Soal</strong> atau <strong className="font-bold text-[#1a365d]">Try Out</strong> untuk mengasah kemampuanmu!
                                </p>

                                <div className="mt-5 flex items-center justify-between">
                                    <button
                                        onClick={finishTour}
                                        className="rounded-full border border-slate-300 px-5 py-1.5 text-xs font-semibold text-[#3b5998] transition hover:bg-slate-50 cursor-pointer"
                                    >
                                        Lewati
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            disabled
                                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-200 text-xs font-bold text-slate-400 cursor-not-allowed"
                                        >
                                            ‹
                                        </button>
                                        <span className="text-xs font-bold text-[#3b5998]">1 / 3</span>
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* STEP 2: REKOMENDASI TOPIK */}
                    <div
                        id="tour-rekomendasi"
                        className={`md:col-span-2 xl:col-span-1 transition-all duration-300 relative ${currentStep === 2
                            ? 'z-[995] scale-[1.02] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white'
                            : ''
                            }`}
                    >
                        <KartuRekomendasi rekomendasi={rekomendasi} />

                        {/* POPOVER STEP 2 */}
                        {currentStep === 2 && (
                            <div className="absolute left-0 -bottom-48 z-[1000] w-[360px] rounded-[24px] bg-white p-6 shadow-2xl animate-fade-in border border-slate-100">
                                <div className="absolute -top-3 left-12 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-white" />

                                <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                    Cek <strong className="font-bold text-[#1a365d]">rekomendasi topik</strong> yang menjadi titik awal buat meningkatkan kemampuanmu.
                                </p>

                                <div className="mt-5 flex items-center justify-between">
                                    <button
                                        onClick={finishTour}
                                        className="rounded-full border border-slate-300 px-5 py-1.5 text-xs font-semibold text-[#3b5998] transition hover:bg-slate-50 cursor-pointer"
                                    >
                                        Lewati
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentStep(1)}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                        >
                                            ‹
                                        </button>
                                        <span className="text-xs font-bold text-[#3b5998]">2 / 3</span>
                                        <button
                                            onClick={() => setCurrentStep(3)}
                                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* STEP 3: PENGUASAAN PER SUBTES */}
                <div
                    id="tour-penguasaan"
                    className={`transition-all duration-300 relative ${currentStep === 3
                        ? 'z-[995] scale-[1.01] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white'
                        : ''
                        }`}
                >
                    <KartuPenguasaan penguasaanSubtes={penguasaanSubtes} />

                    {/* POPOVER STEP 3 */}
                    {currentStep === 3 && (
                        <div className="absolute left-10 -top-48 z-[1000] w-[370px] rounded-[24px] bg-white p-6 shadow-2xl animate-fade-in border border-slate-100">
                            <div className="absolute -bottom-3 left-12 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />

                            <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                Sejauh mana prosesmu? Pantau melalui lingkaran yang menunjukkan <strong className="font-bold text-[#1a365d]">tingkat penguasaanmu</strong>
                            </p>

                            <div className="mt-5 flex items-center justify-between">
                                <button
                                    onClick={finishTour}
                                    className="rounded-full bg-gradient-to-r from-[#4c78dd] to-[#3b5998] px-6 py-1.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 cursor-pointer"
                                >
                                    Selesai
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                    >
                                        ‹
                                    </button>
                                    <span className="text-xs font-bold text-[#3b5998]">3 / 3</span>
                                    <button
                                        disabled
                                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-200 text-xs font-bold text-slate-400 cursor-not-allowed"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tombol Dev Mode */}
            <button
                type="button"
                onClick={() => {
                    localStorage.removeItem('edvora_has_seen_beranda_tour');
                    window.location.reload();
                }}
                className="fixed bottom-5 right-5 z-[1010] flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl transition hover:bg-rose-700 active:scale-95 cursor-pointer"
            >
                🔄 Reset Tour (Dev Mode)
            </button>
        </>
    );
}

Siswa.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;