import { Head } from '@inertiajs/react';
import { ReactNode } from 'react';
import EditorLayout from '@/Components/Layouts/EditorLayout';
import InfoTooltip from '@/Components/Editor/InfoTooltip';

type Tingkat = 'mudah' | 'sedang' | 'sulit';

interface TopikKurang {
    kodeSubtes: string;
    topik: string;
    kurang: Partial<Record<Tingkat, number>>; // soal published yang masih dibutuhkan per tingkat
}

interface TopikHeatmap {
    kodeSubtes: string;
    topik: string;
    akurasi: number; // persen jawaban benar, 0–100
    jawaban: number;
}

interface PenguasaanSubtes {
    kode: string;
    nama: string;
    persen: number | null; // null = belum ada siswa dengan skor penguasaan di subtes ini
    siswa: number;
}

interface DataAnalitik {
    dihitungPada: string; // ISO; data diproses setiap hari pukul 00.00 WIB
    ringkasan: { published: number; draft: number; total: number; jumlahTopik: number; jumlahSubtes: number };
    stok: { topikKurang: TopikKurang[]; targetTingkat: number };
    heatmap: TopikHeatmap[]; // akurasi terendah dulu
    rentangHeatmap: { dari: string; sampai: string };
    penguasaan: PenguasaanSubtes[];
}

interface AnalitikProps {
    analitik: DataAnalitik | null; // null = data gagal dimuat (UCS9 2a)
}

const angka = (n: number) => n.toLocaleString('id-ID');
const tanggal = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

// Warna petak heatmap: merah = banyak siswa salah, kuning = sedang, hijau = sebagian besar benar.
function warnaAkurasi(akurasi: number): string {
    if (akurasi < 40) {
        return 'bg-siswa-umpan-salah text-siswa-umpan-salah-teks';
    }

    return akurasi < 70 ? 'bg-siswa-hint-latar text-siswa-hint-teks' : 'bg-siswa-umpan-benar text-siswa-umpan-benar-teks';
}

// Dashboard Analitik editor (desain "dashboard analitik", UCS9 Melihat Analitik Soal).
export default function Analitik({ analitik }: AnalitikProps) {
    return (
        <EditorLayout breadcrumb={['Dashboard Analitik']}>
            <Head title="Dashboard Analitik" />

            <div className="mb-6">
                <p className="text-lg text-siswa-teks">Analitik</p>
                <h1 className="mt-1 text-3xl font-semibold text-siswa-judul">Melihat Dashboard Analitik</h1>
                <p className="mt-1 text-lg text-siswa-teks">Pantau pemetaan siswa, ringkasan siswa, dan pemahaman siswa</p>
                {analitik && (
                    <p className="mt-1 text-xs text-siswa-teks">
                        Data diperbarui setiap hari pukul 00.00 WIB · terakhir {tanggal(analitik.dihitungPada)}, {jam(analitik.dihitungPada)} WIB
                    </p>
                )}
            </div>

            {analitik ? <IsiAnalitik data={analitik} /> : <GagalDimuat />}
        </EditorLayout>
    );
}

