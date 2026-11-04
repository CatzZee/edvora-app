import { CSSProperties, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sudahLihatTur, tandaiTurSelesai } from '@/lib/turFitur';

export type PosisiTur = 'atas' | 'bawah' | 'kiri' | 'kanan';

export interface LangkahTur {
    /** Nilai atribut data-tur pada elemen yang disorot, mis. data-tur="ringkasan". */
    target: string;
    /** Isi balon penjelasan. Berupa ReactNode supaya sebagian kata bisa ditebalkan. */
    teks: ReactNode;
    /** Sisi balon terhadap elemen. Dibalik otomatis kalau tidak muat di layar. Bawaan: bawah. */
    posisi?: PosisiTur;
    /** Sorotan dibulatkan penuh; untuk elemen bundar seperti avatar. */
    bulat?: boolean;
    /** Jarak sorotan dari tepi elemen, dalam piksel. Bawaan 8. */
    jarakSorot?: number;
}

interface TurFiturProps {
    /** Pembeda tur antar fitur, dipakai sebagai kunci localStorage. */
    kunci: string;
    /** Naikkan kalau isi tur diperbarui, supaya siswa lama melihat versi barunya sekali lagi. */
    versi?: number;
    /** Daftar langkah. Simpan sebagai konstanta di luar komponen halaman agar identitasnya tetap. */
    langkah: LangkahTur[];
    /** Tunda tur, mis. sampai data halaman siap. Bawaan: true. */
    aktif?: boolean;
}

interface Sorot {
    atas: number;
    kiri: number;
    lebar: number;
    tinggi: number;
    radius: number;
}

interface Letak {
    kiri: number;
    atas: number;
    sisi: PosisiTur;
    /** Jarak ujung panah dari tepi balon, supaya panah tetap menunjuk ke tengah elemen. */
    panah: number;
}

/** Jarak balon ke elemen yang disorot. */
const JARAK = 14;
/** Jarak minimal balon dari tepi layar. */
const TEPI = 12;
/** Setengah sisi panah balon (panah = persegi 12px yang diputar 45 derajat). */
const PANAH = 6;
/** Jarak minimal ujung panah dari sudut balon, supaya tidak menempel di lengkungan sudut. */
const PANAH_MIN = 22;

function jepit(nilai: number, min: number, maks: number): number {
    return Math.min(Math.max(nilai, min), Math.max(min, maks));
}

function sorotSama(a: Sorot | null, b: Sorot | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    return (
        Math.abs(a.atas - b.atas) < 0.5 &&
        Math.abs(a.kiri - b.kiri) < 0.5 &&
        Math.abs(a.lebar - b.lebar) < 0.5 &&
        Math.abs(a.tinggi - b.tinggi) < 0.5 &&
        a.radius === b.radius
    );
}

function cariElemen(target: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-tur="${CSS.escape(target)}"]`);
}

/** Posisi dan bentuk sorotan untuk satu langkah; null kalau elemennya tidak ada atau tidak tampak. */
function ukurSorot(langkah: LangkahTur): Sorot | null {
    const elemen = cariElemen(langkah.target);
    if (!elemen) return null;

    const kotak = elemen.getBoundingClientRect();
    if (kotak.width === 0 || kotak.height === 0) return null;

    const jarak = langkah.jarakSorot ?? 8;
    // Sudut sorotan mengikuti sudut elemen aslinya, jadi kartu tetap terlihat seperti kartu.
    const radiusElemen = parseFloat(window.getComputedStyle(elemen).borderTopLeftRadius) || 0;

    return {
        atas: kotak.top - jarak,
        kiri: kotak.left - jarak,
        lebar: kotak.width + jarak * 2,
        tinggi: kotak.height + jarak * 2,
        radius: langkah.bulat ? 9999 : radiusElemen + jarak,
    };
}

/** Letak balon terhadap sorotan: sisi yang diminta dipakai selama muat, kalau tidak dibalik ke seberangnya. */
function hitungLetak(sorot: Sorot, diminta: PosisiTur, lebar: number, tinggi: number): Letak {
    const lebarLayar = window.innerWidth;
    const tinggiLayar = window.innerHeight;

    const muat: Record<PosisiTur, boolean> = {
        bawah: sorot.atas + sorot.tinggi + JARAK + tinggi <= tinggiLayar - TEPI,
        atas: sorot.atas - JARAK - tinggi >= TEPI,
        kanan: sorot.kiri + sorot.lebar + JARAK + lebar <= lebarLayar - TEPI,
        kiri: sorot.kiri - JARAK - lebar >= TEPI,
    };
    const seberang: Record<PosisiTur, PosisiTur> = { atas: 'bawah', bawah: 'atas', kiri: 'kanan', kanan: 'kiri' };

    // Hanya dibalik kalau seberangnya memang muat; kalau dua-duanya sempit, sisi aslinya dipertahankan.
    const sisi = !muat[diminta] && muat[seberang[diminta]] ? seberang[diminta] : diminta;

    const tengahX = sorot.kiri + sorot.lebar / 2;
    const tengahY = sorot.atas + sorot.tinggi / 2;

    // Jepitan terakhir menjaga balon tetap utuh di layar walau elemennya sangat besar — mis. tabel
    // bank soal yang lebih tinggi dari layar, yang kalau dituruti mentah-mentah mendorong balon keluar.
    if (sisi === 'atas' || sisi === 'bawah') {
        const kiri = jepit(tengahX - lebar / 2, TEPI, lebarLayar - TEPI - lebar);
        const atasMentah = sisi === 'bawah' ? sorot.atas + sorot.tinggi + JARAK : sorot.atas - JARAK - tinggi;

        return {
            kiri,
            atas: jepit(atasMentah, TEPI, tinggiLayar - TEPI - tinggi),
            sisi,
            panah: jepit(tengahX - kiri, PANAH_MIN, lebar - PANAH_MIN),
        };
    }

    const atas = jepit(tengahY - tinggi / 2, TEPI, tinggiLayar - TEPI - tinggi);
    const kiriMentah = sisi === 'kanan' ? sorot.kiri + sorot.lebar + JARAK : sorot.kiri - JARAK - lebar;

    return {
        kiri: jepit(kiriMentah, TEPI, lebarLayar - TEPI - lebar),
        atas,
        sisi,
        panah: jepit(tengahY - atas, PANAH_MIN, tinggi - PANAH_MIN),
    };
}

function TombolPanah({ arah, onClick, nonaktif }: { arah: 'kiri' | 'kanan'; onClick: () => void; nonaktif: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={nonaktif}
            aria-label={arah === 'kiri' ? 'Langkah sebelumnya' : 'Langkah berikutnya'}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition duration-200 ${
                nonaktif ? 'cursor-not-allowed bg-siswa-garis-halus' : 'bg-edvora-primary hover:bg-edvora-primary-hover'
            }`}
        >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d={arah === 'kiri' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
                />
            </svg>
        </button>
    );
}

