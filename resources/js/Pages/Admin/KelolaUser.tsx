import InputError from '@/Components/InputError';
import AdminLayout from '@/Components/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import { formatWaktuWib } from '@/lib/waktu';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEventHandler, ReactNode, useState } from 'react';

interface SiswaItem {
    id: string;
    namaLengkap: string;
    email: string;
    kelasLabel: string | null;
    jenisKelamin: 'laki-laki' | 'perempuan' | null;
    isActive: boolean;
    tanggalDaftar: string | null; // ISO, UTC
    terakhirLogin: string | null; // ISO, UTC; null = belum pernah login
}

interface EditorItem {
    id: string;
    namaLengkap: string;
    email: string;
    tanggalDaftar: string | null;
    terakhirLogin: string | null;
}

// Hasil paginate() Laravel; hanya field yang dipakai halaman ini.
interface Halaman<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    last_page: number;
    total: number;
}

interface KelolaUserProps {
    siswaList: Halaman<SiswaItem>;
    editorList: EditorItem[];
    cari: string;
}

type PopUp =
    | { jenis: 'tambahEditor' }
    | { jenis: 'infoEditor'; editor: EditorItem }
    | { jenis: 'konfirmasiReset'; editor: EditorItem }
    | { jenis: 'formReset'; editor: EditorItem }
    | { jenis: 'infoSiswa'; siswa: SiswaItem }
    | { jenis: 'konfirmasiNonaktifkan'; siswa: SiswaItem }
    | { jenis: 'konfirmasiAktifkan'; siswa: SiswaItem }
    | { jenis: 'konfirmasiHapus'; siswa: SiswaItem };

const LABEL_JENIS_KELAMIN = { 'laki-laki': 'Laki-laki', perempuan: 'Perempuan' } as const;

const formatWaktu = (iso: string | null) => (iso ? formatWaktuWib(iso) : '-');

