import { Head, Link, useForm } from '@inertiajs/react';
import axios from 'axios';
import { ReactNode, useEffect, useRef, useState } from 'react';
import JudulHalaman from '@/Components/Editor/JudulHalaman';
import ToastGagal from '@/Components/Editor/ToastGagal';
import EditorLayout from '@/Components/Layouts/EditorLayout';
import { TeksMatematika } from '@/Components/Ujian/KartuSoal';
import TabelMajemuk from '@/Components/Ujian/TabelMajemuk';
import TombolOpsi from '@/Components/Ujian/TombolOpsi';
import { LABEL_STATUS, LABEL_TINGKAT, LABEL_TIPE } from '@/lib/labelSoal';
import { pesanServer } from '@/lib/pesanServer';
import { IsianSoal, OpsiIsian, PilihanTopik, StatusSoal, SubtesEditor, TingkatKesulitan } from '@/types/editor';
import { OpsiJawaban, TipeSoal } from '@/types/latihan';
import BankSoalManual from '@/Components/Tur/BankSoalManual';

const LABEL_OPSI = ['A', 'B', 'C', 'D', 'E'] as const;
const URUTAN_TIPE: TipeSoal[] = ['pilihan_ganda', 'benar_salah', 'majemuk_tabel', 'isian_singkat'];
const URUTAN_TINGKAT: TingkatKesulitan[] = ['mudah', 'sedang', 'sulit'];
// Sama dengan MajemukTabel::MAKS_KOLOM di backend.
const MAKS_KOLOM = 4;

const KOSONG: IsianSoal = {
    topikId: '',
    tipe: 'pilihan_ganda',
    tingkatKesulitan: '',
    teksSoal: '',
    gambarSoal: '',
    opsi: LABEL_OPSI.map(() => ({ teks: '', gambar: '' })),
    kunciPg: '',
    kunciBenar: LABEL_OPSI.map(() => false),
    kolomTabel: ['Benar', 'Salah'],
    kunciKolom: LABEL_OPSI.map(() => null),
    jawabanIsian: [''],
    hint: '',
    pembahasan: '',
    gambarPembahasan: '',
};

const KELAS_INPUT = 'w-full rounded-[10px] border-siswa-ujian-garis text-sm text-siswa-judul focus:border-edvora-primary focus:ring-edvora-primary';

interface FormSoalProps {
    subtes: SubtesEditor;
    topikList: PilihanTopik[];
    kodeSoal: string; // soal baru: kode berikutnya, tampil read-only dan ikut dikirim
    soal: (IsianSoal & { status: StatusSoal }) | null; // null = tambah soal baru
    urlGambar: string; // dasar link Storage, untuk pratinjau gambar yang ditulis pendek (PU/PU-631.png)
}

/**
 * Tambah dan edit satu soal (desain "Tambah soal manual" dan "edit soal"). Server memeriksa isian dengan aturan
 * import Excel; pesan salahnya tampil di bawah field masing-masing.
 */
