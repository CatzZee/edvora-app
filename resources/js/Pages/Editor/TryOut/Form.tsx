import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import JudulHalaman from '@/Components/Editor/JudulHalaman';
import EditorLayout from '@/Components/Layouts/EditorLayout';
import FlashPesan from '@/Components/Editor/FlashPesan';
import PaketSoalTO from '@/Components/Tur/PaketSoalTO';

interface Baris {
    subtes_id: string;
    nama: string;
    jumlah_soal: number;
    waktu_menit: number;
}

interface FormPaketProps {
    paket: {
        id: string | null;
        judul: string;
        mulai_at: string;
        selesai_at: string;
        peraturan: string;
    };
    baris: Baris[];
}

const KELAS_INPUT =
    'w-full rounded-lg border border-siswa-garis-halus bg-white px-4 py-2 text-sm text-siswa-judul outline-none focus:border-ujian-biru';

export default function FormPaketTryOut({ paket, baris }: FormPaketProps) {
    const edit = paket.id !== null;

    const { data, setData, post, put, processing, errors } = useForm({
        judul: paket.judul,
        mulai_at: paket.mulai_at,
        selesai_at: paket.selesai_at,
        peraturan: paket.peraturan,
        subtes: baris.map((b) => ({
            subtes_id: b.subtes_id,
            jumlah_soal: b.jumlah_soal,
            waktu_menit: b.waktu_menit,
        })),
    });

    const totalSoal = data.subtes.reduce((n, s) => n + (Number(s.jumlah_soal) || 0), 0);
    const totalMenit = data.subtes.reduce((n, s) => n + (Number(s.waktu_menit) || 0), 0);

    const kirim = (e: FormEvent) => {
        e.preventDefault();
        if (edit) {
            put(route('editor.tryout.update', paket.id as string));
        } else {
            post(route('editor.tryout.store'));
        }
    };

    const galatSubtes = Object.entries(errors as Record<string, string>)
        .filter(([k]) => k.startsWith('subtes'))
        .map(([, v]) => v);

    return (
        <EditorLayout breadcrumb={['Paket Try Out', edit ? 'Edit Paket' : 'Buat Paket']}>
            <Head title={edit ? 'Edit Paket Try Out' : 'Buat Paket Try Out'} />
            <PaketSoalTO aktif={!edit} />

            <JudulHalaman
                atas="Mengelola Paket Try Out"
                judul={edit ? 'Edit Paket Try Out' : 'Buat Paket Try Out'}
                keterangan="Default mengikuti format UTBK dan dapat diubah"
            />
            <FlashPesan />

            <form onSubmit={kirim} className="space-y-6">
                <div className="space-y-4 rounded-kartu bg-white p-6 shadow-kartu">
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-siswa-judul">Judul</label>
                        <input
                            type="text"
                            value={data.judul}
                            onChange={(e) => setData('judul', e.target.value)}
                            placeholder="Try Out UTBK - SNBT 2026 - Gelombang 1"
                            className={KELAS_INPUT}
                        />
                        {errors.judul && <p className="mt-1 text-xs text-[#E53935]">{errors.judul}</p>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-semibold text-siswa-judul">Mulai</label>
                            <input
                                type="datetime-local"
                                value={data.mulai_at}
                                onChange={(e) => setData('mulai_at', e.target.value)}
                                className={KELAS_INPUT}
                            />
                            {errors.mulai_at && <p className="mt-1 text-xs text-[#E53935]">{errors.mulai_at}</p>}
                        </div>
                        <div>
                            <div className="mb-1 flex items-center justify-between">      
                            <label className="mb-1 block text-sm font-semibold text-siswa-judul">Selesai</label>
                            <span                                                                     
                                data-tur="info-jadwal"
                                aria-label="Info jadwal"
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-siswa-teks/40 text-[10px] font-bold leading-none text-white"
                            >
                                i
                            </span>
                            </div>
                            <input
                                type="datetime-local"
                                value={data.selesai_at}
                                onChange={(e) => setData('selesai_at', e.target.value)}
                                className={KELAS_INPUT}
                            />
                            {errors.selesai_at && <p className="mt-1 text-xs text-[#E53935]">{errors.selesai_at}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold text-siswa-judul">Peraturan</label>
                        <textarea
                            rows={4}
                            value={data.peraturan}
                            onChange={(e) => setData('peraturan', e.target.value)}
                            className={KELAS_INPUT}
                        />
                        {errors.peraturan && <p className="mt-1 text-xs text-[#E53935]">{errors.peraturan}</p>}
                    </div>
                </div>

                <div className="rounded-kartu bg-white p-6 shadow-kartu">
                    <h2 className="text-sm font-semibold text-siswa-judul">Subtes</h2>
                    <p className="mb-3 text-xs text-siswa-teks">
                        {data.subtes.length} subtes • {totalSoal} soal • {totalMenit} menit
                    </p>

                    <div className="overflow-x-auto rounded-lg border border-siswa-garis-halus">
                        <table className="w-full min-w-[500px] text-sm text-siswa-judul">
                            <thead className="text-xs text-siswa-teks">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Nama Subtes</th>
                                    <th className="px-4 py-3 text-left font-medium">Jumlah Soal</th>
                                    <th className="px-4 py-3 text-left font-medium">Waktu (menit)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-siswa-garis-halus">
                                {data.subtes.map((s, i) => (
                                    <tr key={s.subtes_id}>
                                        <td className="px-4 py-2">{baris[i].nama}</td>
                                        <td className="px-4 py-2">
                                            <td className="px-4 py-2">{s.jumlah_soal} soal</td>
                                        </td>
                                        <td className="px-4 py-2">
                                            <td className="px-4 py-2">{s.waktu_menit} menit</td>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {galatSubtes.length > 0 && (
                        <p className="mt-2 text-xs text-[#E53935]">{Array.from(new Set(galatSubtes)).join(' ')}</p>
                    )}

                    <div className="mt-6 flex justify-center gap-3">
                        <Link
                            href={route('editor.tryout.index')}
                            className="rounded-lg bg-gray-300 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-400"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-ujian-biru px-6 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </form>
        </EditorLayout>
    );
}
