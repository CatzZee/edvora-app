import { Head, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useState } from 'react';
import LatihanLayout from '@/Components/Layouts/LatihanLayout';
import Modal from '@/Components/Modal';
import TurFitur, { LangkahTur } from '@/Components/Tur/TurFitur';
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
    // Dikirim server, tapi halaman pengerjaan tidak memakainya: breadcrumb di sini tanpa tautan.
    subtes?: any;
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

// Langkah tur pengerjaan soal. Atribut data-tur dipasang di JSX halaman ini.
const LANGKAH_SOAL: LangkahTur = {
    target: 'ujian-soal',
    posisi: 'bawah',
    teks: (
        <>
            Ini adalah <strong className="font-semibold">soal yang akan kamu kerjakan</strong>. Baca dan teliti hingga kamu memahami maksud dari soal!
        </>
    ),
};

const LANGKAH_OPSI: LangkahTur = {
    target: 'ujian-opsi',
    posisi: 'atas',
    teks: (
        <>
            <strong className="font-semibold">Pilih jawaban</strong> yang menurutmu paling tepat dan periksa kembali!
        </>
    ),
};

const LANGKAH_HINT: LangkahTur = {
    target: 'ujian-hint',
    posisi: 'atas',
    teks: (
        <>
            <strong className="font-semibold">Bingung menjawab?</strong> Gunakan Hint untuk mendapatkan petunjuk!
        </>
    ),
};

const LANGKAH_NAVIGASI: LangkahTur = {
    target: 'ujian-navigasi',
    posisi: 'bawah',
    teks: (
        <>
            Klik <strong className="font-semibold">Sebelumnya</strong> untuk kembali ke soal sebelumnya, dan{' '}
            <strong className="font-semibold">Lanjutkan</strong> untuk mengerjakan soal selanjutnya.
        </>
    ),
};

const LANGKAH_KELUAR: LangkahTur = {
    target: 'ujian-keluar',
    posisi: 'atas',
    teks: (
        <>
            Klik tombol <strong className="font-semibold">Keluar Halaman</strong> jika ingin meninggalkan sesi pengerjaan. Progresmu sudah tersimpan!
        </>
    ),
};

const LANGKAH_PEMBAHASAN: LangkahTur = {
    target: 'ujian-pembahasan',
    posisi: 'atas',
    teks: (
        <>
            Yuk, <strong className="font-semibold">pelajari pembahasannya!</strong> Kamu bisa melihat kunci jawaban dan memahami cara mendapatkan jawaban yang benar
        </>
    ),
};