function IsiAnalitik({ data }: { data: DataAnalitik }) {
    const { ringkasan, stok } = data;
    // Satu desimal, supaya 99,7% tidak tampil sebagai 100%.
    const persenPublished = (ringkasan.total > 0 ? (ringkasan.published / ringkasan.total) * 100 : 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    // Rincian kekurangan tampil saat kartu Stok Soal disorot, mis. "PU · Pola Bilangan: kurang 1 sedang, 10 sulit".
    const rincianStok = stok.topikKurang
        .map((t) => `${t.kodeSubtes} · ${t.topik}: kurang ${Object.entries(t.kurang).map(([tingkat, n]) => `${n} ${tingkat}`).join(', ')}`)
        .join('\n');
    const adaPenguasaan = data.penguasaan.filter((s): s is PenguasaanSubtes & { persen: number } => s.persen !== null);
    const belumAda = data.penguasaan.filter((s) => s.persen === null).map((s) => s.kode);

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KartuAngka
                    label="Soal Published"
                    angka={ringkasan.published}
                    keterangan={`${persenPublished}% dari semua soal`}
                    latarIkon="bg-siswa-ikon-latihan text-siswa-subtes"
                    ikon={<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 12h6M10 16h6" />}
                    tooltip="Menampilkan jumlah soal yang telah diterbitkan dan dapat digunakan oleh siswa"
                />
                <KartuAngka
                    label="Jumlah Semua Soal"
                    angka={ringkasan.total}
                    keterangan={`${angka(ringkasan.jumlahTopik)} topik di ${angka(ringkasan.jumlahSubtes)} subtes`}
                    latarIkon="bg-siswa-ikon-tryout text-siswa-umpan-benar-teks"
                    ikon={<path d="M4 6h16M4 12h16M4 18h10" />}
                />
                <KartuAngka
                    label="Draft Soal"
                    angka={ringkasan.draft}
                    keterangan="Menunggu dipublish"
                    latarIkon="bg-siswa-hint-latar text-siswa-ubin-remedial"
                    ikon={<path d="M12 7v5l3 2M3.5 12a8.5 8.5 0 102.5-6M3 4v4h4" />}
                    tooltip="Menampilkan jumlah soal yang masih berstatus draft dan belum diterbitkan"
                />
                <KartuAngka
                    label="Stok Soal"
                    angka={stok.topikKurang.length}
                    keterangan={stok.topikKurang.length > 0 ? `topik < ${stok.targetTingkat} soal per tingkat` : `Semua topik ≥ ${stok.targetTingkat} per tingkat`}
                    judul={rincianStok || undefined}
                    latarIkon="bg-siswa-ikon-hover-fleksibel text-siswa-centang"
                    ikon={<path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />}
                />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <section className="rounded-kartu bg-white p-6 shadow-kartu">
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-siswa-judul">
                        <span>HeatMap Topik Tersulit</span>
                        <InfoTooltip text="Heatmap menunjukkan tingkat pemahaman siswa pada setiap topik. Semakin rendah persentasenya, semakin sulit topik tersebut dipahami siswa" />
                    </h2>
                    <p className="text-sm text-siswa-teks">
                        Akurasi seluruh siswa pada {tanggal(data.rentangHeatmap.dari)} – {tanggal(data.rentangHeatmap.sampai)}
                    </p>

                    {data.heatmap.length === 0 ? (
                        <p className="mt-6 text-sm text-siswa-teks">Belum ada topik dengan cukup jawaban pada rentang tanggal ini.</p>
                    ) : (
                        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                            {data.heatmap.map((t) => (
                                <div
                                    key={`${t.kodeSubtes}-${t.topik}`}
                                    title={`${angka(t.jawaban)} jawaban`}
                                    className={`rounded-lg px-3 py-3 ${warnaAkurasi(t.akurasi)}`}
                                >
                                    <p className="text-[11px] font-semibold">{t.kodeSubtes}</p>
                                    <p className="line-clamp-2 text-sm font-semibold" title={t.topik}>
                                        {t.topik}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">{t.akurasi.toLocaleString('id-ID')} %</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-kartu bg-white p-6 shadow-kartu">
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-siswa-judul">
                        <span>Rata-Rata Pemahaman Per Subtest</span>
                        <InfoTooltip text="Diagram ini menampilkan rata-rata pemahaman siswa pada setiap subtes. Gunakan data ini untuk mengevaluasi materi dan kualitas soal" />
                    </h2>
                    <p className="text-xs text-siswa-teks">Rata-rata pemahaman siswa per subtest</p>

                    {adaPenguasaan.length === 0 ? (
                        <p className="mt-6 text-sm text-siswa-teks">Belum ada siswa yang punya skor penguasaan.</p>
                    ) : (
                        <div className="mt-4">
                            <DiagramLingkaran data={adaPenguasaan} />
                            <p className="mt-3 text-[11px] leading-relaxed text-siswa-teks">
                                Persen penguasaan sama dengan lingkaran subtes di Beranda siswa, dirata-rata dari siswa yang sudah punya skor.
                                {belumAda.length > 0 && ` Belum ada data: ${belumAda.join(', ')}.`}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}

// Warna irisan per subtes, dari desain "dashboard analitik"; subtes lain memakai warna cadangan.
const WARNA_SUBTES: Record<string, string> = {
    PU: '#2B6A12',
    PPU: '#F77F00',
    PBM: '#EF5350',
    PK: '#D4F01B',
    LBI: '#F200EC',
    LBE: '#00E68A',
    PM: '#5B4FE9',
};
const WARNA_CADANGAN = ['#5B88DD', '#26355D', '#B89130'];

// Diagram lingkaran: besar irisan sebanding dengan persen penguasaan subtesnya, label di dalam irisan searah jari-jari.
function DiagramLingkaran({ data }: { data: (PenguasaanSubtes & { persen: number })[] }) {
    const PUSAT = 150;
    const JARI = 140;
    const total = data.reduce((n, d) => n + d.persen, 0);
    const titik = (sudut: number, r: number) => [PUSAT + r * Math.cos(sudut), PUSAT + r * Math.sin(sudut)];

    let mulai = -Math.PI / 2; // irisan pertama mulai dari atas, searah jarum jam
    const irisan = data.map((d, i) => {
        const besar = (total > 0 ? d.persen / total : 1 / data.length) * 2 * Math.PI;
        const awal = mulai;
        mulai += besar;

        return { ...d, awal, akhir: mulai, besar, warna: WARNA_SUBTES[d.kode] ?? WARNA_CADANGAN[i % WARNA_CADANGAN.length] };
    });

    return (
        <svg viewBox="0 0 300 300" className="mx-auto block w-full max-w-[340px]" role="img" aria-label="Rata-rata penguasaan siswa per subtes">
            {irisan.map((s) => {
                const [x0, y0] = titik(s.awal, JARI);
                const [x1, y1] = titik(s.akhir, JARI);
                const tengah = (s.awal + s.akhir) / 2;
                const [lx, ly] = titik(tengah, JARI * 0.62);
                // Teks searah jari-jari; di belahan kiri diputar balik supaya tidak terbaca terbalik.
                let putar = (tengah * 180) / Math.PI;
                if (putar > 90) {
                    putar -= 180;
                }

                return (
                    <g key={s.kode}>
                        <title>{`${s.kode} · ${s.nama}: ${s.persen.toLocaleString('id-ID')}% (${angka(s.siswa)} siswa)`}</title>
                        {irisan.length === 1 ? (
                            <circle cx={PUSAT} cy={PUSAT} r={JARI} fill={s.warna} />
                        ) : (
                            <path
                                d={`M${PUSAT} ${PUSAT}L${x0} ${y0}A${JARI} ${JARI} 0 ${s.besar > Math.PI ? 1 : 0} 1 ${x1} ${y1}Z`}
                                fill={s.warna}
                                stroke="white"
                                strokeWidth={3}
                                strokeLinejoin="round"
                            />
                        )}
                        {/* Irisan yang terlalu sempit tidak diberi label; angkanya tetap ada di tooltip. */}
                        {s.besar > 0.3 && (
                            <text
                                transform={`rotate(${irisan.length === 1 ? 0 : putar} ${lx} ${ly})`}
                                x={lx}
                                y={ly}
                                textAnchor="middle"
                                fill="white"
                                stroke="rgba(0,0,0,0.25)"
                                strokeWidth={2}
                                paintOrder="stroke"
                                className="text-[15px] font-bold"
                            >
                                <tspan x={lx} dy="-0.15em">
                                    {Math.round(s.persen)}%
                                </tspan>
                                <tspan x={lx} dy="1.1em">
                                    {s.kode}
                                </tspan>
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

function GagalDimuat() {
    return (
        <div role="alert" className="flex flex-col items-center rounded-kartu bg-white px-6 py-12 text-center shadow-kartu">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-siswa-umpan-salah text-siswa-umpan-salah-teks">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 4l9 16H3zM12 10v4M12 17v.5" />
                </svg>
            </span>
            <p className="mt-4 text-lg font-semibold text-siswa-judul">Gagal Menampilkan Data, Coba Lagi Nanti!</p>
        </div>
    );
}

function KartuAngka({
    label,
    angka: nilai,
    keterangan,
    judul,
    latarIkon,
    ikon,
    tooltip,
}: {
    label: string;
    angka: number;
    keterangan: string;
    judul?: string;
    latarIkon: string;
    ikon: ReactNode;
    tooltip?: string;
}) {
    return (
        <div className="rounded-kartu bg-white px-4 py-4 shadow-kartu" title={judul}>
            {/* Label satu baris di semua kartu, supaya angka keempat kartu sejajar. */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <p className="whitespace-nowrap text-[13px] uppercase text-siswa-teks">{label}</p>
                    {tooltip && <InfoTooltip text={tooltip} />}
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${latarIkon}`}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {ikon}
                    </svg>
                </span>
            </div>
            <p className="text-3xl font-bold text-siswa-judul">{angka(nilai)}</p>
            <p className="mt-2 truncate text-xs text-siswa-teks">{keterangan}</p>
        </div>
    );
}
