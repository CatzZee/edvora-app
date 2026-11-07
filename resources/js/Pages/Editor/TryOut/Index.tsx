import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import JudulHalaman from '@/Components/Editor/JudulHalaman';
import EditorLayout from '@/Components/Layouts/EditorLayout';
import FlashPesan from '@/Components/Editor/FlashPesan';

export interface ItemTryOut {
    id: string;
    judul: string;
    mulaiAt: string;
    selesaiAt: string;
    soalTerkumpul: number;
    totalTargetSoal: number;
    jumlahPeserta: number;
    status: 'draft' | 'dibuka' | 'ditutup';
}

interface PaketTryOutProps {
    paketList: ItemTryOut[];
}

export default function PaketTryOut({ paketList }: PaketTryOutProps) {
    const [cari, setCari] = useState('');
    const [hapusTarget, setHapusTarget] = useState<ItemTryOut | null>(null);
    const [menghapus, setMenghapus] = useState(false);

    const konfirmasiHapus = () => {
        if (!hapusTarget) return;
        router.delete(route('editor.tryout.destroy', hapusTarget.id), {
            preserveScroll: true,
            onStart: () => setMenghapus(true),
            onFinish: () => {
                setMenghapus(false);
                setHapusTarget(null);
            },
        });
    };

    const paketFiltered = paketList.filter((p) => p.judul.toLowerCase().includes(cari.toLowerCase()));

    return (
        <EditorLayout breadcrumb={['Paket Try Out']}>
            <Head title="Mengelola Paket Try Out" />

            <JudulHalaman
                atas="Mengelola Paket Try Out"
                judul="Mengelola Paket Try Out"
                keterangan="Buat Paket Soal per Subtest"
                aksi={
                    <Link
                        href={route('editor.tryout.tambah')}
                        className="inline-flex items-center gap-2 rounded-lg bg-ujian-biru px-4 py-2 text-sm font-medium text-white shadow-panel transition hover:opacity-90"
                    >
                        <span className="text-lg leading-none">+</span> Buat Paket
                    </Link>
                }
            />
            <FlashPesan />

            <input
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari judul paket..."
                className="mb-4 w-full max-w-sm rounded-lg border border-siswa-garis-halus bg-white px-4 py-2 text-sm outline-none focus:border-ujian-biru"
            />

            <div className="overflow-x-auto rounded-kartu bg-white shadow-kartu">
                <table className="w-full min-w-[800px] text-left text-sm text-siswa-judul">
                    <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wider text-siswa-teks">
                        <tr>
                            <th className="px-6 py-4">JUDUL</th>
                            <th className="px-4 py-4">PERIODE</th>
                            <th className="px-4 py-4">SOAL</th>
                            <th className="px-4 py-4">PESERTA</th>
                            <th className="px-4 py-4">STATUS</th>
                            <th className="px-4 py-4 text-center">AKSI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-siswa-garis-halus">
                        {paketFiltered.map((paket) => {
                            const persenSoal =
                                paket.totalTargetSoal > 0
                                    ? Math.min(100, Math.round((paket.soalTerkumpul / paket.totalTargetSoal) * 100))
                                    : 0;

                            return (
                                <tr key={paket.id} className="transition hover:bg-surface-container/50">
                                    <td className="px-6 py-4 font-semibold text-siswa-judul">{paket.judul}</td>
                                    <td className="px-4 py-4 text-xs leading-relaxed text-siswa-teks">
                                        <div>{paket.mulaiAt}</div>
                                        <div>s.d. {paket.selesaiAt}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-xs font-medium text-siswa-judul">
                                            <span className="text-siswa-umpan-benar-teks">{paket.soalTerkumpul}</span>
                                            <span className="text-siswa-teks">/{paket.totalTargetSoal}</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-siswa-garis-halus">
                                            <div
                                                className="h-full bg-siswa-titik-benar transition-all duration-300"
                                                style={{ width: `${persenSoal}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-xs font-medium text-siswa-judul">{paket.jumlahPeserta}</td>
                                    <td className="px-4 py-4">
                                        <BadgeStatus status={paket.status} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex justify-center gap-2">
                                            {paket.status === 'draft' ? (
                                                <>
                                                    <Link
                                                        href={route('editor.tryout.edit', paket.id)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-edvora-primary text-white transition hover:bg-edvora-primary-hover"
                                                        title="Edit Paket"
                                                    >
                                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M15.2 5.2l3.6 3.6L8.6 19H5v-3.6L15.2 5.2zM16.6 3.8l1.4-1.4a1.5 1.5 0 012.1 0l1.5 1.5a1.5 1.5 0 010 2.1l-1.4 1.4-3.6-3.6z" />
                                                        </svg>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHapusTarget(paket)}
                                                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E53935] text-white transition hover:bg-[#D32F2F]"
                                                        title="Hapus Paket"
                                                    >
                                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                        </svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-siswa-teks">-</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {paketFiltered.length === 0 && (
                    <div className="p-8 text-center text-sm text-siswa-teks">
                        {cari ? 'Tidak ada paket yang cocok dengan pencarian.' : 'Belum ada paket Try Out yang dibuat.'}
                    </div>
                )}
            </div>

            {hapusTarget && (
                <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/40 px-4 py-6" role="dialog" aria-modal="true">
                    <div className="my-auto w-full max-w-sm rounded-kartu bg-white p-6 shadow-lg">
                        <h3 className="text-base font-semibold text-siswa-judul">Hapus Paket Try Out?</h3>
                        <p className="mt-2 text-sm text-siswa-teks">
                            Apakah Anda yakin ingin menghapus paket <b>"{hapusTarget.judul}"</b>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setHapusTarget(null)}
                                disabled={menghapus}
                                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-siswa-judul transition hover:bg-gray-300"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={konfirmasiHapus}
                                disabled={menghapus}
                                className="rounded-lg bg-[#E53935] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#D32F2F] disabled:opacity-60"
                            >
                                {menghapus ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </EditorLayout>
    );
}

function BadgeStatus({ status }: { status: ItemTryOut['status'] }) {
    const styles = {
        draft: 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]',
        dibuka: 'bg-[#E8F5E9] text-[#1B5E20] border-[#C8E6C9]',
        ditutup: 'bg-[#ECEFF1] text-[#37474F] border-[#CFD8DC]',
    };
    const label = { draft: 'Draft', dibuka: 'Dibuka', ditutup: 'Ditutup' };

    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${styles[status]}`}>
            {label[status]}
        </span>
    );
}