export default function Ujian({ soalList, konfigurasi, jawabanTersimpan = [], hintTerbuka: hintAwal = {} }: UjianProps) {
    const simulasi = konfigurasi.mode === 'simulasi';

    // Tur utama dipasang lewat TurFitur di bagian bawah JSX. Penanda tur versi lama tetap dihormati
    // agar siswa yang sudah pernah melihatnya tidak melihat tur ini.
    const [turUtamaAktif] = useState(() => localStorage.getItem('edvora_has_seen_ujian_tour') === null);

    // Tur pembahasan muncul saat siswa pertama kali menjawab salah; `aktif` dimatikan setelah ditutup.
    const [showPembahasanTour, setShowPembahasanTour] = useState(false);
    const tutupPembahasanTour = useCallback(() => setShowPembahasanTour(false), []);

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

    // Mode fleksibel dan remedial (bukan simulasi): Keluar Halaman hanya ada selama masih ada soal yang belum
    // disimpan, dan Selesaikan Latihan baru muncul setelah SEMUA soal tersimpan.
    const semuaTerjawab = soalList.every((s) => cariJawaban(s.id) !== undefined);

    // Langkah hanya memuat elemen yang benar-benar tampil: Hint tidak ada di mode simulasi atau soal
    // terkunci, dan Keluar Halaman tidak ada di mode simulasi atau bila semua soal sudah dijawab.
    // Dihitung sekali supaya jumlah langkah tidak berubah di tengah tur.
    const [langkahTur] = useState<LangkahTur[]>(() => [
        LANGKAH_SOAL,
        LANGKAH_OPSI,
        ...(!simulasi && !terkunci ? [LANGKAH_HINT] : []),
        LANGKAH_NAVIGASI,
        ...(!simulasi && !semuaTerjawab ? [LANGKAH_KELUAR] : []),
    ]);

    const simpanJawaban =(soalId: IdOpsi, opsiIds: IdOpsi[], jawabanIsian = '', pilihanKolom: Record<string, number> = {}) => {
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
            // Selama mengerjakan, breadcrumb hanya penunjuk posisi: tanpa tautan supaya siswa tidak
            // keluar dari ujian lewat topbar dan kehilangan jawaban yang belum disimpan.
            breadcrumb={['Latihan Soal', konfigurasi.namaSubtes, ...(namaMode ? [`Mode ${namaMode}`] : [])]}
            tanpaTautan
            sidebar={
                <div className="relative space-y-4 font-poppins">
                    {/* Panel navigasi soal: disorot di langkah 4 tur */}
                    <div data-tur="ujian-navigasi">
                        <NavigasiSoal
                            judul={konfigurasi.namaSubtes}
                            jumlahSoal={soalList.length}
                            indeksAktif={indeksAktif}
                            sudahDijawab={(i) => cariJawaban(soalList[i].id) !== undefined}
                            statusJawaban={simulasi ? undefined : statusJawabanSoal}
                            onPilih={(i) => setIndeksAktif(i)}
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
                                ) : semuaTerjawab ? null : (
                                    /* Tombol keluar: disorot di langkah 5 tur */
                                    <div data-tur="ujian-keluar">
                                        <button
                                            type="button"
                                            onClick={() => setModal('keluar')}
                                            className="h-10 w-full rounded-lg bg-ujian-merah text-[13px] font-semibold text-white shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
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

            <ArenaPengerjaan
                judul={`Soal ${indeksAktif + 1} dari ${soalList.length}`}
                aksiHeader={
                    simulasi && konfigurasi.waktuPengerjaanMenit ? (
                        <TimerMundur durasiMenit={konfigurasi.waktuPengerjaanMenit} onHabis={() => kirimJawaban(route('latihan.hasil', { ...konfigurasi }))} />
                    ) : null
                }
                footerKiri={
                    !simulasi && !terkunci && (
                        <div data-tur="ujian-hint">
                            <button
                                type="button"
                                onClick={() => {
                                    setPesanHint(null);
                                    setModal('hint');
                                }}
                                disabled={!soal.ada_hint} // Hanya disabled jika soal tidak punya hint
                                title={soal.ada_hint ? undefined : 'Soal ini belum punya hint'}
                                className="flex h-11 items-center gap-1.5 rounded-[10px] border border-siswa-hint-garis bg-siswa-hint-latar px-5 text-sm font-semibold text-siswa-hint-teks shadow-panel transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-md"
                            >
                                <IkonLampu className="h-[18px] w-[18px]" /> Hint
                            </button>
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
                    ) : semuaTerjawab ? (
                        <button type="button" onClick={() => setModal('selesai')} className={`${tombolBesar} bg-ujian-biru text-white`}>
                            Selesaikan Latihan
                        </button>
                    ) : null
                }
            >
                <div key={soal.id} className="animate-muncul-halus">
                    {/* Kartu soal: disorot di langkah 1 tur */}
                    <div data-tur="ujian-soal">
                        <KartuSoal nomor={indeksAktif + 1} teksSoal={soal.teks_soal} gambarUrl={soal.gambar_soal} />
                    </div>

                    {/* Opsi jawaban: disorot di langkah 2 tur */}
                    <div data-tur="ujian-opsi" className="mt-3">
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
                        <div data-tur="ujian-pembahasan">
                            <KartuPembahasan
                                status={statusAktif ?? 'kosong'}
                                kunci={teksKunci()}
                                pembahasan={hasilJawaban[soal.id]?.pembahasan ?? ''}
                                gambar={hasilJawaban[soal.id]?.gambarPembahasan ?? null}
                            />
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

            <TurFitur kunci="ujian-pengerjaan" langkah={langkahTur} aktif={turUtamaAktif} />
            <TurFitur kunci="ujian-pembahasan" langkah={[LANGKAH_PEMBAHASAN]} aktif={showPembahasanTour} onTutup={tutupPembahasanTour} />
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