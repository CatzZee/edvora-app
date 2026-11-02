import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import LatihanLayout from '@/Components/Layouts/LatihanLayout';
import Modal from '@/Components/Modal';
import ArenaPengerjaan, { NavigasiSoal, StatusJawabanSoal } from '@/Components/Ujian/ArenaPengerjaan';
import KartuPembahasan from '@/Components/Ujian/KartuPembahasan';
import KartuSoal, { TeksMatematika } from '@/Components/Ujian/KartuSoal';
import TabelMajemuk from '@/Components/Ujian/TabelMajemuk';
import TimerMundur from '@/Components/Ujian/TimerMundur';
import TombolOpsi, { IkonHasil, StatusOpsi } from '@/Components/Ujian/TombolOpsi';
import { JawabanTersimpan, OpsiJawaban, UmpanBalikJawaban } from '@/types/latihan';

type ModalAktif = 'hint' | 'keluar' | 'selesai' | null;
type IdOpsi = string | number;
type Jawaban = { soalId: IdOpsi; opsiIds: IdOpsi[]; jawabanIsian?: string; pilihanKolom?: Record<string, number> };

interface UjianProps {
    subtes: any;
    soalList: any[];
    konfigurasi: any;
    jawabanTersimpan?: JawabanTersimpan[];
    hintTerbuka?: Record<string, string>;
}

function pesanGagal(e: unknown, aksi: string): string {
    if (!axios.isAxiosError(e) || !e.response) return 'Gagal terhubung ke server. Periksa koneksi lalu coba lagi.';
    const { status, data } = e.response;
    if (status === 422) return (Object.values(data?.errors ?? {}) as string[][]).flat()[0] ?? data?.message ?? 'Permintaan tidak valid.';
    if (status === 410) return 'Sesi latihan sudah berakhir. Silakan mulai ulang latihan.';
    if (status === 429) return `Terlalu sering ${aksi}. Tunggu sebentar lalu coba lagi.`;
    if (status === 419) return 'Sesi login kedaluwarsa. Muat ulang halaman.';
    return data?.message ?? `Gagal ${aksi}. Coba lagi.`;
}

