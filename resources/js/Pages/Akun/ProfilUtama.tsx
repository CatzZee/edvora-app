import { Head, Link } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
import KartuStat from '@/Components/Beranda/KartuStat';
import DetailBadge, { BadgeDiperoleh } from '@/Components/Gamifikasi/DetailBadge';
import GambarAvatar from '@/Components/Gamifikasi/GambarAvatar';
import SiswaLayout from '@/Components/Layouts/SiswaLayout';
import TurFitur, { LangkahTur } from '@/Components/Tur/TurFitur';
import { formatTanggalWib } from '@/lib/waktu';

interface LevelXp {
    level: number;
    xp: number; // total XP siswa
    xpLevelIni: number; // total XP minimal level sekarang
    xpLevelBerikutnya: number; // total XP untuk naik ke level berikutnya
    persen: number; // 0–100, kemajuan dari xpLevelIni ke xpLevelBerikutnya
}

interface RiwayatPoint {
    id: string;
    tanggal: string; // ISO 8601
    keterangan: string;
    jumlah: number; // positif = didapat, negatif = dipakai membeli avatar
}

interface ProfilUtamaProps {
    user: { id: string; name: string; email: string };
    siswa: {
        namaLengkap: string;
        kelas: string | null;
        kelasLabel: string | null;
        jenisKelamin: 'laki-laki' | 'perempuan' | null;
        xp: number;
        point: number;
        universitas: { id: string; nama: string } | null;
        prodi: { id: string; nama: string; jenjang: string | null } | null;
        avatarUrl: string; // avatar aktif, atau Default sesuai jenis kelamin
    };
    bergabung: string | null; // YYYY-MM-DD
    level: LevelXp;
    badges: BadgeDiperoleh[]; // 4 terbaru
    jumlahBadge: number;
    riwayatPoint: RiwayatPoint[]; // 10 terakhir (SDD FR29)
}

const LABEL_JENIS_KELAMIN = { 'laki-laki': 'Laki-laki', perempuan: 'Perempuan' } as const;

// Tur perkenalan Akun Pribadi: muncul sekali saat halaman ini pertama kali dibuka.
// Di luar komponen supaya identitas array-nya tetap dan efek di TurFitur tidak jalan ulang tiap render.
// Target menunjuk ke atribut data-tur pada elemen di bawah; menambah langkah cukup menambah entri di sini.
const LANGKAH_TUR: LangkahTur[] = [
    {
        target: 'ringkasan',
        posisi: 'bawah',
        teks: (
            <>
                Ini <strong className="font-semibold">ringkasan akunmu!</strong> Kamu bisa melihat informasi profil dan pencapaian
                belajarmu di sini!
            </>
        ),
    },
    {
        target: 'xp',
        posisi: 'bawah',
        teks: (
            <>
                XP didapatkan dari aktivitas belajarmu.{' '}
                <strong className="font-semibold">Semakin banyak XP, semakin tinggi levelmu!</strong>
            </>
        ),
    },
    {
        target: 'point',
        posisi: 'kiri',
        teks: (
            <>
                Point berbeda dengan XP.{' '}
                <strong className="font-semibold">Kumpulkan point untuk mendapatkan avatar favoritmu di toko avatar!</strong>
            </>
        ),
    },
    {
        target: 'avatar',
        posisi: 'kanan',
        bulat: true,
        teks: <>Gunakan point untuk mendapatkan avatar baru dan tampilkan karakter favoritmu!</>,
    },
];

function Isian({ label, isi }: { label: string; isi: string }) {
    return (
        <div className="rounded-subtes bg-siswa-laman-awal px-4 py-3 transition duration-200 hover:bg-siswa-panel-fleksibel">
            <dt className="text-[12px] font-medium text-siswa-teks">{label}</dt>
            <dd className="mt-0.5 truncate text-[15px] font-medium text-siswa-judul-seksi">{isi}</dd>
        </div>
    );
}

