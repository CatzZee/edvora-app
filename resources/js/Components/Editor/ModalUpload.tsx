import axios from 'axios';
import { DragEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';
import { pesanServer } from '@/lib/pesanServer';
import { HasilPeriksaUpload, HasilSimpanUpload, SubtesEditor } from '@/types/editor';

interface ModalUploadProps {
    show: boolean;
    subtes: SubtesEditor;
    adaTemplate: boolean; // file template sudah dipasang di server
    maksBaris: number;
    onTutup: () => void;
    onBerhasil: (hasil: HasilSimpanUpload) => void;
    onGagal: (pesan: string[]) => void; // isi notifikasi gagal di atas halaman
}

type Tahap = 'pilih' | 'memeriksa' | 'hasil' | 'menyimpan';

// Bilah progres: pengiriman file memakai kemajuan unggah sungguhan (0–20%). Server tidak melaporkan kemajuan
// pemeriksaan, jadi sesudah file terkirim bilah diisi pelan mendekati 95% (makin lama makin lambat) sampai
// jawabannya datang. TEMPO_PERIKSA mengikuti waktu periksa 10 soal di server (±10 detik).
const PERSEN_KIRIM = 20;
const PERSEN_TUNGGU = 95;
const TEMPO_PERIKSA = 12; // detik

/**
 * Modal Upload Bank Soal (massal), desain "dashboard _ bank soal _ upload file". File diperiksa begitu dipilih
 * (editor.soal.upload.periksa); tombol Upload Soal Ke Draft mengirim file yang sama ke editor.soal.upload.
 * Bila Excel menyebut gambar yang belum ada di Storage, muncul Langkah 3 untuk mengunggahnya dari satu folder
 * (di luar desain; tampilannya mengikuti Langkah 2).
 *
 * Judul dan tombol bawah tetap di tempat; hanya isi di antaranya yang digulir, dan daftar panjang (masalah,
 * peringatan, gambar) dipotong dengan tombol "Tampilkan semua" supaya tidak ada area gulir di dalam area gulir.
 */
export default function ModalUpload({ show, subtes, adaTemplate, maksBaris, onTutup, onBerhasil, onGagal }: ModalUploadProps) {
    const inputFile = useRef<HTMLInputElement>(null);
    const bagianProses = useRef<HTMLElement>(null);
    const [isi, setIsi] = useState<HTMLDivElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [tahap, setTahap] = useState<Tahap>('pilih');
    const [progres, setProgres] = useState(0);
    const [terkirim, setTerkirim] = useState(false); // file sudah sampai di server, tinggal menunggu pemeriksaan
    const [detik, setDetik] = useState(0);
    const [hasil, setHasil] = useState<HasilPeriksaUpload | null>(null);
    const [galat, setGalat] = useState<string | null>(null);
    const [diseret, setDiseret] = useState(false);
    // Ringkasan unggah gambar terakhir di Langkah 3; tetap tampil setelah Excel diperiksa ulang.
    const [catatanGambar, setCatatanGambar] = useState<string | null>(null);
    const [unggahGambar, setUnggahGambar] = useState(false);
    const adaLanjutan = useAdaLanjutan(isi);

    const sibuk = tahap === 'memeriksa' || tahap === 'menyimpan' || unggahGambar;

    // Setiap kali proses mulai atau selesai, bilah progres dan hasilnya digulir ke dalam layar.
    useEffect(() => {
        if (tahap !== 'pilih') {
            bagianProses.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [tahap]);

    const tutup = () => {
        if (sibuk) {
            return;
        }

        setFile(null);
        setTahap('pilih');
        setHasil(null);
        setGalat(null);
        setCatatanGambar(null);
        onTutup();
    };

    const kirim = async (url: string, f: File) => {
        const data = new FormData();
        data.append('file', f);
        const mulai = Date.now();
        let mulaiPeriksa: number | null = null;
        setProgres(0);
        setTerkirim(false);
        setDetik(0);

        const detak = window.setInterval(() => {
            setDetik(Math.floor((Date.now() - mulai) / 1000));

            if (mulaiPeriksa !== null) {
                const t = (Date.now() - mulaiPeriksa) / 1000;
                setProgres(Math.round(PERSEN_KIRIM + (PERSEN_TUNGGU - PERSEN_KIRIM) * (1 - Math.exp(-t / TEMPO_PERIKSA))));
            }
        }, 250);

        try {
            return await axios.post(url, data, {
                onUploadProgress: (e) => {
                    const bagian = e.total ? e.loaded / e.total : 1;
                    setProgres(Math.round(bagian * PERSEN_KIRIM));

                    if (bagian >= 1 && mulaiPeriksa === null) {
                        mulaiPeriksa = Date.now();
                        setTerkirim(true);
                    }
                },
            });
        } finally {
            window.clearInterval(detak);
        }
    };

    const periksa = async (f: File) => {
        setFile(f);
        setHasil(null);
        setGalat(null);
        setTahap('memeriksa');

        try {
            const { data } = await kirim(route('editor.soal.upload.periksa', subtes.kode), f);
            setHasil(data);
            setProgres(100);
        } catch (e) {
            // 422 dengan "pesan" (bukan errors.file): file tidak bisa dibaca sebagai .xlsx.
            const fileRusak = axios.isAxiosError(e) && e.response?.status === 422 && typeof e.response.data?.pesan === 'string';
            setGalat(pesanServer(e));
            setProgres(0);
            onGagal(fileRusak ? ['Unggah File Gagal!', 'File Gagal Terbaca!'] : ['Unggah File Gagal!']);
        } finally {
            setTahap('hasil');
        }
    };

    const simpan = async () => {
        if (!file || !hasil?.valid) {
            return;
        }

        setTahap('menyimpan');

        try {
            const { data } = await kirim(route('editor.soal.upload', subtes.kode), file);
            setFile(null);
            setHasil(null);
            setTahap('pilih');
            onBerhasil(data);
        } catch (e) {
            // 422 berisi hasil periksa ulang: isi file atau database berubah sejak diperiksa.
            if (axios.isAxiosError(e) && e.response?.status === 422 && typeof e.response.data?.valid === 'boolean') {
                setHasil(e.response.data);
            } else {
                setGalat(pesanServer(e));
            }

            setTahap('hasil');
            onGagal(['Unggah File Gagal!']);
        }
    };

    const pilihFile = (f: File | undefined) => {
        if (f && !sibuk) {
            setCatatanGambar(null);
            periksa(f);
        }
    };

    const lepas = (e: DragEvent) => {
        e.preventDefault();
        setDiseret(false);
        pilihFile(e.dataTransfer.files[0]);
    };

    const valid = hasil?.valid === true;

    return (
        <Modal show={show} maxWidth="lg" onClose={tutup} panelClassName="rounded-[14px]">
            {/* Tinggi modal dibatasi layar (Dialog Breeze memberi jarak 1,5rem atas-bawah + mb-6 di panel). */}
            <div className="flex max-h-[calc(100dvh-5rem)] flex-col font-poppins text-siswa-judul">
                <div className="flex shrink-0 items-center justify-between border-b border-siswa-garis-halus px-6 py-4">
                    <h2 className="text-xl font-medium">Upload Bank Soal (massal)</h2>
                    <button type="button" onClick={tutup} disabled={sibuk} aria-label="Tutup" className="text-xl text-siswa-teks disabled:opacity-40">
                        ×
                    </button>
                </div>

                {/* Satu-satunya area gulir di modal, dengan scrollbar tipis tanpa panah. */}
                <div
                    ref={setIsi}
                    className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:theme(colors.siswa.garis-halus)_transparent] [scrollbar-gutter:stable_both-edges] [scrollbar-width:thin]"
                >
                    <div className="space-y-5 px-6 py-5 text-sm">
                        <section>
                            <p className="font-medium">Langkah 1 : Unduh Template</p>
                            {adaTemplate ? (
                                <a
                                    href={route('editor.soal.template')}
                                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-siswa-titik-benar px-4 py-2 text-siswa-titik-benar transition hover:bg-siswa-umpan-benar"
                                >
                                    <IkonUnduh /> Unduh Template (.xlsx)
                                </a>
                            ) : (
                                <p className="mt-2 rounded-lg bg-siswa-hint-latar px-3 py-2 text-xs text-siswa-hint-teks">
                                    Template belum tersedia di server. Hubungi tim BE.
                                </p>
                            )}
                        </section>

                        <section>
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-medium">Langkah 2 : Pilih File</p>
                                <button
                                    type="button"
                                    onClick={() => inputFile.current?.click()}
                                    disabled={sibuk}
                                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-ujian-biru px-3 py-1.5 text-xs text-white shadow-panel disabled:opacity-50"
                                >
                                    <IkonUnggah /> Pilih dari Komputer
                                </button>
                            </div>
                            <input
                                ref={inputFile}
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                    pilihFile(e.target.files?.[0]);
                                    e.target.value = '';
                                }}
                            />
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => !sibuk && inputFile.current?.click()}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !sibuk && inputFile.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDiseret(true);
                                }}
                                onDragLeave={() => setDiseret(false)}
                                onDrop={lepas}
                                className={`mt-2 flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                                    diseret ? 'border-edvora-primary bg-siswa-badge-subtes' : 'border-siswa-garis-halus bg-siswa-panel-fleksibel'
                                }`}
                            >
                                {file ? (
                                    <>
                                        <IkonExcel />
                                        <p className="mt-2 break-all font-medium">{file.name}</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-siswa-teks">Tarik &amp; lepas file (.xlsx) Anda di sini, atau klik Pilih dari Komputer.</p>
                                )}
                            </div>
                            <p className="mt-2 text-xs">*Template maks. {maksBaris} baris, ukuran file maks. 2 MB</p>
                        </section>

                        {file && (
                            <section ref={bagianProses} className="scroll-mt-4 space-y-2">
                                <p>File Terpilih : {file.name}</p>
                                <div>
                                    <p>{tahap === 'menyimpan' ? 'Menyimpan' : 'Proses Validasi'} : {progres}%</p>
                                    <BilahProgres
                                        persen={progres}
                                        salah={galat !== null || (hasil !== null && !valid)}
                                        berjalan={tahap === 'memeriksa' || tahap === 'menyimpan'}
                                        label={tahap === 'menyimpan' ? 'Menyimpan' : 'Proses Validasi'}
                                    />
                                    {(tahap === 'memeriksa' || tahap === 'menyimpan') && (
                                        <p className="mt-1 text-xs text-siswa-teks" aria-live="polite">
                                            {!terkirim
                                                ? 'Mengirim file…'
                                                : tahap === 'menyimpan'
                                                  ? 'Memeriksa ulang lalu menyimpan soal…'
                                                  : 'Memeriksa isi soal, link gambar, dan rumus…'}
                                            {detik >= 3 && ` ${detik} detik`}
                                        </p>
                                    )}
                                </div>

                                {catatanGambar && <p className="rounded-lg bg-siswa-panel-fleksibel px-3 py-2 text-xs">Unggah gambar: {catatanGambar}</p>}
                                {(hasil || galat) && <DetailValidasi hasil={hasil} galat={galat} />}
                            </section>
                        )}

                        {file && hasil && (hasil.gambarKurang?.length ?? 0) > 0 && tahap === 'hasil' ? (
                            <LangkahGambar
                                key={hasil.gambarKurang.join('|')}
                                subtes={subtes}
                                daftar={hasil.gambarKurang}
                                onBerjalan={setUnggahGambar}
                                onCatatan={setCatatanGambar}
                                onPeriksaUlang={() => periksa(file)}
                            />
                        ) : (
                            // Selalu tampil, supaya editor tahu ada langkah ini sebelum Excel diperiksa.
                            <section>
                                <p className="font-medium">Langkah 3 : Unggah Gambar</p>
                                {hasil ? (
                                    <p className="mt-1 text-xs text-siswa-titik-benar">✓ Semua gambar yang disebut Excel sudah ada di Storage.</p>
                                ) : (
                                    <p className="mt-1 text-xs text-siswa-teks">
                                        Muncul setelah file Excel diperiksa: gambar yang disebut Excel tetapi belum ada di Storage diunggah di sini dari satu folder.
                                    </p>
                                )}
                            </section>
                        )}
                    </div>

                    {/* Bayangan pudar di bawah area gulir: tanda masih ada isi di bawah. */}
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none sticky bottom-0 -mt-8 h-8 bg-gradient-to-t from-white transition-opacity ${adaLanjutan ? 'opacity-100' : 'opacity-0'}`}
                    />
                </div>

                <div className={`flex shrink-0 justify-center border-t px-6 py-4 transition-colors ${adaLanjutan ? 'border-siswa-garis-halus' : 'border-transparent'}`}>
                    <button
                        type="button"
                        onClick={simpan}
                        disabled={!valid || sibuk}
                        className="rounded-lg bg-ujian-biru px-6 py-2 text-xs font-medium text-white shadow-panel transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {tahap === 'menyimpan' ? 'Menyimpan…' : 'Upload Soal Ke Draft'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

interface StatusGambar {
    path: string; // nama di Excel, mis. 'PU/PU-104-A.png'
    status: 'menunggu' | 'mengunggah' | 'berhasil' | 'gagal' | 'tidak-ada';
    pesan?: string;
}

// Gambar dikirim satu file per request (batas upload PHP), satu per satu. Request bersamaan bisa gagal (HTTP 500)
// di hosting yang memakai pooler Supabase mode transaksi.
const UNGGAH_SEKALIGUS = 1;

// Setelah unggah selesai, gambar yang bermasalah dinaikkan ke atas daftar supaya terlihat tanpa membuka semuanya.
const URUTAN_STATUS: Record<StatusGambar['status'], number> = { gagal: 0, 'tidak-ada': 1, mengunggah: 2, menunggu: 3, berhasil: 4 };

// Isi folder yang ditarik ke kotak, termasuk subfolder. readEntries() memberi isi folder bertahap, jadi dibaca berulang.
async function bacaEntri(entri: FileSystemEntry): Promise<File[]> {
    if (entri.isFile) {
        return new Promise((selesai) => (entri as FileSystemFileEntry).file((f) => selesai([f]), () => selesai([])));
    }

    if (!entri.isDirectory) {
        return [];
    }

    const pembaca = (entri as FileSystemDirectoryEntry).createReader();
    const semua: File[] = [];

    for (;;) {
        const bagian = await new Promise<FileSystemEntry[]>((selesai) => pembaca.readEntries(selesai, () => selesai([])));

        if (bagian.length === 0) {
            return semua;
        }

        for (const e of bagian) {
            semua.push(...(await bacaEntri(e)));
        }
    }
}

interface LangkahGambarProps {
    subtes: SubtesEditor;
    daftar: string[]; // gambar yang belum ada di Storage
    onBerjalan: (berjalan: boolean) => void;
    onCatatan: (catatan: string) => void;
    onPeriksaUlang: () => void;
}

/**
 * Langkah 3: editor memilih (atau menarik) satu folder gambar. Hanya gambar yang disebut Excel dan belum ada di
 * Storage yang diunggah, dengan nama persis dari Excel; file lain di folder diabaikan. Nama dicocokkan tanpa
 * membedakan huruf besar/kecil. Bila semuanya berhasil, Excel langsung diperiksa ulang.
 */
function LangkahGambar({ subtes, daftar, onBerjalan, onCatatan, onPeriksaUlang }: LangkahGambarProps) {
    const inputFolder = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<StatusGambar[] | null>(null);
    const [berjalan, setBerjalan] = useState(false);
    const [diseret, setDiseret] = useState(false);

    // Atribut pemilih folder belum ada di tipe React.
    useEffect(() => {
        inputFolder.current?.setAttribute('webkitdirectory', '');
    }, []);

    const ubah = (path: string, baru: Partial<StatusGambar>) =>
        setStatus((lama) => (lama ?? []).map((s) => (s.path === path ? { ...s, ...baru } : s)));

    const unggah = async (files: File[]) => {
        if (berjalan || files.length === 0) {
            return;
        }

        const persis = new Map(files.map((f) => [f.name, f]));
        const tanpaHuruf = new Map(files.map((f) => [f.name.toLowerCase(), f]));
        const pasangan = daftar.map((path) => {
            const nama = path.slice(path.lastIndexOf('/') + 1);
            return { path, file: persis.get(nama) ?? tanpaHuruf.get(nama.toLowerCase()) };
        });

        setStatus(pasangan.map(({ path, file }) => ({ path, status: file ? 'menunggu' : 'tidak-ada' })));
        setBerjalan(true);
        onBerjalan(true);

        const antrean = pasangan.filter((p) => p.file);
        let berikutnya = 0;
        let berhasil = 0;
        let gagal = 0;

        const pekerja = async () => {
            while (berikutnya < antrean.length) {
                const { path, file } = antrean[berikutnya++];
                const data = new FormData();
                data.append('path', path);
                data.append('file', file as File);
                ubah(path, { status: 'mengunggah' });

                try {
                    await axios.post(route('editor.soal.upload.gambar', subtes.kode), data);
                    berhasil++;
                    ubah(path, { status: 'berhasil' });
                } catch (e) {
                    gagal++;
                    ubah(path, { status: 'gagal', pesan: pesanServer(e) });
                }
            }
        };

        await Promise.all(Array.from({ length: UNGGAH_SEKALIGUS }, pekerja));

        const tidakAda = pasangan.length - antrean.length;
        setBerjalan(false);
        onBerjalan(false);
        onCatatan(
            `${berhasil} gambar terunggah` + (gagal > 0 ? `, ${gagal} gagal` : '') + (tidakAda > 0 ? `, ${tidakAda} tidak ada di folder` : '') + '.',
        );

        if (berhasil > 0 && gagal === 0 && tidakAda === 0) {
            onPeriksaUlang();
        }
    };

    const lepas = async (e: DragEvent) => {
        e.preventDefault();
        setDiseret(false);
        const entri = Array.from(e.dataTransfer.items)
            .map((item) => item.webkitGetAsEntry())
            .filter((x): x is FileSystemEntry => x !== null);
        unggah((await Promise.all(entri.map(bacaEntri))).flat());
    };

    const selesai = status !== null && !berjalan;
    const antre = status?.filter((s) => s.status !== 'tidak-ada').length ?? 0;
    const terproses = status?.filter((s) => s.status === 'berhasil' || s.status === 'gagal').length ?? 0;
    const baris = status ?? daftar.map((path): StatusGambar => ({ path, status: 'menunggu' }));

    return (
        <section>
            <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Langkah 3 : Unggah Gambar</p>
                <button
                    type="button"
                    onClick={() => inputFolder.current?.click()}
                    disabled={berjalan}
                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-ujian-biru px-3 py-1.5 text-xs text-white shadow-panel disabled:opacity-50"
                >
                    <IkonUnggah /> Pilih Folder Gambar
                </button>
            </div>
            <p className="mt-1 text-xs text-siswa-teks">
                {daftar.length} gambar disebut di Excel tetapi belum ada di Storage. Pilih folder gambarnya, mis. folder {subtes.kode} dari Drive. Hanya
                gambar ini yang diunggah, dengan nama sesuai Excel. PNG/JPG/WebP, maks. 1 MB per gambar.
            </p>
            <input
                ref={inputFolder}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    unggah(Array.from(e.target.files ?? []));
                    e.target.value = '';
                }}
            />
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDiseret(true);
                }}
                onDragLeave={() => setDiseret(false)}
                onDrop={lepas}
                className={`mt-2 rounded-xl border-2 border-dashed px-3 py-3 transition ${
                    diseret ? 'border-edvora-primary bg-siswa-badge-subtes' : 'border-siswa-garis-halus bg-siswa-panel-fleksibel'
                }`}
            >
                <p className="mb-2 text-center text-xs text-siswa-teks">Tarik &amp; lepas folder gambar Anda di sini, atau klik Pilih Folder Gambar.</p>
                {berjalan && (
                    <div className="mb-2 text-xs">
                        <p>
                            Mengunggah gambar : {terproses}/{antre}
                        </p>
                        <BilahProgres persen={antre ? Math.round((terproses / antre) * 100) : 0} salah={false} berjalan label="Unggah gambar" />
                    </div>
                )}
                <DaftarRingkas
                    isi={selesai ? [...baris].sort((a, b) => URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status]) : baris}
                    batas={5}
                    satuan="gambar"
                    className="space-y-0.5 text-xs"
                    tampilkan={(s) => (
                        <li key={s.path} className="flex items-start justify-between gap-3">
                            <span className="break-all">{s.path}</span>
                            <LabelStatus status={status ? s.status : null} pesan={s.pesan} />
                        </li>
                    )}
                />
            </div>
            {selesai && status.some((s) => s.status !== 'berhasil') && (
                <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <p className="text-siswa-teks">Perbaiki yang gagal atau tambahkan yang tidak ada di folder, lalu pilih folder lagi, atau periksa ulang Excel.</p>
                    <button type="button" onClick={onPeriksaUlang} className="shrink-0 rounded-md border border-edvora-primary px-3 py-1 text-edvora-primary">
                        Periksa Ulang Excel
                    </button>
                </div>
            )}
        </section>
    );
}

function LabelStatus({ status, pesan }: { status: StatusGambar['status'] | null; pesan?: string }) {
    if (status === null) {
        return null;
    }

    const teks = {
        menunggu: ['Menunggu', 'text-siswa-teks'],
        mengunggah: ['Mengunggah…', 'text-edvora-primary'],
        berhasil: ['✓ Terunggah', 'text-siswa-titik-benar'],
        gagal: [`✗ ${pesan ?? 'Gagal'}`, 'text-siswa-titik-salah'],
        'tidak-ada': ['Tidak ada di folder', 'text-siswa-hint-teks'],
    }[status];

    return <span className={`shrink-0 text-right ${status === 'gagal' ? 'max-w-[60%] shrink' : ''} ${teks[1]}`}>{teks[0]}</span>;
}

// Kotak detail di bawah progres: ringkasan bila valid, daftar masalah bila tidak.
function DetailValidasi({ hasil, galat }: { hasil: HasilPeriksaUpload | null; galat: string | null }) {
    if (galat || !hasil) {
        return (
            <div className="rounded-lg border border-dashed border-siswa-titik-salah px-4 py-2 text-xs text-siswa-titik-salah">
                <p>Detail Validasi : {galat}</p>
                <p>Ketentuan Mengisi File : Salah</p>
            </div>
        );
    }

    if (hasil.valid) {
        return (
            <div className="space-y-1 rounded-lg border border-dashed border-siswa-garis-halus px-4 py-2 text-xs">
                <p className="text-siswa-titik-benar">Detail Validasi : {hasil.jumlahSoal} baris valid</p>
                <p className="text-siswa-titik-benar">Ketentuan Mengisi File : Valid</p>
                <p className="text-siswa-teks">
                    {hasil.baru} soal baru (masuk sebagai Draft)
                    {hasil.diperbarui > 0 && `, ${hasil.diperbarui} soal sudah ada dan akan diperbarui (statusnya tidak berubah)`}
                    {hasil.jumlahTopik > 0 && `, ${hasil.jumlahTopik} topik di sheet Topik`}.
                </p>
                {hasil.kodeDiperbarui.length > 0 && (
                    <p className="text-siswa-teks">
                        Diperbarui: {hasil.kodeDiperbarui.join(', ')}
                        {hasil.diperbarui > hasil.kodeDiperbarui.length && ', …'}
                    </p>
                )}
                <DaftarPeringatan peringatan={hasil.peringatan} />
            </div>
        );
    }

    return (
        <div className="space-y-1 rounded-lg border border-dashed border-siswa-titik-salah px-4 py-2 text-xs text-siswa-titik-salah">
            <p>
                Detail Validasi : {hasil.pesan ?? `${hasil.jumlahMasalah} masalah di ${hasil.barisError} baris. Tidak ada soal yang disimpan sebelum semuanya diperbaiki.`}
            </p>
            <p>Ketentuan Mengisi File : Salah</p>
            {(hasil.gambarKurang?.length ?? 0) > 0 && (
                <p className="font-semibold">{hasil.gambarKurang.length} gambar belum ada di Storage. Unggah lewat Langkah 3 di bawah.</p>
            )}
            <DaftarRingkas
                isi={hasil.masalah}
                batas={3}
                satuan="masalah"
                className="space-y-1 text-siswa-judul"
                tampilkan={(m, i) => (
                    <li key={i} className="rounded bg-siswa-umpan-salah px-2 py-1">
                        <span className="font-semibold">
                            Baris {m.baris}
                            {m.kolom !== '-' && ` · ${m.kolom}`}:
                        </span>{' '}
                        {m.pesan}
                    </li>
                )}
                akhir={hasil.jumlahMasalah > hasil.masalah.length && <p>…dan {hasil.jumlahMasalah - hasil.masalah.length} masalah lain.</p>}
            />
            <DaftarPeringatan peringatan={hasil.peringatan} />
        </div>
    );
}

function DaftarPeringatan({ peringatan }: { peringatan: string[] }) {
    return (
        <DaftarRingkas
            isi={peringatan}
            batas={3}
            satuan="peringatan"
            className="space-y-1 text-siswa-hint-teks"
            tampilkan={(p, i) => (
                <li key={i} className="rounded bg-siswa-hint-latar px-2 py-1">
                    Peringatan: {p}
                </li>
            )}
        />
    );
}

interface DaftarRingkasProps<T> {
    isi: T[];
    batas: number; // jumlah butir yang tampil sebelum "Tampilkan semua"
    satuan: string; // untuk teks tombol, mis. "Tampilkan semua 12 masalah"
    className?: string;
    tampilkan: (butir: T, i: number) => ReactNode; // mengembalikan <li> ber-key
    akhir?: ReactNode; // catatan di bawah daftar, hanya saat semua butir terlihat
}

// Daftar panjang dipotong ke beberapa butir pertama, supaya modal tidak punya area gulir di dalam area gulir.
function DaftarRingkas<T>({ isi, batas, satuan, className, tampilkan, akhir }: DaftarRingkasProps<T>) {
    const [semua, setSemua] = useState(false);

    if (isi.length === 0) {
        return null;
    }

    const terpotong = isi.length > batas && !semua;

    return (
        <>
            <ul className={className}>{(terpotong ? isi.slice(0, batas) : isi).map(tampilkan)}</ul>
            {!terpotong && akhir}
            {isi.length > batas && (
                <button type="button" onClick={() => setSemua(!semua)} className="text-xs font-medium text-edvora-primary hover:underline">
                    {semua ? 'Tampilkan lebih sedikit' : `Tampilkan semua ${isi.length} ${satuan}`}
                </button>
            )}
        </>
    );
}

interface BilahProgresProps {
    persen: number;
    salah: boolean;
    berjalan: boolean; // kilau berjalan selama proses belum selesai, supaya bilah tidak terlihat macet
    label: string;
}

function BilahProgres({ persen, salah, berjalan, label }: BilahProgresProps) {
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={persen}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-siswa-cincin-dasar"
        >
            <div
                className={`relative h-full overflow-hidden rounded-full transition-[width] duration-300 ease-out ${salah ? 'bg-siswa-titik-salah' : 'bg-siswa-titik-benar'}`}
                style={{ width: `${persen}%` }}
            >
                {berjalan && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1/3 animate-kilau bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden"
                    />
                )}
            </div>
        </div>
    );
}

// True bila isi area gulir masih berlanjut di bawah bagian yang terlihat (untuk garis dan bayangan di atas footer).
function useAdaLanjutan(el: HTMLElement | null) {
    const [ada, setAda] = useState(false);

    useEffect(() => {
        if (!el) {
            return;
        }

        const ukur = () => setAda(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
        // Tinggi isi berubah (hasil validasi, Langkah 3, Tampilkan semua) tanpa mengubah ukuran area gulir itu sendiri.
        const pengamat = new ResizeObserver(ukur);
        pengamat.observe(el);

        if (el.firstElementChild) {
            pengamat.observe(el.firstElementChild);
        }

        el.addEventListener('scroll', ukur, { passive: true });
        ukur();

        return () => {
            pengamat.disconnect();
            el.removeEventListener('scroll', ukur);
        };
    }, [el]);

    return ada;
}

function IkonUnduh() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
    );
}

function IkonUnggah() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />
        </svg>
    );
}

function IkonExcel() {
    return (
        <svg className="h-12 w-12" viewBox="0 0 48 48" aria-hidden="true">
            <rect x="14" y="6" width="28" height="36" rx="3" fill="#21A366" />
            <rect x="14" y="6" width="28" height="12" rx="3" fill="#33C481" />
            <rect x="6" y="14" width="20" height="20" rx="3" fill="#107C41" />
            <path d="M11 19l10 10M21 19L11 29" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" />
        </svg>
    );
}