export default function Ujian({ subtes, soalList, konfigurasi, jawabanTersimpan = [], hintTerbuka: hintAwal = {} }: UjianProps) {
    const simulasi = konfigurasi.mode === 'simulasi';

    // State Walkthrough Ujian (1/5 - 5/5)
    const [currentStep, setCurrentStep] = useState<number | null>(null);
    const [tourPopoverPosition, setTourPopoverPosition] = useState({ previous: { left: 0, top: 0, arrow: 0 }, next: { left: 0, top: 0, arrow: 0 }, exit: { left: 0, top: 0, arrow: 0 } });
    const [navigationSpotlightRect, setNavigationSpotlightRect] = useState<DOMRect | null>(null);

    // State khusus walkthrough saat pertama kali menjawab salah
    const [showPembahasanTour, setShowPembahasanTour] = useState(false);

    const finishPembahasanTour = () => {
        setShowPembahasanTour(false);
        localStorage.setItem('edvora_has_seen_pembahasan_tour', 'true');
    };

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('edvora_has_seen_ujian_tour');
        if (!hasSeenTour) {
            setCurrentStep(1);
        }
    }, []);

    const finishTour = () => {
        setCurrentStep(null);
        localStorage.setItem('edvora_has_seen_ujian_tour', 'true');
    };

    // Menempatkan tombol navigasi yang sedang dipandu di atas lapisan gelap.
    // Style asli dipulihkan ketika walkthrough berpindah langkah atau selesai.
    useEffect(() => {
        if (currentStep !== 4 && currentStep !== 5) return;

        const root = document.getElementById('tour-tombol-navigasi');
        if (!root) return;

        const buttons = Array.from(root.querySelectorAll('button'));
        const targets = buttons.filter((button) => {
            const label = (button.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (currentStep === 4) return label.includes('sebelumnya') || label.includes('lanjutkan');
            return label.includes('keluar halaman');
        });

        const previousStyles = targets.map((button) => button.getAttribute('style'));
        targets.forEach((button) => {
            Object.assign(button.style, {
                position: 'relative',
                zIndex: '60',
                opacity: '1',
                filter: 'none',
                color: '#ffffff',
                backgroundColor: currentStep === 4 ? '#4c78dd' : '#ef6262',
                border: 'none',
                boxShadow: currentStep === 4
                    ? '0 3px 10px rgba(76,120,221,.22), 0 0 13px 3px rgba(76,120,221,.48)'
                    : '0 3px 10px rgba(244,63,94,.20), 0 0 14px 3px rgba(244,63,94,.48)',
            });
        });

        return () => {
            targets.forEach((button, index) => {
                const style = previousStyles[index];
                if (style === null) button.removeAttribute('style');
                else button.setAttribute('style', style);
            });
        };
    }, [currentStep]);

    // Posisi popover dihitung dari posisi tombol aktual agar petunjuk tepat menunjuk target
    // pada berbagai ukuran layar dan tidak bergantung pada persentase posisi viewport.
    useEffect(() => {
        if (currentStep !== 4 && currentStep !== 5) return;

        const root = document.getElementById('tour-tombol-navigasi');
        if (!root) return;

        const findButton = (keyword: string) =>
            Array.from(root.querySelectorAll('button')).find((button) =>
                (button.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase().includes(keyword),
            );

        const updatePositions = () => {
            // Simpan posisi seluruh card navigasi untuk membuat lubang pada backdrop.
            // Dengan begitu card tidak ikut diredupkan meskipun berada di dalam sidebar.
            setNavigationSpotlightRect(root.getBoundingClientRect());
            const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
            const previous = findButton('sebelumnya')?.getBoundingClientRect();
            const next = findButton('lanjutkan')?.getBoundingClientRect();
            const exit = findButton('keluar halaman')?.getBoundingClientRect();

            if (currentStep === 4 && previous && next) {
                const prevWidth = 280;
                const nextWidth = 250;
                const prevLeft = clamp(previous.left - 155, 12, window.innerWidth - prevWidth - 12);
                const nextLeft = clamp(next.right - nextWidth + 8, 12, window.innerWidth - nextWidth - 12);
                setTourPopoverPosition((previousPosition) => ({
                    ...previousPosition,
                    previous: {
                        left: prevLeft,
                        top: clamp(previous.top - 100, 12, window.innerHeight - 120),
                        arrow: clamp(previous.left + previous.width / 2 - prevLeft - 9, 18, prevWidth - 36),
                    },
                    next: {
                        left: nextLeft,
                        top: clamp(next.bottom + 12, 12, window.innerHeight - 165),
                        arrow: clamp(next.left + next.width / 2 - nextLeft - 9, 18, nextWidth - 36),
                    },
                }));
            }

            if (currentStep === 5 && exit) {
                const exitWidth = 430;
                const exitLeft = clamp(exit.left - 75, 12, window.innerWidth - exitWidth - 12);
                setTourPopoverPosition((previousPosition) => ({
                    ...previousPosition,
                    exit: {
                        left: exitLeft,
                        top: clamp(exit.top - 195, 12, window.innerHeight - 195),
                        arrow: clamp(exit.left + exit.width / 2 - exitLeft - 9, 18, exitWidth - 36),
                    },
                }));
            }
        };

        updatePositions();
        window.addEventListener('resize', updatePositions);
        return () => window.removeEventListener('resize', updatePositions);
    }, [currentStep]);

    const form = useForm({
        ...konfigurasi,
        jawaban: jawabanTersimpan.map((j) => ({
            soalId: j.soalId,
            opsiIds: j.opsiIds,
            jawabanIsian: j.jawabanIsian ?? '',
            pilihanKolom: j.pilihanKolom ?? {},
        })) as Jawaban[],
    });

    const [indeksAktif, setIndeksAktif] = useState(0);
    const [pilihanSementara, setPilihanSementara] = useState<Record<string | number, IdOpsi[]>>({});
    const [isianSementara, setIsianSementara] = useState<Record<string | number, string>>({});
    const [kolomSementara, setKolomSementara] = useState<Record<string | number, Record<string, number>>>({});
    const [hasilJawaban, setHasilJawaban] = useState<Record<string | number, UmpanBalikJawaban>>(() =>
        Object.fromEntries(jawabanTersimpan.map((j) => [j.soalId, j.hasil])),
    );
    const [mengirim, setMengirim] = useState(false);
    const [pesanKirim, setPesanKirim] = useState<{ soalId: IdOpsi; pesan: string } | null>(null);
    const [hintTerbuka, setHintTerbuka] = useState<Record<string | number, string>>(hintAwal);
    const [memuatHint, setMemuatHint] = useState(false);
    const [pesanHint, setPesanHint] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalAktif>(null);

    const soal = soalList[indeksAktif];
    const isian = soal.tipe === 'isian_singkat';
    const tabel = soal.tipe === 'majemuk_tabel';
    const cariJawaban = (soalId: IdOpsi): Jawaban | undefined => form.data.jawaban.find((j: Jawaban) => j.soalId === soalId);
    const tersimpan = cariJawaban(soal.id);
    const terkunci = !simulasi && tersimpan !== undefined;
    const opsiTerpilih: IdOpsi[] = (simulasi || terkunci ? tersimpan?.opsiIds : pilihanSementara[soal.id]) ?? [];
    const teksIsian: string = (simulasi || terkunci ? tersimpan?.jawabanIsian : isianSementara[soal.id]) ?? '';
    const pilihanKolom: Record<string, number> = (simulasi || terkunci ? tersimpan?.pilihanKolom : kolomSementara[soal.id]) ?? {};
    const belumDiisi = isian
        ? teksIsian.trim() === ''
        : tabel
            ? soal.opsi_jawaban.some((o: OpsiJawaban) => pilihanKolom[String(o.id)] === undefined)
            : opsiTerpilih.length === 0;

    const simpanJawaban = (soalId: IdOpsi, opsiIds: IdOpsi[], jawabanIsian = '', pilihanKolom: Record<string, number> = {}) => {
        const lainnya = form.data.jawaban.filter((j: Jawaban) => j.soalId !== soalId);
        const kosong = opsiIds.length === 0 && jawabanIsian.trim() === '' && Object.keys(pilihanKolom).length === 0;
        form.setData('jawaban', kosong ? lainnya : [...lainnya, { soalId, opsiIds, jawabanIsian, pilihanKolom }]);
    };

    const ubahIsian = (teks: string) => {
        if (simulasi) simpanJawaban(soal.id, [], teks);
        else setIsianSementara((p) => ({ ...p, [soal.id]: teks }));
    };

    const kirimSatuJawaban = async () => {
        const soalId = soal.id;
        const opsiIds = isian || tabel ? [] : opsiTerpilih;
        const jawabanIsian = isian ? teksIsian : '';
        const kolom = tabel ? pilihanKolom : {};
        setMengirim(true);
        setPesanKirim(null);
        try {
            const { data } = await axios.post<UmpanBalikJawaban>(route('latihan.jawab'), {
                sesiId: konfigurasi.sesiId,
                soalId,
                opsiIds,
                jawabanIsian: isian ? jawabanIsian : null,
                pilihanKolom: tabel ? kolom : null,
            });
            setHasilJawaban((p) => ({ ...p, [soalId]: data }));
            simpanJawaban(soalId, opsiIds, jawabanIsian, kolom);

            // CEK JIKA JAWABAN SALAH & BELUM PERNAH LIHAT TUR PEMBAHASAN
            const hasSeenPembahasanTour = localStorage.getItem('edvora_has_seen_pembahasan_tour');
            if (!data.benar && !hasSeenPembahasanTour) {
                setShowPembahasanTour(true);
            }
        } catch (e) {
            setPesanKirim({ soalId, pesan: pesanGagal(e, 'menyimpan jawaban') });
        } finally {
            setMengirim(false);
        }
    };

    const bukaHint = async () => {
        const soalId = soal.id;
        setMemuatHint(true);
        setPesanHint(null);
        try {
            const { data } = await axios.post(route('latihan.hint'), { sesiId: konfigurasi.sesiId, soalId });
            setHintTerbuka((p) => ({ ...p, [soalId]: data.hint }));
        } catch (e) {
            setPesanHint(pesanGagal(e, 'membuka hint'));
        } finally {
            setMemuatHint(false);
        }
    };

    const pilihOpsi = (opsi: OpsiJawaban) => {
        const baru =
            soal.tipe === 'benar_salah'
                ? opsiTerpilih.includes(opsi.id)
                    ? opsiTerpilih.filter((id) => id !== opsi.id)
                    : [...opsiTerpilih, opsi.id]
                : [opsi.id];

        if (simulasi) simpanJawaban(soal.id, baru);
        else setPilihanSementara((p) => ({ ...p, [soal.id]: baru }));
    };

    const pilihKolom = (opsi: OpsiJawaban, nomorKolom: number) => {
        const baru = { ...pilihanKolom, [String(opsi.id)]: nomorKolom };

        if (simulasi) simpanJawaban(soal.id, [], '', baru);
        else setKolomSementara((p) => ({ ...p, [soal.id]: baru }));
    };

    const statusJawabanSoal = (indeks: number): StatusJawabanSoal => {
        const hasil = hasilJawaban[soalList[indeks].id];
        return hasil === undefined ? null : hasil.benar ? 'benar' : 'salah';
    };

    const statusOpsi = (opsi: OpsiJawaban): StatusOpsi => {
        const dipilih = opsiTerpilih.includes(opsi.id);
        const kunciOpsiIds = hasilJawaban[soal.id]?.kunciOpsiIds;
        if (terkunci && kunciOpsiIds) {
            const opsiKunci = kunciOpsiIds.includes(String(opsi.id));
            if (soal.tipe === 'benar_salah') return opsiKunci ? 'benar' : 'salah';
            if (opsiKunci) return 'benar';
            if (dipilih) return 'salah';
            return 'default';
        }
        return dipilih ? 'selected' : 'default';
    };

    const kirimJawaban = (tujuan: string) => {
        if (form.processing) return;
        const aksi = tujuan === route('dashboard') ? 'keluar' : 'selesai';
        form.transform((data) => ({ ...data, aksi }));
        form.post(route('latihan.simpan'));
    };

    const teksKunci = (): string | null => hasilJawaban[soal.id]?.kunci ?? null;
    const namaMode = { fleksibel: 'Fleksibel', simulasi: 'Simulasi', remedial: 'Remedial' }[konfigurasi.mode as string] ?? '';
    const statusAktif = terkunci ? statusJawabanSoal(indeksAktif) : null;

    const tombolBesar =
        'h-11 min-w-[200px] rounded-[10px] px-6 text-sm font-semibold shadow-panel transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:active:translate-y-0 md:min-w-[240px] lg:min-w-[300px]';
    const tombolModal = 'h-9 min-w-[100px] rounded-[10px] px-5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 disabled:opacity-50';
    const kelasModal = { backdropClassName: 'bg-siswa-laman-akhir/70 backdrop-blur-[2px]', panelClassName: 'rounded-[24px]' };

    return (
        <LatihanLayout
            breadcrumb={[
                { label: 'Latihan Soal', href: route('latihan.index') },
                {
                    label: konfigurasi.namaSubtes,
                    href: subtes?.kode_subtes ? route('latihan.mode', { subtes: subtes.kode_subtes, tab: konfigurasi.mode }) : undefined,
                },
                ...(namaMode ? [`Mode ${namaMode}`] : []),
            ]}
            sidebar={
                <div className={`relative space-y-4 font-poppins ${currentStep === 4 || currentStep === 5 ? 'z-[31]' : ''}`}>
                    {/* STEP 4: HIGHLIGHT PANEL NAVIGASI SOAL */}
                    <div
                        id="tour-tombol-navigasi"
                        className={`transition-all duration-300 relative ${currentStep === 4
                            ? 'z-[33] scale-[1.02] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white p-1'
                            : currentStep === 5
                                ? 'z-[33]'
                                : ''
                            }`}
                    >
                        <NavigasiSoal
                            judul={konfigurasi.namaSubtes}
                            jumlahSoal={soalList.length}
                            indeksAktif={indeksAktif}
                            sudahDijawab={(i) => cariJawaban(soalList[i].id) !== undefined}
                            statusJawaban={simulasi ? undefined : statusJawabanSoal}
                            onPilih={(i) => {
                                // Mencegah pindah nomor soal saat Step 4 atau 5 tour aktif
                                if (currentStep === 4 || currentStep === 5) return;
                                setIndeksAktif(i);
                            }}
                            aksiBawah={
                                simulasi ? (
                                    <button
                                        type="button"
                                        onClick={() => setModal('selesai')}
                                        disabled={form.processing}
                                        className="h-10 w-full rounded-lg bg-ujian-hijau text-[13px] font-semibold text-white shadow-panel transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md enabled:active:translate-y-0 disabled:opacity-60"
                                    >
                                        Simpan Jawaban
                                    </button>
                                ) : (
                                    /* STEP 5: HIGHLIGHT KHUSUS TOMBOL KELUAR HALAMAN (MENYALA MERAH TERANG) */
                                    <div
                                        id="tour-keluar-halaman"
                                        className={`transition-all duration-300 relative ${currentStep === 5
                                            ? 'z-[50] scale-[1.03] rounded-xl shadow-[0_0_16px_4px_rgba(244,63,94,0.42)]'
                                            : ''
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                // Mencegah aksi keluar saat Step 5 tour aktif
                                                if (currentStep === 5) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                setModal('keluar');
                                            }}
                                            className={`h-10 w-full rounded-lg bg-ujian-merah text-[13px] font-semibold text-white shadow-panel transition duration-200 ${currentStep === 5 ? 'cursor-default opacity-100' : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'
                                                }`}
                                        >
                                            ← Keluar Halaman
                                        </button>
                                    </div>
                                )
                            }
                        />
                    </div>
                </div>
            }
        >
            <Head title={`Latihan ${konfigurasi.namaSubtes}`} />

            {/* BACKDROP TOUR: sisakan seluruh area Card Navigasi Soal tetap terang pada Step 4/5. */}
            {(currentStep !== null || showPembahasanTour) && (currentStep === 4 || currentStep === 5) && navigationSpotlightRect ? (() => {
                const pad = 8;
                const left = Math.max(0, navigationSpotlightRect.left - pad);
                const top = Math.max(0, navigationSpotlightRect.top - pad);
                const right = Math.min(window.innerWidth, navigationSpotlightRect.right + pad);
                const bottom = Math.min(window.innerHeight, navigationSpotlightRect.bottom + pad);
                return (
                    <>
                        <div className="fixed left-0 top-0 z-[30] bg-slate-900/60 transition-opacity duration-300" style={{ width: '100vw', height: top }} />
                        <div className="fixed left-0 z-[30] bg-slate-900/60 transition-opacity duration-300" style={{ top, width: left, height: bottom - top }} />
                        <div className="fixed right-0 z-[30] bg-slate-900/60 transition-opacity duration-300" style={{ top, width: Math.max(0, window.innerWidth - right), height: bottom - top }} />
                        <div className="fixed bottom-0 left-0 z-[30] bg-slate-900/60 transition-opacity duration-300" style={{ top: bottom, width: '100vw', height: Math.max(0, window.innerHeight - bottom) }} />
                    </>
                );
            })() : (currentStep !== null || showPembahasanTour) ? (
                <div className="fixed inset-0 z-[30] bg-slate-900/60 transition-opacity duration-300" />
            ) : null}

            {/* STEP 4: PETUNJUK TERPISAH UNTUK TOMBOL SEBELUMNYA DAN LANJUTKAN */}
            {currentStep === 4 && (
                <>
                    {/* Petunjuk tombol Sebelumnya */}
                    <div style={{ left: tourPopoverPosition.previous.left, top: tourPopoverPosition.previous.top, width: 280 }} className="fixed z-[1000] max-w-[calc(100vw-1.5rem)] rounded-[18px] border border-slate-100 bg-white px-5 py-4 shadow-2xl animate-fade-in font-poppins pointer-events-auto">
                        <div style={{ left: tourPopoverPosition.previous.arrow }} className="absolute -bottom-2 h-0 w-0 border-x-[9px] border-x-transparent border-t-[10px] border-t-white" />
                        <p className="text-[13px] font-medium leading-[1.35] text-[#2b4c7e]">
                            Klik <strong className="font-bold text-[#1a365d]">Sebelumnya</strong> untuk kembali ke soal sebelumnya
                        </p>
                    </div>

                    {/* Petunjuk tombol Lanjutkan + navigasi langkah tur */}
                    <div style={{ left: tourPopoverPosition.next.left, top: tourPopoverPosition.next.top, width: 250 }} className="fixed z-[1000] max-w-[calc(100vw-1.5rem)] rounded-[18px] border border-slate-100 bg-white px-5 py-4 shadow-2xl animate-fade-in font-poppins pointer-events-auto">
                        <div style={{ left: tourPopoverPosition.next.arrow }} className="absolute -top-2 h-0 w-0 border-x-[9px] border-x-transparent border-b-[10px] border-b-white" />
                        <p className="text-[13px] font-medium leading-[1.35] text-[#2b4c7e]">
                            Klik <strong className="font-bold text-[#1a365d]">Lanjutkan</strong> untuk mengerjakan soal selanjutnya
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <button
                                onClick={finishTour}
                                className="rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold text-[#3b5998] shadow-sm transition hover:bg-slate-50 cursor-pointer"
                            >
                                Lewati
                            </button>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentStep(3)}
                                    aria-label="Langkah sebelumnya"
                                    className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold leading-none text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                >
                                    ‹
                                </button>
                                <span className="text-[11px] font-bold text-[#3b5998]">4 / 5</span>
                                <button
                                    onClick={() => setCurrentStep(5)}
                                    aria-label="Langkah berikutnya"
                                    className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold leading-none text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* POPOVER STEP 5 / 5 (Presisi Menyorot Tombol Keluar Halaman) */}
            {currentStep === 5 && (
                <div style={{ left: tourPopoverPosition.exit.left, top: tourPopoverPosition.exit.top, width: 430 }} className="fixed z-[1000] max-w-[calc(100vw-1.5rem)] rounded-[22px] bg-white px-6 py-5 shadow-2xl animate-fade-in border border-slate-100 font-poppins pointer-events-auto">
                    {/* Panah diarahkan tepat ke tengah tombol Keluar Halaman */}
                    <div style={{ left: tourPopoverPosition.exit.arrow }} className="absolute -bottom-3 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />

                    <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                        Klik tombol <strong className="font-bold text-[#1a365d]">Keluar Halaman</strong> jika ingin meninggalkan sesi pengerjaan. Progresmu sudah tersimpan!
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
                                onClick={() => setCurrentStep(4)}
                                className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                            >
                                ‹
                            </button>
                            <span className="text-xs font-bold text-[#3b5998]">5 / 5</span>
                            <button
                                disabled
                                className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-400 cursor-not-allowed"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ArenaPengerjaan
                judul={`Soal ${indeksAktif + 1} dari ${soalList.length}`}
                aksiHeader={
                    simulasi && konfigurasi.waktuPengerjaanMenit ? (
                        <TimerMundur durasiMenit={konfigurasi.waktuPengerjaanMenit} onHabis={() => kirimJawaban(route('latihan.hasil', { ...konfigurasi }))} />
                    ) : null
                }
                footerKiri={
                    !simulasi && !terkunci && (
                        <div
                            id="tour-tombol-hint"
                            className={`transition-all duration-300 relative ${currentStep === 3
                                ? 'z-[40] scale-[1.05] rounded-[12px] bg-amber-100 outline-4 outline-white shadow-[0_0_35px_8px_rgba(245,158,11,0.85)]'
                                : ''
                                }`}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    // Mencegah klik membuka modal hint saat Step 3 tur sedang aktif
                                    if (currentStep === 3) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    setPesanHint(null);
                                    setModal('hint');
                                }}
                                disabled={!soal.ada_hint} // Hanya disabled jika soal tidak punya hint
                                title={soal.ada_hint ? undefined : 'Soal ini belum punya hint'}
                                className={`flex h-11 items-center gap-1.5 rounded-[10px] border border-siswa-hint-garis bg-siswa-hint-latar px-5 text-sm font-semibold text-siswa-hint-teks shadow-panel transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md ${currentStep === 3 ? 'cursor-default opacity-100' : ''
                                    }`}
                            >
                                <IkonLampu className="h-[18px] w-[18px]" /> Hint
                            </button>

                            {/* POPOVER STEP 3 / 5 */}
                            {currentStep === 3 && (
                                <div className="absolute left-0 -top-44 z-[60] w-[320px] max-w-[calc(100vw-2rem)] rounded-[18px] bg-white p-5 shadow-2xl animate-fade-in border border-slate-100 font-poppins pointer-events-auto">
                                    <div className="absolute -bottom-3 left-8 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />

                                    <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                        <strong className="font-bold text-[#1a365d]">Bingung menjawab?</strong> Gunakan Hint untuk mendapatkan petunjuk!
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
                                                onClick={() => setCurrentStep(2)}
                                                className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                            >
                                                ‹
                                            </button>
                                            <span className="text-xs font-bold text-[#3b5998]">3 / 5</span>
                                            <button
                                                onClick={() => setCurrentStep(4)}
                                                className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                            >
                                                ›
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
                footerKanan={
                    simulasi ? null : !terkunci ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (belumDiisi || mengirim) return;
                                kirimSatuJawaban();
                            }}
                            disabled={belumDiisi || mengirim}
                            className={`${tombolBesar} ${belumDiisi ? 'bg-siswa-ujian-redup text-white/80 shadow-none' : 'bg-ujian-hijau text-white'}`}
                        >
                            {mengirim ? 'Menyimpan…' : 'Simpan Jawaban'}
                        </button>
                    ) : (
                        <button type="button" onClick={() => setModal('selesai')} className={`${tombolBesar} bg-ujian-biru text-white`}>
                            Selesaikan Latihan
                        </button>
                    )
                }
            >
                <div key={soal.id} className="animate-muncul-halus">
                    {/* STEP 1: TEKS SOAL */}
                    <div
                        id="tour-teks-soal"
                        className={`transition-all duration-300 relative ${currentStep === 1
                            ? 'z-[40] scale-[1.01] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white p-2'
                            : ''
                            }`}
                    >
                        <KartuSoal nomor={indeksAktif + 1} teksSoal={soal.teks_soal} gambarUrl={soal.gambar_soal} />

                        {/* POPOVER STEP 1 / 5 (Diturunkan sedikit agar melayang rapi di bawah kartu soal) */}
                        {currentStep === 1 && (
                            <div className="absolute right-6 -bottom-44 z-[60] w-[320px] max-w-[calc(100vw-2rem)] rounded-[18px] bg-white p-5 shadow-2xl animate-fade-in border border-slate-100 font-poppins pointer-events-auto">
                                {/* Panah Atas Menunjuk ke Kartu Soal */}
                                <div className="absolute -top-3 right-12 h-0 w-0 border-x-8 border-x-transparent border-b-8 border-b-white" />

                                <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                    Ini adalah <strong className="font-bold text-[#1a365d]">soal yang akan kamu kerjakan</strong>. Baca dan teliti hingga kamu memahami maksud dari soal!
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
                                            className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 text-xs font-bold text-slate-400 cursor-not-allowed"
                                        >
                                            ‹
                                        </button>
                                        <span className="text-xs font-bold text-[#3b5998]">1 / 5</span>
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* STEP 2: OPSI JAWABAN */}
                    <div
                        id="tour-opsi-jawaban"
                        className={`mt-3 transition-all duration-300 relative ${currentStep === 2
                            ? 'z-[40] scale-[1.01] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white p-2'
                            : ''
                            }`}
                    >
                        <div className="space-y-2.5">
                            {tabel ? (
                                <TabelMajemuk
                                    kolom={soal.kolom_tabel ?? []}
                                    pernyataan={soal.opsi_jawaban}
                                    pilihan={pilihanKolom}
                                    onPilih={pilihKolom}
                                    terkunci={terkunci}
                                    kunci={hasilJawaban[soal.id]?.kunciKolom}
                                />
                            ) : (
                                soal.opsi_jawaban.map((opsi: any) => (
                                    <TombolOpsi
                                        key={opsi.id}
                                        opsi={opsi}
                                        status={statusOpsi(opsi)}
                                        disabled={terkunci}
                                        onPilih={pilihOpsi}
                                        kotakCentang={soal.tipe === 'benar_salah'}
                                        dipilih={opsiTerpilih.includes(opsi.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* POPOVER STEP 2 / 5 (Dinaikkan sedikit ke atas agar tidak menutupi Opsi A) */}
                        {currentStep === 2 && (
                            <div className="absolute right-12 -top-44 z-[60] w-[320px] max-w-[calc(100vw-2rem)] rounded-[18px] bg-white p-5 shadow-2xl animate-fade-in border border-slate-100 font-poppins pointer-events-auto">
                                {/* Panah Bawah Menunjuk ke Opsi Jawaban */}
                                <div className="absolute -bottom-3 right-12 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />

                                <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                    <strong className="font-bold text-[#1a365d]">Pilih jawaban</strong> yang menurutmu paling tepat dan periksa kembali!
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
                                            className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                        >
                                            ‹
                                        </button>
                                        <span className="text-xs font-bold text-[#3b5998]">2 / 5</span>
                                        <button
                                            onClick={() => setCurrentStep(3)}
                                            className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4c78dd] text-xs font-bold text-white shadow-md transition hover:bg-[#3b5998] cursor-pointer"
                                        >
                                            ›
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {isian && !hasilJawaban[soal.id] && (
                        <input
                            type="text"
                            value={teksIsian}
                            onChange={(e) => ubahIsian(e.target.value)}
                            disabled={terkunci || mengirim}
                            maxLength={100}
                            placeholder="Tulis Jawabanmu Disini..."
                            aria-label="Jawaban isian singkat"
                            className="mt-3 h-11 w-full rounded-[10px] border-transparent bg-white px-4 text-sm font-medium text-siswa-judul shadow-panel transition duration-200 placeholder:text-siswa-teks-redup focus:border-edvora-primary focus:ring-2 focus:ring-edvora-primary/30 disabled:opacity-60"
                        />
                    )}

                    {isian && hasilJawaban[soal.id] && (
                        <div
                            className={`mt-3 flex min-h-11 animate-muncul-halus items-center justify-between gap-3 rounded-[10px] px-4 py-2.5 text-sm font-semibold text-white shadow-panel ${hasilJawaban[soal.id].benar ? 'bg-ujian-hijau' : 'bg-ujian-merah'
                                }`}
                        >
                            <span className="break-all">{teksIsian}</span>
                            <span className="flex shrink-0 items-center gap-1.5 font-medium">
                                <IkonHasil benar={hasilJawaban[soal.id].benar} />
                                {hasilJawaban[soal.id].benar ? 'Benar' : 'Salah'}
                            </span>
                        </div>
                    )}
                    {pesanKirim && pesanKirim.soalId === soal.id && (
                        <p role="alert" className="mt-2 text-sm text-siswa-umpan-salah-teks">
                            {pesanKirim.pesan}
                        </p>
                    )}

                    {terkunci && (
                        <div
                            id="tour-kartu-pembahasan"
                            className={`transition-all duration-300 relative ${showPembahasanTour
                                ? 'z-[40] scale-[1.01] rounded-3xl outline-4 outline-white shadow-[0_0_35px_8px_rgba(66,153,225,0.85)] bg-white p-1'
                                : ''
                                }`}
                        >
                            <KartuPembahasan
                                status={statusAktif ?? 'kosong'}
                                kunci={teksKunci()}
                                pembahasan={hasilJawaban[soal.id]?.pembahasan ?? ''}
                                gambar={hasilJawaban[soal.id]?.gambarPembahasan ?? null}
                            />

                            {/* POPOVER TUR PEMBAHASAN (Tampil Saat Salah Menjawab Pertama Kali) */}
                            {showPembahasanTour && (
                                <div className="absolute left-1/2 -top-40 z-[60] w-[360px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[18px] bg-white p-5 shadow-2xl animate-fade-in border border-slate-100 font-poppins pointer-events-auto">
                                    {/* Panah Bawah Menunjuk ke Kartu Pembahasan */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-white" />

                                    <p className="text-sm font-medium leading-relaxed text-[#2b4c7e]">
                                        Yuk, <strong className="font-bold text-[#1a365d]">pelajari pembahasannya!</strong> Kamu bisa melihat kunci jawaban dan memahami cara mendapatkan jawaban yang benar
                                    </p>

                                    <div className="mt-5 flex justify-end">
                                        <button
                                            onClick={finishPembahasanTour}
                                            className="rounded-full bg-gradient-to-r from-[#4c78dd] to-[#3b5998] px-7 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/30 transition hover:opacity-95 cursor-pointer"
                                        >
                                            Selesai
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ArenaPengerjaan>

            {/* MODAL HINT */}
            <Modal show={modal === 'hint'} maxWidth="md" onClose={() => setModal(null)} {...kelasModal}>
                <div className="p-6 font-poppins text-siswa-judul md:px-8 md:py-7">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                        <IkonLampu className="h-6 w-6 text-[#D4A017]" /> Hint
                    </h3>
                    {hintTerbuka[soal.id] !== undefined ? (
                        <div className="mt-2 text-[15px] font-medium leading-relaxed text-siswa-teks">
                            <TeksMatematika teks={hintTerbuka[soal.id]} />
                        </div>
                    ) : (
                        <p className="mt-2 text-[15px] font-medium leading-relaxed text-siswa-teks">
                            Kalau jawabanmu benar setelah membuka hint, XP dan poin soal ini dihitung setengah, begitu juga nilainya untuk skor topik.
                        </p>
                    )}
                    {pesanHint && (
                        <p role="alert" className="mt-2 text-sm text-siswa-umpan-salah-teks">
                            {pesanHint}
                        </p>
                    )}
                    <div className="mt-5 flex justify-end gap-2">
                        {hintTerbuka[soal.id] !== undefined ? (
                            <button type="button" onClick={() => setModal(null)} className={`${tombolModal} bg-ujian-biru text-white shadow-panel`}>
                                Kembali
                            </button>
                        ) : (
                            <>
                                <button type="button" onClick={() => setModal(null)} className={`${tombolModal} border border-siswa-teks/40 bg-white text-siswa-judul`}>
                                    Batal
                                </button>
                                <button type="button" onClick={bukaHint} disabled={memuatHint} className={`${tombolModal} bg-ujian-biru text-white shadow-panel`}>
                                    {memuatHint ? 'Membuka…' : 'Buka Hint'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </Modal>

            {/* MODAL KELUAR */}
            <Modal show={modal === 'keluar'} maxWidth="md" onClose={() => setModal(null)} {...kelasModal}>
                <div className="p-6 font-poppins md:px-8 md:py-7">
                    <h3 className="text-xl font-semibold text-siswa-umpan-salah-teks">Keluar</h3>
                    <p className="mt-2 text-[15px] font-medium leading-relaxed text-siswa-teks">
                        {konfigurasi.mode === 'remedial'
                            ? 'Sesi remedial ini akan dibatalkan dan jawabanmu tidak disimpan. Soal-soalnya akan muncul lagi di sesi remedial berikutnya.'
                            : 'Anda akan meninggalkan halaman latihan soal dan jawaban anda akan disimpan oleh sistem.'}
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setModal(null)} className={`${tombolModal} border border-siswa-teks/40 bg-white text-siswa-judul`}>
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={() => kirimJawaban(route('dashboard'))}
                            disabled={form.processing}
                            className={`${tombolModal} bg-ujian-merah text-white shadow-panel`}
                        >
                            Keluar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL SELESAI */}
            <Modal show={modal === 'selesai'} maxWidth="md" onClose={() => setModal(null)} {...kelasModal}>
                <div className="p-6 font-poppins md:px-8 md:py-7">
                    <h3 className="text-xl font-semibold text-siswa-umpan-benar-teks">{simulasi ? 'Yakin Menyimpan Jawaban?' : 'Selesaikan Sekarang'}</h3>
                    <p className="mt-2 text-[15px] font-medium leading-relaxed text-siswa-teks">
                        {simulasi
                            ? 'Jawaban akan dikirim dan sesi simulasi berakhir. Soal yang belum dijawab dihitung kosong.'
                            : 'Anda akan menyelesaikan latihan soal dan jawaban yang sudah diisi tidak dapat diubah kembali.'}
                    </p>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setModal(null)} className={`${tombolModal} border border-siswa-teks/40 bg-white text-siswa-judul`}>
                            {simulasi ? 'Tidak' : 'Batal'}
                        </button>
                        <button
                            type="button"
                            onClick={() => kirimJawaban(route('latihan.hasil', { ...konfigurasi }))}
                            disabled={form.processing}
                            className={`${tombolModal} bg-ujian-hijau text-white shadow-panel`}
                        >
                            {simulasi ? 'Iya' : 'Selesaikan'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* TOMBOL DEV MODE */}
            <button
                type="button"
                onClick={() => {
                    localStorage.removeItem('edvora_has_seen_ujian_tour');
                    window.location.reload();
                }}
                className="fixed bottom-5 right-5 z-[1010] flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl transition hover:bg-rose-700 active:scale-95 cursor-pointer"
            >
                🔄 Reset Tour Ujian (Dev Mode)
            </button>
        </LatihanLayout>
    );
}

function IkonLampu({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0012 3z" />
        </svg>
    );
}