// Akun Pribadi (UCS5). Ukuran huruf, warna, kartu, dan bayangan mengikuti Beranda.
export default function ProfilUtama({ user, siswa, bergabung, level, badges, jumlahBadge, riwayatPoint }: ProfilUtamaProps) {
    const [badgeDipilih, setBadgeDipilih] = useState<BadgeDiperoleh | null>(null);

    const nama = siswa.namaLengkap || user.name || 'Siswa';
    const kelas = siswa.kelasLabel ?? '-';
    const tanggalBergabung = bergabung
        ? new Date(bergabung).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : '-';
    const angka = (n: number) => n.toLocaleString('id-ID');

    return (
        <>
            <Head title="Akun Pribadi" />

            <div className="w-full space-y-4 font-poppins text-siswa-judul">
                {/* Kartu Profil Utama: gaya sama dengan banner sapaan Beranda; XP dan Point memakai kotak angka yang sama. */}
                <section
                    data-tur="ringkasan"
                    className="flex animate-muncul-halus flex-wrap items-center gap-5 rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-5 text-white shadow-kartu"
                >
                    {/* Avatar aktif dan tombol Edit Avatar (UCS5: ikon pensil di pojok bawah avatar). */}
                    <div data-tur="avatar" className="relative shrink-0">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-white/25 text-[26px] backdrop-blur-sm md:h-[72px] md:w-[72px]">
                            <GambarAvatar src={siswa.avatarUrl} nama={nama} className="h-full w-full object-cover p-1" />
                        </div>
                        <Link
                            href={route('akun.avatar')}
                            className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-siswa-teks shadow-panel transition duration-200 hover:scale-110 hover:text-edvora-primary"
                            title="Edit Avatar"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </Link>
                    </div>

                    {/* Informasi Pengguna & Progress Level */}
                    <div className="min-w-[220px] flex-1">
                        <h1 className="text-[24px] font-semibold leading-tight">{nama}</h1>
                        <p className="mt-1 text-[13px] text-white/90">
                            {kelas} · Bergabung {tanggalBergabung}
                        </p>

                        <div className="mt-3 max-w-md">
                            <div className="mb-1.5 flex justify-between text-[12px] font-medium text-white/90">
                                <span>Level {level.level}</span>
                                <span>
                                    {angka(level.xp)}/{angka(level.xpLevelBerikutnya)} XP
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
                                <div
                                    className="h-full rounded-full bg-white transition-[width] duration-700 ease-out"
                                    style={{ width: `${Math.min(100, Math.max(0, level.persen))}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stat Total XP & Point */}
                    <dl className="flex shrink-0 gap-4">
                        <KartuStat label="Total XP" nilai={angka(siswa.xp)} tur="xp" />
                        <KartuStat label="Total Point" nilai={angka(siswa.point)} tur="point" />
                    </dl>
                </section>

                {/* Kartu Biodata */}
                <section className="animate-muncul-halus rounded-kartu bg-white px-[26px] py-5 shadow-kartu [animation-delay:80ms] [animation-fill-mode:both]">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-[18px] font-semibold leading-tight text-siswa-judul-seksi">Biodata</h2>
                        <Link
                            href={route('akun.profil')}
                            prefetch
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-siswa-garis-halus bg-white px-4 text-[13px] font-semibold text-siswa-judul-seksi shadow-panel transition duration-200 hover:-translate-y-0.5 hover:bg-siswa-panel-fleksibel"
                        >
                            <svg className="h-3.5 w-3.5 text-edvora-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Edit Biodata
                        </Link>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Isian label="Nama Lengkap" isi={nama} />
                        <Isian label="Email" isi={user.email} />
                        <Isian label="Kelas" isi={kelas} />
                        <Isian label="Jenis Kelamin" isi={siswa.jenisKelamin ? LABEL_JENIS_KELAMIN[siswa.jenisKelamin] : '-'} />
                        <Isian label="Universitas" isi={siswa.universitas?.nama ?? '-'} />
                        <Isian
                            label="Prodi"
                            isi={siswa.prodi ? `${siswa.prodi.jenjang ? `${siswa.prodi.jenjang} ` : ''}${siswa.prodi.nama}` : '-'}
                        />
                    </dl>
                </section>

                {/* Kartu Badge: hanya badge yang sudah diperoleh (UCS5); klik membuka detail. */}
                <section className="animate-muncul-halus rounded-kartu bg-white px-[26px] py-5 shadow-kartu [animation-delay:160ms] [animation-fill-mode:both]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-[18px] font-semibold leading-tight text-siswa-judul-seksi">Badge</h2>
                            <p className="text-[12px] text-siswa-teks">{jumlahBadge} badge diperoleh</p>
                        </div>
                        {jumlahBadge > 0 && (
                            <Link
                                href={route('akun.badge')}
                                className="inline-flex items-center gap-1 text-[13px] font-semibold text-edvora-primary transition duration-200 hover:underline"
                            >
                                Lihat Semua
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        )}
                    </div>

                    {badges.length === 0 ? (
                        <p className="mt-4 text-[13px] text-siswa-teks">Belum ada badge.</p>
                    ) : (
                        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {badges.map((badge) => (
                                <button
                                    key={badge.id}
                                    type="button"
                                    onClick={() => setBadgeDipilih(badge)}
                                    className="flex flex-col items-center rounded-subtes border border-siswa-garis-halus p-4 text-center transition duration-200 hover:border-edvora-primary/30 hover:shadow-sm"
                                >
                                    <img src={badge.icon} alt="" className="h-14 w-14" />
                                    <h3 className="mt-3 text-[14px] font-semibold text-siswa-judul-seksi">{badge.nama}</h3>
                                    <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-siswa-teks">{badge.syarat}</p>
                                    <span className="mt-3 text-[10px] text-gray-400">
                                        DIRAIH PADA
                                        <br />
                                        <span className="font-medium text-gray-500">{formatTanggalWib(badge.diperolehAt)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Kartu Riwayat Point (SDD FR29): 10 transaksi terakhir. */}
                <section className="animate-muncul-halus rounded-kartu bg-white px-[26px] py-5 shadow-kartu [animation-delay:240ms] [animation-fill-mode:both]">
                    <h2 className="text-[18px] font-semibold leading-tight text-siswa-judul-seksi">Riwayat Point</h2>

                    {riwayatPoint.length === 0 ? (
                        <p className="mt-4 text-[13px] text-siswa-teks">Belum ada riwayat point.</p>
                    ) : (
                        <ul className="mt-3 divide-y divide-siswa-garis-halus">
                            {riwayatPoint.map((r) => (
                                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-[14px] font-medium text-siswa-judul-seksi">{r.keterangan}</p>
                                        <p className="text-[12px] text-siswa-teks">{formatTanggalWib(r.tanggal)}</p>
                                    </div>
                                    <span className={`shrink-0 text-[14px] font-semibold ${r.jumlah < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {r.jumlah > 0 ? '+' : ''}
                                        {angka(r.jumlah)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <DetailBadge badge={badgeDipilih} onClose={() => setBadgeDipilih(null)} />

            {/* Tur perkenalan, jalan sekali per browser; penandanya disimpan di localStorage (lihat lib/turFitur.ts). */}
            <TurFitur kunci="akun-pribadi" langkah={LANGKAH_TUR} />
        </>
    );
}

// Persistent layout: sidebar tidak dirender ulang saat pindah dari/ke halaman siswa lain.
ProfilUtama.layout = (page: ReactNode) => <SiswaLayout>{page}</SiswaLayout>;