export default function FormSoal({ subtes, topikList, kodeSoal, soal, urlGambar }: FormSoalProps) {
    const edit = soal !== null;
    const { data, setData, post, put, transform, processing, errors } = useForm<IsianSoal>({ ...KOSONG, ...soal });
    // Error memakai nama field bertitik (opsi.0.teks) dan field di luar data (kunci, umum).
    const galat = errors as Record<string, string | undefined>;
    const [gagal, setGagal] = useState<string[]>([]);

    const simpan = (status: 'draft' | 'published') => {
        transform((isi) => ({ ...isi, kodeSoal, status }));
        const opsi = { preserveScroll: true, onError: () => setGagal(['Perubahan Belum Berhasil']) };

        if (edit) {
            put(route('editor.soal.ubah', kodeSoal), opsi);
        } else {
            post(route('editor.soal.simpan', subtes.kode), opsi);
        }
    };

    // Bentuk fungsi: link hasil unggah gambar datang belakangan, jadi isian opsi lain yang diketik sementara itu tidak tertimpa.
    const ubahOpsi = (i: number, kunci: keyof OpsiIsian, nilai: string) =>
        setData((isi) => ({ ...isi, opsi: isi.opsi.map((o, j) => (j === i ? { ...o, [kunci]: nilai } : o)) }));

    // Kolom yang dihapus: kunci pernyataan yang menunjuk kolom itu dikosongkan, nomor kolom sesudahnya bergeser.
    const hapusKolom = (k: number) =>
        setData({
            ...data,
            kolomTabel: data.kolomTabel.filter((_, j) => j !== k),
            kunciKolom: data.kunciKolom.map((n) => (n === null || n === k + 1 ? null : n > k + 1 ? n - 1 : n)),
        });

    // Error di luar field yang tampil di formulir, mis. kode soal sudah dipakai.
    const galatUmum = Object.entries(galat).filter(([kunci, pesan]) => pesan && !FIELD_TAMPIL.has(kunci) && !kunci.startsWith('opsi.'));

    return (
        <EditorLayout breadcrumb={['Bank Soal', subtes.nama, edit ? `Edit ${kodeSoal}` : 'Tambah Soal Manual']} subtesAktif={subtes.kode}>
            <Head title={edit ? `Edit Soal ${kodeSoal}` : `Tambah Soal ${subtes.kode}`} />
            <ToastGagal pesan={gagal} onHilang={() => setGagal([])} />
                <BankSoalManual aktif={!edit} />

            <Link href={route('editor.soal.index', subtes.kode)} className="mb-3 inline-flex items-center gap-2 text-sm text-siswa-teks hover:text-siswa-judul">
                <span aria-hidden="true">‹</span> Bank Soal {subtes.nama}
            </Link>
            <JudulHalaman
                atas={subtes.kode}
                judul={edit ? `Edit Soal ${kodeSoal}` : 'Tambah Soal Baru'}
                keterangan={edit ? `Status sekarang: ${LABEL_STATUS[soal.status]}` : undefined}
            />

            {galatUmum.length > 0 && (
                <div role="alert" className="mb-5 rounded-kartu border border-siswa-titik-salah bg-siswa-umpan-salah px-5 py-3 text-sm text-siswa-umpan-salah-teks">
                    {galatUmum.map(([kunci, pesan]) => (
                        <p key={kunci}>{pesan}</p>
                    ))}
                </div>
            )}

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                    <Kartu turId="info-soal" judul="Informasi Soal" keterangan="Isi informasi umumnya">
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                            <Field label="Kode Soal" catatan="Read-Only">
                                <input value={kodeSoal} readOnly className={`${KELAS_INPUT} bg-siswa-laman-awal font-semibold`} />
                            </Field>
                            <Field label="Topik" galat={galat.topikId}>
                                <select value={data.topikId} onChange={(e) => setData('topikId', e.target.value)} className={KELAS_INPUT}>
                                    <option value="">Pilih topik</option>
                                    {topikList.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nama}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <Field label="Tipe Soal" galat={galat.tipe} kelompok>
                            <Segmen pilihan={URUTAN_TIPE.map((t) => ({ nilai: t, label: LABEL_TIPE[t] }))} nilai={data.tipe} onPilih={(t) => setData('tipe', t)} />
                        </Field>

                        <Field label="Tingkat Kesulitan" galat={galat.tingkatKesulitan} kelompok>
                            <Segmen
                                pilihan={URUTAN_TINGKAT.map((t) => ({ nilai: t, label: LABEL_TINGKAT[t] }))}
                                nilai={data.tingkatKesulitan}
                                onPilih={(t) => setData('tingkatKesulitan', t)}
                            />
                        </Field>
                    </Kartu>

                    <Kartu judul="Isi Soal" keterangan="Rumus boleh diketik biasa (x², ½, ≠); pakai $...$ untuk rumus LaTeX">
                        <Field label="Teks Soal" galat={galat.teksSoal}>
                            <textarea value={data.teksSoal} onChange={(e) => setData('teksSoal', e.target.value)} rows={6} placeholder="Tuliskan soal" className={KELAS_INPUT} />
                        </Field>
                        <InputGambar
                            label="URL Gambar (Opsional)"
                            nilai={data.gambarSoal}
                            onUbah={(v) => setData('gambarSoal', v)}
                            galat={galat.gambarSoal}
                            contoh={`${subtes.kode}/${kodeSoal}.png`}
                            unggah={{ subtes: subtes.kode, kodeSoal, bagian: 'soal' }}
                        />
                    </Kartu>

                    {data.tipe === 'isian_singkat' ? (
                        <Kartu judul="Jawaban Diterima" keterangan="Isikan dengan jawaban yang benar (bisa lebih dari 1)">
                            {data.jawabanIsian.map((jawaban, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={jawaban}
                                        onChange={(e) => setData('jawabanIsian', data.jawabanIsian.map((j, k) => (k === i ? e.target.value : j)))}
                                        placeholder={`Jawaban ${i + 1}`}
                                        aria-label={`Jawaban diterima ${i + 1}`}
                                        className={KELAS_INPUT}
                                    />
                                    {data.jawabanIsian.length > 1 && (
                                        <TombolHapus label={`Hapus jawaban ${i + 1}`} onClick={() => setData('jawabanIsian', data.jawabanIsian.filter((_, k) => k !== i))} />
                                    )}
                                </div>
                            ))}
                            <PesanGalat pesan={galat.kunci} />
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setData('jawabanIsian', [...data.jawabanIsian, ''])}
                                    className="rounded-full bg-ujian-biru px-12 py-1 text-xs font-medium text-white shadow-panel hover:opacity-90"
                                >
                                    + Tambah Jawaban
                                </button>
                            </div>
                        </Kartu>
                    ) : (
                        <Kartu judul="Opsi Jawaban" keterangan={KETERANGAN_OPSI[data.tipe]}>
                            {data.tipe === 'majemuk_tabel' && (
                                <Field label="Judul Kolom Tabel" galat={galat.kolomTabel} catatan={`2–${MAKS_KOLOM} kolom, mis. Benar | Salah | Tidak Bisa Ditentukan`} kelompok>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {data.kolomTabel.map((judul, k) => (
                                            <div key={k} className="flex items-center gap-1">
                                                <input
                                                    value={judul}
                                                    onChange={(e) => setData('kolomTabel', data.kolomTabel.map((j, m) => (m === k ? e.target.value : j)))}
                                                    placeholder={`Kolom ${k + 1}`}
                                                    aria-label={`Judul kolom ${k + 1}`}
                                                    className={`${KELAS_INPUT} w-40`}
                                                />
                                                {data.kolomTabel.length > 2 && <TombolHapus label={`Hapus kolom ${k + 1}`} onClick={() => hapusKolom(k)} />}
                                            </div>
                                        ))}
                                        {data.kolomTabel.length < MAKS_KOLOM && (
                                            <button
                                                type="button"
                                                onClick={() => setData('kolomTabel', [...data.kolomTabel, ''])}
                                                className="rounded-full border border-edvora-primary px-3 py-1 text-xs text-edvora-primary hover:bg-siswa-badge-subtes"
                                            >
                                                + Kolom
                                            </button>
                                        )}
                                    </div>
                                </Field>
                            )}

                            {LABEL_OPSI.map((label, i) => (
                                <BarisOpsi
                                    key={label}
                                    label={label}
                                    tipe={data.tipe}
                                    opsi={data.opsi[i]}
                                    wajib={i < 2}
                                    kunciPg={data.kunciPg === label}
                                    benar={data.kunciBenar[i]}
                                    kolom={data.kolomTabel}
                                    kunciKolom={data.kunciKolom[i]}
                                    galatTeks={galat[`opsi.${i}.teks`]}
                                    galatGambar={galat[`opsi.${i}.gambar`]}
                                    unggah={{ subtes: subtes.kode, kodeSoal, bagian: label }}
                                    onUbah={(kunci, nilai) => ubahOpsi(i, kunci, nilai)}
                                    onPilihKunci={() => setData('kunciPg', data.kunciPg === label ? '' : label)}
                                    onCentang={() => setData('kunciBenar', data.kunciBenar.map((b, j) => (j === i ? !b : b)))}
                                    onPilihKolom={(nomor) => setData('kunciKolom', data.kunciKolom.map((n, j) => (j === i ? nomor : n)))}
                                />
                            ))}
                            <PesanGalat pesan={galat.kunci} />
                        </Kartu>
                    )}

                    <Kartu judul="Hint dan Pembahasan">
                        <Field label="Hint (Opsional)" galat={galat.hint}>
                            <textarea value={data.hint} onChange={(e) => setData('hint', e.target.value)} rows={4} placeholder="Tuliskan hint" className={KELAS_INPUT} />
                        </Field>
                        <Field label="Pembahasan" galat={galat.pembahasan}>
                            <textarea
                                value={data.pembahasan}
                                onChange={(e) => setData('pembahasan', e.target.value)}
                                rows={5}
                                placeholder="Tuliskan pembahasan"
                                className={KELAS_INPUT}
                            />
                        </Field>
                        <InputGambar
                            label="URL Gambar Pembahasan (Opsional)"
                            nilai={data.gambarPembahasan}
                            onUbah={(v) => setData('gambarPembahasan', v)}
                            galat={galat.gambarPembahasan}
                            contoh={`${subtes.kode}/${kodeSoal}-pembahasan.png`}
                            unggah={{ subtes: subtes.kode, kodeSoal, bagian: 'pembahasan' }}
                        />
                    </Kartu>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link href={route('editor.soal.index', subtes.kode)} className="px-4 py-2 font-semibold text-siswa-judul hover:underline">
                            Batal
                        </Link>
                        <button
                            data-tur="simpan-draft" 
                            type="button"
                            disabled={processing}
                            onClick={() => simpan('draft')}
                            className="rounded-lg border border-siswa-garis-halus bg-siswa-cincin-dasar px-5 py-2 font-semibold text-siswa-judul shadow-panel transition hover:brightness-95 disabled:opacity-50"
                        >
                            Simpan sebagai Draft
                        </button>
                        <button
                            data-tur="simpan-publish"  
                            type="button"
                            disabled={processing}
                            onClick={() => simpan('published')}
                            className="rounded-lg bg-ujian-biru px-5 py-2 font-semibold text-white shadow-panel transition hover:opacity-90 disabled:opacity-50"
                        >
                            {processing ? 'Menyimpan…' : 'Simpan dan Publish'}
                        </button>
                    </div>
                    {edit && soal.status === 'published' && (
                        <p className="text-xs text-siswa-teks">Simpan sebagai Draft menarik soal ini dari latihan siswa sampai dipublish lagi.</p>
                    )}
                </div>

                <Pratinjau data={data} urlGambar={urlGambar} />
            </div>
        </EditorLayout>
    );
}