/**
 * Tur fitur: menggelapkan layar, menyorot satu elemen, dan menaruh balon penjelasan di sebelahnya.
 * Muncul sekali saja; setelah ditutup lewat Selesai, Lewati, atau Esc, penandanya disimpan di localStorage.
 *
 * Elemen yang disorot ditandai di halaman dengan atribut data-tur, mis. <section data-tur="ringkasan">.
 */
export default function TurFitur({ kunci, versi = 1, langkah, aktif = true }: TurFiturProps) {
    const [tampil, setTampil] = useState(false);
    const [indeks, setIndeks] = useState(0);
    const [sorot, setSorot] = useState<Sorot | null>(null);
    const [ukuranBalon, setUkuranBalon] = useState({ lebar: 320, tinggi: 150 });

    const balonRef = useRef<HTMLDivElement>(null);
    // Lewat ref supaya efek di bawah tidak ikut jalan ulang saat halaman membuat array langkah baru.
    const langkahRef = useRef(langkah);
    langkahRef.current = langkah;

    const total = langkah.length;
    const langkahIni = langkah[indeks];
    const diLangkahTerakhir = indeks === total - 1;

    // Keputusan tampil baru diambil setelah komponen terpasang, supaya tur tidak sempat berkedip
    // di layar siswa yang sudah pernah melihatnya.
    useEffect(() => {
        if (!aktif || total === 0 || sudahLihatTur(kunci, versi)) return;

        setIndeks(0);
        setTampil(true);
    }, [aktif, total, kunci, versi]);

    const tutup = useCallback(() => {
        tandaiTurSelesai(kunci, versi);
        setTampil(false);
    }, [kunci, versi]);

    const maju = useCallback(() => {
        setIndeks((i) => (i < langkahRef.current.length - 1 ? i + 1 : i));
    }, []);

    const mundur = useCallback(() => {
        setIndeks((i) => Math.max(0, i - 1));
    }, []);

    // Sorotan diukur ulang tiap frame selama tur terbuka: kartu halaman ini masih beranimasi saat
    // pertama muncul, dan letaknya ikut berubah saat layar digulir atau ukuran jendela diubah.
    useEffect(() => {
        if (!tampil) return;

        let frame = 0;
        const ukur = () => {
            const ini = langkahRef.current[indeks];
            if (ini) {
                const baru = ukurSorot(ini);
                setSorot((lama) => (sorotSama(lama, baru) ? lama : baru));
            }
            frame = window.requestAnimationFrame(ukur);
        };

        frame = window.requestAnimationFrame(ukur);

        return () => window.cancelAnimationFrame(frame);
    }, [tampil, indeks]);

    // Elemen yang disorot digulir ke layar hanya kalau memang belum kelihatan.
    useEffect(() => {
        if (!tampil) return;

        const ini = langkahRef.current[indeks];
        const elemen = ini ? cariElemen(ini.target) : null;
        if (!elemen) return;

        const kotak = elemen.getBoundingClientRect();
        const tinggiLayar = window.innerHeight;
        const utuh = kotak.top >= TEPI && kotak.bottom <= tinggiLayar - TEPI;
        // Elemen yang lebih tinggi dari layar, mis. tabel bank soal, tidak akan pernah muat utuh.
        // Menggulirnya ke tengah malah membuang bagian atasnya, padahal di situ balonnya menempel.
        const lebihTinggiDariLayar = kotak.height > tinggiLayar - TEPI * 2;

        if (utuh || (lebihTinggiDariLayar && kotak.top >= TEPI && kotak.top <= tinggiLayar / 2)) return;

        elemen.scrollIntoView({ behavior: 'smooth', block: lebihTinggiDariLayar ? 'start' : 'center' });
    }, [tampil, indeks]);

    useEffect(() => {
        if (!tampil) return;

        const padaTombol = (peristiwa: KeyboardEvent) => {
            if (peristiwa.key === 'Escape') tutup();
            else if (peristiwa.key === 'ArrowRight') maju();
            else if (peristiwa.key === 'ArrowLeft') mundur();
        };

        window.addEventListener('keydown', padaTombol);

        return () => window.removeEventListener('keydown', padaTombol);
    }, [tampil, tutup, maju, mundur]);

    // Tinggi balon berubah mengikuti panjang teks tiap langkah, jadi diukur ulang tiap render.
    // setState-nya dijaga supaya berhenti begitu ukurannya tidak berubah lagi.
    useLayoutEffect(() => {
        const elemen = balonRef.current;
        if (!elemen) return;

        const kotak = elemen.getBoundingClientRect();
        setUkuranBalon((lama) =>
            Math.abs(lama.lebar - kotak.width) < 0.5 && Math.abs(lama.tinggi - kotak.height) < 0.5
                ? lama
                : { lebar: kotak.width, tinggi: kotak.height },
        );
    });

    if (!tampil || !langkahIni) return null;

    const letak = sorot ? hitungLetak(sorot, langkahIni.posisi ?? 'bawah', ukuranBalon.lebar, ukuranBalon.tinggi) : null;

    // Panah menempel di sisi balon yang menghadap elemen, setengahnya masuk ke dalam balon.
    const gayaPanah: Record<PosisiTur, CSSProperties> = {
        bawah: { top: -PANAH, left: (letak?.panah ?? 0) - PANAH },
        atas: { bottom: -PANAH, left: (letak?.panah ?? 0) - PANAH },
        kanan: { left: -PANAH, top: (letak?.panah ?? 0) - PANAH },
        kiri: { right: -PANAH, top: (letak?.panah ?? 0) - PANAH },
    };

    return (
        <div className="fixed inset-0 z-[70] font-poppins">
            {sorot ? (
                <div
                    aria-hidden="true"
                    // Layar digelapkan lewat bayangan sangat lebar milik kotak sorotan, jadi bagian
                    // di dalam kotak tetap terang dan elemennya terbaca jelas.
                    className="pointer-events-none absolute shadow-[0_0_0_9999px_rgba(13,21,45,0.72)] transition-[top,left,width,height] duration-200 ease-out"
                    style={{
                        top: sorot.atas,
                        left: sorot.kiri,
                        width: sorot.lebar,
                        height: sorot.tinggi,
                        borderRadius: sorot.radius,
                    }}
                />
            ) : (
                // Elemennya tidak ketemu (mis. tidak dirender karena datanya kosong): layar tetap
                // digelapkan dan balonnya ditaruh di tengah, supaya tur tidak macet.
                <div aria-hidden="true" className="absolute inset-0 bg-[rgba(13,21,45,0.72)]" />
            )}

            <div
                ref={balonRef}
                role="dialog"
                aria-modal="true"
                aria-label={`Panduan langkah ${indeks + 1} dari ${total}`}
                className="absolute w-[min(340px,calc(100vw-24px))] rounded-[18px] bg-white px-5 py-[18px] shadow-[0_10px_34px_rgba(13,21,45,0.28)]"
                style={letak ? { left: letak.kiri, top: letak.atas } : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
                {letak && <div aria-hidden="true" className="absolute h-3 w-3 rotate-45 bg-white" style={gayaPanah[letak.sisi]} />}

                <p className="relative text-[14px] leading-[22px] text-siswa-judul-seksi">{langkahIni.teks}</p>

                <div className="relative mt-[18px] flex items-center justify-between gap-3">
                    {diLangkahTerakhir ? (
                        <button
                            type="button"
                            onClick={tutup}
                            className="h-9 rounded-full bg-edvora-primary px-5 text-[13px] font-semibold text-white transition duration-200 hover:bg-edvora-primary-hover"
                        >
                            Selesai
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={tutup}
                            className="h-9 rounded-full border border-siswa-garis-halus bg-white px-5 text-[13px] font-semibold text-siswa-judul-seksi transition duration-200 hover:bg-siswa-laman-awal"
                        >
                            Lewati
                        </button>
                    )}

                    <div className="flex items-center gap-2">
                        <TombolPanah arah="kiri" onClick={mundur} nonaktif={indeks === 0} />
                        <span className="min-w-[34px] text-center text-[13px] font-medium text-siswa-teks">
                            {indeks + 1} / {total}
                        </span>
                        <TombolPanah arah="kanan" onClick={maju} nonaktif={diLangkahTerakhir} />
                    </div>
                </div>
            </div>
        </div>
    );
}