export default function KelolaUser({ siswaList, editorList, cari }: KelolaUserProps) {
    const [popUp, setPopUp] = useState<PopUp | null>(null);
    const [searchQuery, setSearchQuery] = useState(cari);

    const formEditor = useForm({ namaLengkap: '', email: '', password: '' });
    const formReset = useForm({ password: '' });
    const aksi = useForm({});

    const tutup = () => {
        setPopUp(null);
        formEditor.reset();
        formEditor.clearErrors();
        formReset.reset();
        formReset.clearErrors();
    };

    const simpanEditor: FormEventHandler = (e) => {
        e.preventDefault();
        formEditor.post(route('admin.user.tambahEditor'), {
            preserveScroll: true,
            onSuccess: tutup,
        });
    };

    const simpanReset = (editor: EditorItem): FormEventHandler => (e) => {
        e.preventDefault();
        formReset.put(route('admin.user.resetPassword', editor.id), {
            preserveScroll: true,
            onSuccess: tutup,
        });
    };

    const nonaktifkan = (siswa: SiswaItem) => {
        aksi.put(route('admin.user.nonaktifkan', siswa.id), {
            preserveScroll: true,
            onSuccess: tutup,
        });
    };

    const aktifkan = (siswa: SiswaItem) => {
        aksi.put(route('admin.user.aktifkan', siswa.id), {
            preserveScroll: true,
            onSuccess: tutup,
        });
    };

    const hapus = (siswa: SiswaItem) => {
        aksi.delete(route('admin.user.hapus', siswa.id), {
            preserveScroll: true,
            onSuccess: tutup,
        });
    };

    // Pencarian dijalankan di server (nama, email, atau kelas) saat Enter, lalu hasilnya kembali ke halaman 1.
    const kirimPencarian: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('admin.user.index'), { cari: searchQuery.trim() || undefined }, { preserveState: true });
    };

    const isiPopUp = (p: PopUp) => {
        switch (p.jenis) {
            case 'tambahEditor':
                return (
                    <>
                        <KepalaPopUp judul="Tambah Editor" onTutup={tutup} />
                        <form onSubmit={simpanEditor} className="space-y-4 px-6 pb-6 pt-4">
                            <div>
                                <label htmlFor="namaLengkap" className={KELAS_LABEL}>
                                    Nama Lengkap
                                </label>
                                <input
                                    id="namaLengkap"
                                    type="text"
                                    value={formEditor.data.namaLengkap}
                                    onChange={(e) => formEditor.setData('namaLengkap', e.target.value)}
                                    className={KELAS_KOLOM}
                                    placeholder="Masukkan nama lengkap"
                                    autoFocus
                                />
                                <InputError message={formEditor.errors.namaLengkap} className="mt-1.5" />
                            </div>

                            <div>
                                <label htmlFor="email" className={KELAS_LABEL}>
                                    E-mail
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formEditor.data.email}
                                    onChange={(e) => formEditor.setData('email', e.target.value)}
                                    className={KELAS_KOLOM}
                                    placeholder="Masukkan e-mail"
                                />
                                <InputError message={formEditor.errors.email} className="mt-1.5" />
                            </div>

                            <div>
                                <label htmlFor="password" className={KELAS_LABEL}>
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={formEditor.data.password}
                                    onChange={(e) => formEditor.setData('password', e.target.value)}
                                    className={KELAS_KOLOM}
                                    placeholder="Masukkan password (min. 8 karakter)"
                                />
                                <InputError message={formEditor.errors.password} className="mt-1.5" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button type="button" onClick={tutup} className={`${TOMBOL} ${TOMBOL_PUTIH}`}>
                                    Batal
                                </button>
                                <button type="submit" disabled={formEditor.processing} className={`${TOMBOL} bg-ujian-biru text-white`}>
                                    {formEditor.processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </>
                );

            case 'infoEditor':
                return (
                    <>
                        <KepalaPopUp judul="Informasi Akun Editor" onTutup={tutup} />
                        <div className="px-6 pb-6 pt-4">
                            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <IsianInfo label="Nama Lengkap" isi={p.editor.namaLengkap} lebar />
                                <IsianInfo label="E-mail" isi={p.editor.email} lebar />
                                <IsianInfo label="Tanggal Daftar" isi={formatWaktu(p.editor.tanggalDaftar)} />
                                <IsianInfo label="Terakhir Login" isi={formatWaktu(p.editor.terakhirLogin)} />
                            </dl>
                            <button
                                type="button"
                                onClick={() => setPopUp({ jenis: 'konfirmasiReset', editor: p.editor })}
                                className={`${TOMBOL} ${TOMBOL_PUTIH} mt-5 w-full`}
                            >
                                Reset Password
                            </button>
                        </div>
                    </>
                );

            case 'konfirmasiReset':
                return (
                    <Konfirmasi
                        nada="peringatan"
                        judul="Reset Password?"
                        pesan={
                            <>
                                Apakah Anda yakin ingin mereset password untuk editor{' '}
                                <span className="font-semibold text-siswa-judul-seksi">{p.editor.namaLengkap}</span>?
                            </>
                        }
                        onTidak={() => setPopUp({ jenis: 'infoEditor', editor: p.editor })}
                        onIya={() => setPopUp({ jenis: 'formReset', editor: p.editor })}
                    />
                );

            case 'formReset':
                return (
                    <>
                        <KepalaPopUp judul="Reset Password" onTutup={tutup} />
                        <form onSubmit={simpanReset(p.editor)} className="space-y-4 px-6 pb-6 pt-4">
                            <p className="rounded-subtes bg-siswa-laman-awal px-4 py-2.5 text-[13px] text-siswa-teks">
                                <span className="font-semibold text-siswa-judul-seksi">{p.editor.namaLengkap}</span> ({p.editor.email})
                            </p>
                            <div>
                                <label htmlFor="passwordSementara" className={KELAS_LABEL}>
                                    Password Baru
                                </label>
                                <input
                                    id="passwordSementara"
                                    type="password"
                                    value={formReset.data.password}
                                    onChange={(e) => formReset.setData('password', e.target.value)}
                                    className={KELAS_KOLOM}
                                    placeholder="Masukkan password terbaru (min. 8 karakter)"
                                    autoFocus
                                />
                                <InputError message={formReset.errors.password} className="mt-1.5" />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button type="button" onClick={tutup} className={`${TOMBOL} ${TOMBOL_PUTIH}`}>
                                    Batal
                                </button>
                                <button type="submit" disabled={formReset.processing} className={`${TOMBOL} bg-ujian-biru text-white`}>
                                    {formReset.processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </>
                );

            case 'infoSiswa':
                return (
                    <>
                        <KepalaPopUp judul="Informasi Akun Siswa" onTutup={tutup} />
                        <div className="px-6 pb-6 pt-4">
                            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <IsianInfo label="Nama Lengkap" isi={p.siswa.namaLengkap} lebar />
                                <IsianInfo label="Jenis Kelamin" isi={p.siswa.jenisKelamin ? LABEL_JENIS_KELAMIN[p.siswa.jenisKelamin] : '-'} />
                                <IsianInfo label="Kelas" isi={p.siswa.kelasLabel ?? '-'} />
                                <IsianInfo label="E-mail" isi={p.siswa.email} lebar />
                                <div className="rounded-subtes bg-siswa-laman-awal px-4 py-2.5 sm:col-span-2">
                                    <dt className="text-[12px] text-siswa-teks">Status Akun</dt>
                                    <dd className="mt-1">
                                        <LencanaStatus aktif={p.siswa.isActive} />
                                    </dd>
                                </div>
                                <IsianInfo label="Tanggal Daftar" isi={formatWaktu(p.siswa.tanggalDaftar)} />
                                <IsianInfo label="Terakhir Login" isi={formatWaktu(p.siswa.terakhirLogin)} />
                            </dl>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                {p.siswa.isActive ? (
                                    <button
                                        type="button"
                                        onClick={() => setPopUp({ jenis: 'konfirmasiNonaktifkan', siswa: p.siswa })}
                                        className={`${TOMBOL} ${TOMBOL_PUTIH}`}
                                    >
                                        Nonaktifkan
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setPopUp({ jenis: 'konfirmasiAktifkan', siswa: p.siswa })}
                                        className={`${TOMBOL} ${TOMBOL_PUTIH}`}
                                    >
                                        Aktifkan
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPopUp({ jenis: 'konfirmasiHapus', siswa: p.siswa })}
                                    className={`${TOMBOL} bg-ujian-merah text-white`}
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </>
                );

            case 'konfirmasiNonaktifkan':
                return (
                    <Konfirmasi
                        nada="peringatan"
                        judul="Nonaktifkan User Ini?"
                        pesan="User tidak dapat login hingga diaktifkan kembali."
                        memproses={aksi.processing}
                        onTidak={() => setPopUp({ jenis: 'infoSiswa', siswa: p.siswa })}
                        onIya={() => nonaktifkan(p.siswa)}
                    />
                );

            case 'konfirmasiAktifkan':
                return (
                    <Konfirmasi
                        nada="aman"
                        judul="Aktifkan User Ini?"
                        pesan="User dapat login kembali."
                        memproses={aksi.processing}
                        onTidak={() => setPopUp({ jenis: 'infoSiswa', siswa: p.siswa })}
                        onIya={() => aktifkan(p.siswa)}
                    />
                );

            case 'konfirmasiHapus':
                return (
                    <Konfirmasi
                        nada="bahaya"
                        judul="Hapus User Ini?"
                        pesan="Data pribadi akan dihapus permanen."
                        memproses={aksi.processing}
                        onTidak={() => setPopUp({ jenis: 'infoSiswa', siswa: p.siswa })}
                        onIya={() => hapus(p.siswa)}
                    />
                );
        }
    };

    return (
        <AdminLayout judul="Daftar User">
            <Head title="Kelola User - EDVORA" />

            {/* Gaya banner, kartu, tabel, dan huruf sama dengan Dashboard Admin dan halaman siswa. */}
            <div className="w-full space-y-4">
                <section className="flex min-h-[83px] animate-muncul-halus flex-col justify-center rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-4 shadow-kartu">
                    <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/85">Admin</p>
                    <h1 className="mt-0.5 text-[24px] font-semibold leading-tight text-white">Daftar User</h1>
                </section>

                {/* Daftar Editor */}
                <section className="animate-muncul-halus rounded-kartu bg-white px-[26px] py-5 shadow-kartu [animation-delay:80ms] [animation-fill-mode:both]">
                    <div className="flex items-center justify-between gap-3 border-b border-siswa-garis-halus pb-3.5">
                        <h2 className="text-[18px] font-semibold leading-tight text-siswa-judul-seksi">Daftar Editor</h2>
                        <button type="button" onClick={() => setPopUp({ jenis: 'tambahEditor' })} className={`${TOMBOL_KECIL} gap-1.5 bg-ujian-biru px-4 text-white`}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Tambah Editor
                        </button>
                    </div>

                    {editorList.length === 0 ? (
                        <p className="py-8 text-center text-[13px] italic text-siswa-teks">Belum ada editor terdaftar.</p>
                    ) : (
                        <ul className="divide-y divide-siswa-garis-halus/70">
                            {editorList.map((editor) => (
                                <li
                                    key={editor.id}
                                    className="-mx-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 rounded-[10px] px-2 py-3 transition-colors duration-150 hover:bg-siswa-laman-awal md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-siswa-ikon-latihan text-[14px] font-semibold text-edvora-primary">
                                        {editor.namaLengkap.trim().charAt(0).toUpperCase()}
                                    </span>
                                    <span className="truncate text-[14px] font-medium text-siswa-judul-seksi">{editor.namaLengkap}</span>
                                    <span className="hidden truncate text-[14px] text-siswa-teks md:block">{editor.email}</span>
                                    <button
                                        type="button"
                                        onClick={() => setPopUp({ jenis: 'infoEditor', editor })}
                                        className={`${TOMBOL_KECIL} bg-ujian-biru px-4 text-white`}
                                    >
                                        Informasi Akun
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Daftar Siswa */}
                <section className="animate-muncul-halus rounded-kartu bg-white px-[26px] py-5 shadow-kartu [animation-delay:160ms] [animation-fill-mode:both]">
                    <div className="flex flex-col justify-between gap-3 pb-4 sm:flex-row sm:items-center">
                        <h2 className="text-[18px] font-semibold leading-tight text-siswa-judul-seksi">Daftar Siswa</h2>
                        {/* Search Input Pill; dikirim saat Enter */}
                        <form onSubmit={kirimPencarian} className="relative w-full sm:w-72">
                            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-siswa-teks" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="cari siswa..."
                                className="h-10 w-full rounded-[10px] border border-siswa-garis-halus bg-white pl-10 pr-4 text-[14px] text-siswa-judul-seksi transition placeholder:text-siswa-teks-redup focus:border-edvora-primary focus:outline-none focus:ring-2 focus:ring-edvora-primary/20"
                            />
                        </form>
                    </div>

                    {siswaList.data.length === 0 ? (
                        <div className="py-8 text-center text-[13px] italic text-siswa-teks">
                            {cari === '' ? 'Belum ada siswa terdaftar.' : 'Tidak ada siswa yang cocok dengan pencarian.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-subtes border border-siswa-garis-halus">
                            <table className="w-full min-w-[560px] text-left text-[14px]">
                                <thead className="bg-siswa-panel-fleksibel text-[13px] font-semibold text-siswa-judul-seksi">
                                    <tr className="border-b border-siswa-garis-halus">
                                        <th scope="col" className="px-5 py-3">
                                            Nama Lengkap
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-center">
                                            Kelas
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-center">
                                            Status
                                        </th>
                                        <th scope="col" className="px-5 py-3 text-center">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-siswa-garis-halus">
                                    {siswaList.data.map((siswa) => (
                                        <tr key={siswa.id} className="transition-colors duration-150 even:bg-siswa-laman-awal hover:bg-siswa-panel-fleksibel/70">
                                            <td className="max-w-xs truncate px-5 py-3 font-medium text-siswa-judul-seksi" title={siswa.namaLengkap}>
                                                {siswa.namaLengkap}
                                            </td>
                                            <td className="px-4 py-3 text-center text-siswa-teks">{siswa.kelasLabel ?? '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <LencanaStatus aktif={siswa.isActive} />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setPopUp({ jenis: 'infoSiswa', siswa })}
                                                    className={`${TOMBOL_KECIL} bg-ujian-biru px-4 text-white`}
                                                >
                                                    Informasi Akun
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination 20 siswa per halaman; tautannya sudah membawa pencarian (withQueryString). */}
                    {siswaList.last_page > 1 && (
                        <nav aria-label="Halaman daftar siswa" className="flex flex-wrap items-center justify-center gap-2 pt-4">
                            {siswaList.links.map((link, i) => {
                                const label = i === 0 ? 'Sebelumnya' : i === siswaList.links.length - 1 ? 'Berikutnya' : link.label;
                                const gaya = `flex h-9 min-w-9 items-center justify-center rounded-[10px] px-3 text-[13px] font-semibold shadow-panel transition duration-200 ${
                                    link.active ? 'bg-ujian-biru text-white' : 'bg-white text-siswa-judul-seksi'
                                }`;

                                return link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveState
                                        preserveScroll
                                        aria-current={link.active ? 'page' : undefined}
                                        className={`${gaya} ${link.active ? '' : 'hover:-translate-y-0.5 hover:bg-siswa-panel-fleksibel'}`}
                                    >
                                        {label}
                                    </Link>
                                ) : (
                                    <span key={i} className={`${gaya} cursor-not-allowed opacity-50`}>
                                        {label}
                                    </span>
                                );
                            })}
                        </nav>
                    )}
                </section>
            </div>

            {/* Pop-up: panel putih bersudut bulat dengan latar redup, sama dengan pop-up halaman siswa. */}
            <Modal show={popUp !== null} onClose={tutup} maxWidth="md" pusatkan panelClassName="rounded-[24px]" backdropClassName="bg-siswa-judul/30 backdrop-blur-[2px]">
                <div className="font-poppins">{popUp && isiPopUp(popUp)}</div>
            </Modal>
        </AdminLayout>
    );
}

// ---------- Bagian pop-up dan tampilan yang dipakai berulang ----------

const KELAS_LABEL = 'mb-1.5 block text-[14px] font-medium text-siswa-judul-seksi';
const KELAS_KOLOM =
    'h-11 w-full rounded-[10px] border border-siswa-garis-halus bg-white px-3.5 text-[14px] text-siswa-judul-seksi transition duration-200 placeholder:text-siswa-teks-redup hover:border-edvora-primary/60 focus:border-edvora-primary focus:outline-none focus:ring-2 focus:ring-edvora-primary/20';
const TOMBOL =
    'inline-flex h-10 items-center justify-center rounded-[10px] px-5 text-[14px] font-semibold shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-60';
const TOMBOL_PUTIH = 'border border-siswa-garis-halus bg-white text-siswa-judul-seksi hover:bg-siswa-panel-fleksibel';
const TOMBOL_KECIL =
    'inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[10px] text-[12px] font-semibold shadow-panel transition duration-200 hover:-translate-y-0.5 hover:shadow-md';

// Kepala pop-up: judul di kiri, tombol tutup ✕ abu-abu di kanan.
function KepalaPopUp({ judul, onTutup }: { judul: string; onTutup: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-siswa-garis-halus px-6 py-4">
            <h3 className="text-[18px] font-semibold text-siswa-judul-seksi">{judul}</h3>
            <button
                type="button"
                onClick={onTutup}
                aria-label="Tutup"
                className="-mr-1 rounded-full p-1 text-siswa-teks transition duration-200 hover:rotate-90 hover:bg-siswa-panel-fleksibel hover:text-edvora-primary"
            >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                </svg>
            </button>
        </div>
    );
}

// Satu isian di pop-up informasi akun; lebar = memakai dua kolom (teks panjang seperti nama dan email).
function IsianInfo({ label, isi, lebar = false }: { label: string; isi: string; lebar?: boolean }) {
    return (
        <div className={`rounded-subtes bg-siswa-laman-awal px-4 py-2.5 ${lebar ? 'sm:col-span-2' : ''}`}>
            <dt className="text-[12px] text-siswa-teks">{label}</dt>
            <dd className="mt-0.5 break-words text-[14px] font-medium text-siswa-judul-seksi">{isi}</dd>
        </div>
    );
}

function LencanaStatus({ aktif }: { aktif: boolean }) {
    return (
        <span className={`inline-block rounded-full px-3 py-0.5 text-[12px] font-semibold text-white shadow-panel ${aktif ? 'bg-ujian-hijau' : 'bg-siswa-titik-terisi'}`}>
            {aktif ? 'Aktif' : 'Nonaktif'}
        </span>
    );
}

// Warna ikon dan tombol IYA per jenis konfirmasi.
const NADA = {
    peringatan: { latar: 'bg-siswa-hint-latar text-siswa-hint-teks', tombol: 'bg-ujian-merah', ikon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
    bahaya: { latar: 'bg-siswa-umpan-salah text-siswa-umpan-salah-teks', tombol: 'bg-ujian-merah', ikon: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0' },
    aman: { latar: 'bg-siswa-umpan-benar text-siswa-umpan-benar-teks', tombol: 'bg-ujian-hijau', ikon: 'M5 12.5l4.5 4.5L19 7' },
} as const;

// Pop-up konfirmasi: ikon bulat, judul, pesan, lalu TIDAK / IYA.
function Konfirmasi({
    nada,
    judul,
    pesan,
    memproses = false,
    onTidak,
    onIya,
}: {
    nada: keyof typeof NADA;
    judul: string;
    pesan: ReactNode;
    memproses?: boolean;
    onTidak: () => void;
    onIya: () => void;
}) {
    const gaya = NADA[nada];
    return (
        <div className="flex flex-col items-center px-6 py-7 text-center">
            <span className={`flex h-14 w-14 items-center justify-center rounded-full ${gaya.latar}`}>
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={gaya.ikon} />
                </svg>
            </span>
            <h3 className="mt-3 text-[20px] font-semibold text-siswa-judul-seksi">{judul}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-siswa-teks">{pesan}</p>
            <div className="mt-6 grid w-full grid-cols-2 gap-3">
                <button type="button" disabled={memproses} onClick={onTidak} className={`${TOMBOL} ${TOMBOL_PUTIH}`}>
                    TIDAK
                </button>
                <button type="button" disabled={memproses} onClick={onIya} className={`${TOMBOL} ${gaya.tombol} text-white`}>
                    {memproses ? '...' : 'IYA'}
                </button>
            </div>
        </div>
    );
}