// Field yang punya tempat pesan sendiri; selain ini (dan opsi.*) tampil di kotak error umum.
const FIELD_TAMPIL = new Set(['topikId', 'tipe', 'tingkatKesulitan', 'teksSoal', 'gambarSoal', 'kolomTabel', 'kunci', 'hint', 'pembahasan', 'gambarPembahasan']);

const KETERANGAN_OPSI: Record<TipeSoal, string> = {
    pilihan_ganda: 'Pilih tepat satu kunci jawaban (klik huruf opsinya)',
    benar_salah: 'Centang pernyataan yang benar sebagai kunci jawaban',
    majemuk_tabel: 'Isi pernyataan, lalu pilih kolom yang benar untuk setiap pernyataan',
    isian_singkat: '',
};

// Tujuan unggah gambar: subtes dan kode soal menentukan nama file di Storage; bagian = 'soal', 'A'–'E', atau 'pembahasan'.
interface TujuanUnggah {
    subtes: string;
    kodeSoal: string;
    bagian: string;
}

interface BarisOpsiProps {
    label: (typeof LABEL_OPSI)[number];
    tipe: TipeSoal;
    opsi: OpsiIsian;
    wajib: boolean;
    kunciPg: boolean;
    benar: boolean;
    kolom: string[];
    kunciKolom: number | null;
    galatTeks?: string;
    galatGambar?: string;
    unggah: TujuanUnggah;
    onUbah: (kunci: keyof OpsiIsian, nilai: string) => void;
    onPilihKunci: () => void;
    onCentang: () => void;
    onPilihKolom: (nomor: number) => void;
}

