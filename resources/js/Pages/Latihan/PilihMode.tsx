import { Head, router, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import BarisTopik from '@/Components/Latihan/BarisTopik';
import KartuInfoSubtes from '@/Components/Latihan/KartuInfoSubtes';
import KotakInfo from '@/Components/Latihan/KotakInfo';
import PanelMode from '@/Components/Latihan/PanelMode';
import PengaturJumlahSoal from '@/Components/Latihan/PengaturJumlahSoal';
import TabPilihMode from '@/Components/Latihan/TabMode';
import TombolMulai from '@/Components/Latihan/TombolMulai';
import LiveTutorMode from '@/Components/Tur/LiveTutorMode';
import { LabelPenguasaan } from '@/types/latihan';

type TabMode = 'fleksibel' | 'simulasi' | 'remedial';

interface TopikPilihan {
    id: string;
    nama: string;
    tahap: 1 | 2 | 3;
    label: LabelPenguasaan;
    persen: number; // 0–100, progres tahap
    direkomendasikan: boolean; // termasuk 3 rekomendasi teratas subtes ini
}

interface PilihModeProps {
    subtes: {
        id: string;
        kode: string | null;
        nama: string;
        deskripsi: string | null;
        jumlahTopik: number;
    };
    topikList: TopikPilihan[]; // topik yang punya soal, urut `urutan`
    batasSoal: { min: number; maks: number };
    simulasi: { jumlahSoal: number; waktuMenit: number };
    remedial: { jumlahSoal: number; batasSesi: number }; // jumlahSoal = semua soal remedial subtes ini
    tabAwal: TabMode; // tab yang terbuka pertama kali; dari Perkembangan bisa 'remedial' (?tab=)
    topikAwal: string | null; // dari Perkembangan: hanya topik ini yang tercentang (?topik=)
}

// Pilih Mode untuk satu subtes, mengikuti desain Figma node 665:6549 (Fleksibel), 667:6666 (Simulasi),
// 667:6769 (Remedial), dan 667:6718 (Remedial Belum Tersedia).
export default function PilihMode({ subtes, topikList, batasSoal, simulasi, remedial, tabAwal, topikAwal }: PilihModeProps) {
    // Kunjungan Inertia memasang ulang halaman, jadi nilai awal ini dibaca lagi setiap URL Pilih Mode dibuka.
    const [tab, setTab] = useState<TabMode>(tabAwal);
    // Default semua topik tercentang (UCS1); dari Perkembangan hanya topik yang diklik.
    const [topikDipilih, setTopikDipilih] = useState<string[]>(() => (topikAwal ? [topikAwal] : topikList.map((topik) => topik.id)));
    const [jumlahSoal, setJumlahSoal] = useState(batasSoal.min);
    const [memuat, setMemuat] = useState(false);

    // Pesan sekali tampil dari backend, mis. input tidak valid atau soal baru sudah habis.
    const { flash } = usePage();
    const pesanError = typeof flash.error === 'string' ? flash.error : null;

    // "Semua Topik" tercentang hanya bila semua topik tercentang; melepas satu topik ikut melepasnya.
    const semuaDipilih = topikList.length > 0 && topikDipilih.length === topikList.length;

    const pilihSemua = () => setTopikDipilih(semuaDipilih ? [] : topikList.map((topik) => topik.id));

    const pilihTopik = (id: string) =>
        setTopikDipilih((dipilih) => (dipilih.includes(id) ? dipilih.filter((x) => x !== id) : [...dipilih, id]));

    const ubahJumlahSoal = (selisih: number) =>
        setJumlahSoal((jumlah) => Math.min(batasSoal.maks, Math.max(batasSoal.min, jumlah + selisih)));

    // Soal dipilih server; klien hanya mengirim pilihan mode, topik, dan jumlah soal. Fleksibel memakai POST karena
    // langsung membuat sesi tersimpan (latihan.mulai); simulasi dan remedial dibuka lewat latihan.ujian.
    const mulai = (data: Record<string, unknown>) => {
        const muat = { onStart: () => setMemuat(true), onFinish: () => setMemuat(false) };

        if (data.mode === 'fleksibel') router.post(route('latihan.mulai'), { subtesId: subtes.id, ...data }, muat);
        else router.get(route('latihan.ujian'), { subtesId: subtes.id, ...data }, muat);
    };

    return (
        <>
            <Head title={`Pilih Mode - ${subtes.nama}`} />

            <div className="w-full pt-[18px] font-poppins">
                <div data-tur="mode-subtes">
                    <KartuInfoSubtes kode={subtes.kode} nama={subtes.nama} deskripsi={subtes.deskripsi} jumlahTopik={subtes.jumlahTopik} />
                </div>

                {pesanError && (
                    <div role="alert" className="mt-5 rounded-lg border border-[#E86565] bg-[#FDECEC] px-4 py-3 text-sm font-medium text-[#8A2B2B]">
                        {pesanError}
                    </div>
                )}

                <h2 className="mt-[31px] text-[20px] font-semibold leading-tight text-siswa-judul-seksi">Pilih Mode Latihan</h2>
                <p className="mt-[6px] text-[14px] font-medium leading-tight text-siswa-teks">Pilih mode latihan yang sesuai dengan kebutuhanmu!</p>

                <div className="mt-4" data-tur="mode-tab">
                    <TabPilihMode
                        aktif={tab}
                        onPilih={setTab}
                        daftar={[
                            { mode: 'fleksibel', label: 'Mode Fleksibel' },
                            { mode: 'simulasi', label: 'Mode Simulasi' },
                            // Abu-abu seperti di desain bila subtes ini belum punya soal remedial; tab tetap bisa dibuka.
                            { mode: 'remedial', label: 'Remedial', redup: remedial.jumlahSoal === 0 },
                        ]}
                    />
                </div>

                {/* key={tab}: isi dipasang ulang setiap ganti tab, jadi animasi muncul-halus diputar lagi.
                    Pilihan topik dan jumlah soal aman karena disimpan di state halaman ini, bukan di dalam panel. */}
                <div key={tab} className="animate-muncul-halus motion-reduce:animate-none">
                {tab === 'fleksibel' && (
                    <section className="mt-[14px]">
                        <div data-tur="mode-penjelasan">
                            <PanelMode
                                varian="fleksibel"
                                ikon={<img src="/images/ikon/mode-fleksibel.png" alt="" className="h-[95.188px] w-[53.917px] object-contain" />}
                                judul="Mode Fleksibel"
                                keterangan="Pilih topik dan jumlah soal sesuai kebutuhan. Pembahasan soal akan langsung muncul setelah kamu menyimpan jawaban."
                            />
                        </div>

                        <h3 className="mt-[14px] text-[20px] font-semibold leading-tight text-siswa-judul-seksi">Pilih Topik</h3>
                        <p className="mt-[6px] text-[14px] font-medium leading-tight text-siswa-teks">
                            Pilih satu atau beberapa topik yang ingin kamu kerjakan!
                        </p>

                        <div data-tur="mode-topik" className="mt-5 space-y-3 rounded-panel bg-siswa-panel-fleksibel py-[21px] pl-[25px] pr-6 shadow-kartu">
                            <BarisTopik label={`Semua Topik (${topikList.length} Topik)`} dipilih={semuaDipilih} onUbah={pilihSemua} />

                            {topikList.map((topik) => (
                                <BarisTopik
                                    key={topik.id}
                                    label={topik.nama}
                                    dipilih={topikDipilih.includes(topik.id)}
                                    onUbah={() => pilihTopik(topik.id)}
                                    direkomendasikan={topik.direkomendasikan}
                                />
                            ))}
                        </div>

                        <div className="mt-[21px]" data-tur="mode-jumlah">
                            <PengaturJumlahSoal
                                nilai={jumlahSoal}
                                bisaKurang={jumlahSoal > batasSoal.min}
                                bisaTambah={jumlahSoal < batasSoal.maks}
                                onKurang={() => ubahJumlahSoal(-1)}
                                onTambah={() => ubahJumlahSoal(1)}
                            />
                        </div>

                        <div className="mt-[18px]" data-tur="mode-mulai">
                            <TombolMulai
                                onClick={() => mulai({ mode: 'fleksibel', topikIds: topikDipilih, jumlahSoal })}
                                disabled={topikDipilih.length === 0 || memuat}
                            >
                                {topikDipilih.length === 0 ? 'Pilih minimal satu topik' : 'Mulai Mengerjakan →'}
                            </TombolMulai>
                        </div>
                    </section>
                )}

                {tab === 'simulasi' && (
                    <section className="mt-[14px] space-y-[18px]">
                        <div data-tur="mode-penjelasan">
                            <PanelMode
                                varian="simulasi"
                                ikon={<img src="/images/ikon/mode-simulasi.svg" alt="" width={74} height={74} />}
                                judul="Mode Simulasi"
                                keterangan="Kerjakan paket soal dengan waktu terbatas seperti UTBK. Pembahasan akan muncul setelah semua soal selesai dikerjakan atau waktu telah habis."
                            >
                                {/* 1 kolom saat sidebar tampil di layar sempit (md), 3 kolom di layar lebar. */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                                    <KotakInfo varian="simulasi" ikon="/images/ikon/soal.png" judul="Jumlah Soal" isi={`${simulasi.jumlahSoal} Soal`} />
                                    <KotakInfo
                                        varian="simulasi"
                                        ikon="/images/ikon/waktu.png"
                                        judul="Waktu Pengerjaan"
                                        isi={`${simulasi.waktuMenit.toLocaleString('id-ID')} Menit`}
                                    />
                                <KotakInfo varian="simulasi" ikon="/images/ikon/daftar.png" judul="Topik" isi={`Semua Topik (${subtes.jumlahTopik})`} />
                            </div>
                        </PanelMode>
                        </div>

                        <div data-tur="mode-mulai">
                            <TombolMulai onClick={() => mulai({ mode: 'simulasi' })} disabled={memuat} />
                        </div>
                    </section>
                )}

                {tab === 'remedial' &&
                    (remedial.jumlahSoal === 0 ? (
                        <section className="mt-[14px]">
                            <div data-tur="mode-penjelasan">
                                <PanelMode
                                    varian="terkunci"
                                    ikon={<img src="/images/ikon/gembok.png" alt="" className="h-[50.742px] w-[50.742px] object-contain" />}
                                    judul="Remedial Belum Tersedia!"
                                    keterangan="Tidak ada soal yang perlu diperbaiki pada subtes ini. Kerjakan soal mode fleksibel atau simulasi terlebih dahulu."
                                />
                            </div>
                        </section>
                    ) : (
                        <section className="mt-[14px] space-y-[18px]">
                            <div data-tur="mode-penjelasan">
                                <PanelMode
                                    varian="remedial"
                                    ikon={<img src="/images/ikon/mode-remedial.png" alt="" className="h-[67.543px] w-[64.557px] object-contain" />}
                                    judul="Mode Remedial"
                                    keterangan="Kerjakan ulang soal yang pernah kamu jawab salah pada subtes ini. Soal diambil dari topik yang masih perlu kamu kuasai."
                                >
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                                        <KotakInfo varian="remedial" ikon="/images/ikon/daftar.png" judul="Topik" isi="Semua topik" />
                                        <KotakInfo varian="remedial" ikon="/images/ikon/soal.png" judul="Jumlah Soal" isi={`${remedial.jumlahSoal} Soal`} />
                                    </div>
    
                                    {remedial.jumlahSoal > remedial.batasSesi && (
                                        <p className="mt-3 text-[12px] font-medium text-siswa-teks">
                                            Satu sesi berisi {remedial.batasSesi} soal yang paling lama menunggu. Sisanya dikerjakan di sesi berikutnya.
                                        </p>
                                    )}
                                </PanelMode>
                            </div>

                            <div data-tur="mode-mulai">
                                <TombolMulai onClick={() => mulai({ mode: 'remedial' })} disabled={memuat} />
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            <LiveTutorMode mode={tab} remedialTersedia={remedial.jumlahSoal > 0} />
        </>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah dari/ke Pilih Subtes.
PilihMode.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