// Satu opsi/pernyataan: penanda kunci di kiri (huruf, centang, atau pilihan kolom), teks, dan link gambar opsional.
function BarisOpsi(p: BarisOpsiProps) {
    const [gambarTerbuka, setGambarTerbuka] = useState(p.opsi.gambar !== '');
    const sorot = (p.tipe === 'pilihan_ganda' && p.kunciPg) || (p.tipe === 'benar_salah' && p.benar);
    const nama = p.tipe === 'pilihan_ganda' ? 'Opsi' : 'Pernyataan';

    return (
        <div>
            <div className="flex items-stretch gap-2">
                {p.tipe === 'pilihan_ganda' && (
                    <button
                        type="button"
                        onClick={p.onPilihKunci}
                        aria-pressed={p.kunciPg}
                        title="Jadikan kunci jawaban"
                        className={`w-[46px] shrink-0 rounded-[10px] border text-sm font-semibold shadow-panel transition ${
                            p.kunciPg ? 'border-transparent bg-ujian-biru text-white' : 'border-siswa-ujian-garis bg-white text-siswa-judul hover:border-edvora-primary'
                        }`}
                    >
                        {p.label}
                    </button>
                )}
                {p.tipe === 'benar_salah' && (
                    <button
                        type="button"
                        role="checkbox"
                        aria-checked={p.benar}
                        aria-label={`Pernyataan ${p.label} benar`}
                        onClick={p.onCentang}
                        className="flex w-[46px] shrink-0 items-center justify-center rounded-[10px] border border-siswa-ujian-garis bg-white text-siswa-judul shadow-panel hover:border-edvora-primary"
                    >
                        {p.benar && (
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                )}
                {p.tipe === 'majemuk_tabel' && (
                    <span className="flex w-[46px] shrink-0 items-center justify-center rounded-[10px] border border-siswa-ujian-garis bg-white text-sm font-semibold text-siswa-judul">
                        {p.label}
                    </span>
                )}
                <textarea
                    value={p.opsi.teks}
                    onChange={(e) => p.onUbah('teks', e.target.value)}
                    rows={p.opsi.teks.includes('\n') ? 3 : 1}
                    placeholder={`${nama} ${p.label}${p.wajib ? '' : ' (Opsional)'}`}
                    aria-label={`${nama} ${p.label}`}
                    className={`${KELAS_INPUT} min-h-11 resize-y font-semibold ${sorot ? 'border-transparent bg-ujian-biru text-white placeholder:text-white/70' : ''}`}
                />
            </div>

            <div className="ml-[54px]">
                {p.tipe === 'majemuk_tabel' && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Kunci pernyataan ${p.label}`}>
                        {p.kolom.map((judul, k) => (
                            <button
                                key={k}
                                type="button"
                                role="radio"
                                aria-checked={p.kunciKolom === k + 1}
                                onClick={() => p.onPilihKolom(k + 1)}
                                className={`rounded-full border px-3 py-0.5 text-xs transition ${
                                    p.kunciKolom === k + 1 ? 'border-transparent bg-ujian-biru text-white' : 'border-siswa-ujian-garis bg-white text-siswa-judul hover:border-edvora-primary'
                                }`}
                            >
                                {judul.trim() || `Kolom ${k + 1}`}
                            </button>
                        ))}
                    </div>
                )}

                {gambarTerbuka ? (
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
                        <input
                            value={p.opsi.gambar}
                            onChange={(e) => p.onUbah('gambar', e.target.value)}
                            placeholder={`Link gambar ${nama.toLowerCase()} ${p.label} (opsional)`}
                            aria-label={`Link gambar ${nama.toLowerCase()} ${p.label}`}
                            className={`${KELAS_INPUT} text-xs`}
                        />
                        <UnggahGambar tujuan={p.unggah} onLink={(url) => p.onUbah('gambar', url)} />
                    </div>
                ) : (
                    <button type="button" onClick={() => setGambarTerbuka(true)} className="mt-1 text-xs text-edvora-primary hover:underline">
                        + Gambar
                    </button>
                )}
                <PesanGalat pesan={p.galatTeks} />
                <PesanGalat pesan={p.galatGambar} />
            </div>
        </div>
    );
}

// Pratinjau soal seperti yang dilihat siswa, memakai komponen halaman Latihan.
function Pratinjau({ data, urlGambar }: { data: IsianSoal; urlGambar: string }) {
    const terisi = LABEL_OPSI.map((label, i) => ({ label, i, ...data.opsi[i] })).filter((o) => o.teks.trim() !== '' || o.gambar.trim() !== '');
    const tampil = terisi.length > 0 ? terisi : LABEL_OPSI.slice(0, 2).map((label, i) => ({ label, i, teks: `Opsi ${label}`, gambar: '' }));
    const opsi: OpsiJawaban[] = tampil.map((o) => ({
        id: o.label,
        label: o.label,
        teks_opsi: o.teks,
        gambar_opsi: linkGambar(o.gambar, urlGambar),
        is_kunci: false,
        kunci_kolom: data.kunciKolom[o.i],
    }));

    return (
        <aside data-tur="pratinjau" className="rounded-kartu bg-white px-5 py-5 shadow-kartu lg:sticky lg:top-[84px]">
            <h2 className="text-xl font-semibold text-siswa-judul">Pratinjau</h2>
            <p className="text-xs text-siswa-teks">Tampilan soal bagi siswa</p>
            <span className="mt-3 inline-block rounded-md border border-siswa-garis-halus bg-siswa-badge-subtes px-2 py-0.5 text-xs font-semibold text-siswa-judul">
                Soal 1
            </span>

            <GambarPratinjau src={linkGambar(data.gambarSoal, urlGambar)} alt="Gambar soal" />
            <p className="mt-3 text-sm leading-7 text-siswa-judul">
                {data.teksSoal.trim() ? <TeksMatematika teks={data.teksSoal} /> : <span className="text-siswa-teks">Teks soal akan muncul di sini …</span>}
            </p>

            <div className="mt-3 space-y-2">
                {data.tipe === 'isian_singkat' && (
                    <div className="rounded-[10px] border border-siswa-ujian-garis px-4 py-2.5 text-sm font-semibold text-siswa-teks">Jawaban 1</div>
                )}
                {(data.tipe === 'pilihan_ganda' || data.tipe === 'benar_salah') &&
                    opsi.map((o) => <TombolOpsi key={o.id} opsi={o} disabled redup={false} kotakCentang={data.tipe === 'benar_salah'} />)}
                {data.tipe === 'majemuk_tabel' && (
                    <TabelMajemuk kolom={data.kolomTabel.map((judul, k) => judul.trim() || `Kolom ${k + 1}`)} pernyataan={opsi} pilihan={{}} />
                )}
            </div>
        </aside>
    );
}

function GambarPratinjau({ src, alt }: { src: string | null; alt: string }) {
    const [rusak, setRusak] = useState(false);
    useEffect(() => setRusak(false), [src]);

    if (!src) {
        return null;
    }

    return rusak ? (
        <p className="mt-3 break-all text-xs text-siswa-titik-salah">Gambar tidak bisa dimuat: {src}</p>
    ) : (
        <img src={src} alt={alt} onError={() => setRusak(true)} className="mt-3 max-h-60 max-w-full rounded-lg border border-siswa-ujian-garis" />
    );
}

// Link lengkap untuk pratinjau; versi pendek (PU/PU-631.png) disambung ke dasar link Storage.
function linkGambar(isi: string, dasar: string): string | null {
    const teks = isi.trim();

    if (teks === '') {
        return null;
    }

    if (/^https?:\/\//i.test(teks)) {
        return teks;
    }

    return dasar ? `${dasar}/${teks.replace(/^\/+/, '')}` : null;
}

interface InputGambarProps {
    label: string;
    nilai: string;
    onUbah: (v: string) => void;
    galat?: string;
    contoh: string;
    unggah: TujuanUnggah;
}

// Kolom link gambar dan tombol unggah langsung; link hasil unggahan mengisi kolom itu.
function InputGambar({ label, nilai, onUbah, galat, contoh, unggah }: InputGambarProps) {
    return (
        <div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={label} catatan={`Link Storage atau versi pendek, mis. ${contoh}`}>
                    <input value={nilai} onChange={(e) => onUbah(e.target.value)} placeholder="https:// …" className={KELAS_INPUT} />
                </Field>
                <div>
                    <span className="text-sm font-medium text-siswa-judul">atau unggah gambar</span>
                    <div className="mt-1">
                        <UnggahGambar tujuan={unggah} onLink={onUbah} />
                    </div>
                    <p className="mt-1 text-xs text-siswa-teks">PNG/JPG/WebP, maks. 1 MB</p>
                </div>
            </div>
            <PesanGalat pesan={galat} />
        </div>
    );
}

/**
 * Unggah gambar langsung ke Storage (editor.soal.gambar). Server memeriksa isinya dan memberi nama file dari kode soal,
 * lalu link publiknya diteruskan ke onLink. Soalnya sendiri baru tersimpan saat formulir disimpan.
 */
function UnggahGambar({ tujuan, onLink }: { tujuan: TujuanUnggah; onLink: (url: string) => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [sedang, setSedang] = useState(false);
    const [namaFile, setNamaFile] = useState<string | null>(null);
    const [galat, setGalat] = useState<string | null>(null);

    const unggah = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        const data = new FormData();
        data.append('file', file);
        data.append('kodeSoal', tujuan.kodeSoal);
        data.append('bagian', tujuan.bagian);
        setSedang(true);
        setGalat(null);

        try {
            const respons = await axios.post(route('editor.soal.gambar', tujuan.subtes), data);
            setNamaFile(file.name);
            onLink(respons.data.url);
        } catch (e) {
            setNamaFile(null);
            setGalat(pesanServer(e));
        } finally {
            setSedang(false);
        }
    };

    return (
        <div>
            <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={sedang}
                className={`flex w-full items-center gap-2 rounded-[10px] border border-dashed border-siswa-ujian-garis bg-white px-3 py-2 text-left text-sm transition hover:border-edvora-primary disabled:cursor-wait ${
                    namaFile ? 'text-siswa-judul' : 'text-siswa-teks'
                }`}
            >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />
                </svg>
                <span className="truncate">{sedang ? 'Mengunggah…' : (namaFile ?? 'Pilih File')}</span>
            </button>
            <input
                ref={input}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                    unggah(e.target.files?.[0]);
                    e.target.value = '';
                }}
            />
            <PesanGalat pesan={galat ?? undefined} />
        </div>
    );
}

function Kartu({ turId, judul, keterangan, children }: { turId?: string; judul: string; keterangan?: string; children: ReactNode }) {
    return (
        <section data-tur={turId} className="rounded-kartu bg-white px-5 py-5 shadow-kartu md:px-6">
            <h2 className="text-xl font-semibold text-siswa-judul">{judul}</h2>
            {keterangan && <p className="text-xs text-siswa-teks">{keterangan}</p>}
            <div className="mt-4 space-y-4">{children}</div>
        </section>
    );
}

// kelompok: isinya beberapa tombol, jadi pembungkusnya div, bukan label.
function Field({ label, galat, catatan, kelompok = false, children }: { label: string; galat?: string; catatan?: string; kelompok?: boolean; children: ReactNode }) {
    const isi = (
        <>
            <span className="text-sm font-medium text-siswa-judul">{label}</span>
            <div className="mt-1">{children}</div>
        </>
    );

    return (
        <div>
            {kelompok ? <div role="group" aria-label={label}>{isi}</div> : <label className="block">{isi}</label>}
            {catatan && <p className="mt-1 text-xs text-siswa-teks">{catatan}</p>}
            <PesanGalat pesan={galat} />
        </div>
    );
}

function Segmen<T extends string>({ pilihan, nilai, onPilih }: { pilihan: { nilai: T; label: string }[]; nilai: T | ''; onPilih: (nilai: T) => void }) {
    return (
        <div className="flex flex-wrap gap-1 rounded-[12px] bg-siswa-panel-fleksibel p-1">
            {pilihan.map((p) => (
                <button
                    key={p.nilai}
                    type="button"
                    aria-pressed={nilai === p.nilai}
                    onClick={() => onPilih(p.nilai)}
                    className={`min-w-[110px] flex-1 rounded-[10px] px-3 py-2 text-sm transition ${
                        nilai === p.nilai ? 'bg-white font-medium text-siswa-judul shadow-panel' : 'text-siswa-judul hover:bg-white/60'
                    }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}

function TombolHapus({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} aria-label={label} title={label} className="shrink-0 px-2 text-lg text-siswa-teks hover:text-siswa-titik-salah">
            ×
        </button>
    );
}

function PesanGalat({ pesan }: { pesan?: string }) {
    return pesan ? <p className="mt-1 text-xs text-siswa-umpan-salah-teks">{pesan}</p> : null;
}
