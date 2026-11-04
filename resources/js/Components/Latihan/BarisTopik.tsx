interface BarisTopikProps {
    label: string;
    dipilih: boolean;
    onUbah: () => void;
    direkomendasikan?: boolean;
}

/**
 * Satu baris pilihan topik dengan kotak centang bulat.
 * Checkbox aslinya tetap ada (sr-only) supaya bisa dipakai dengan keyboard dan pembaca layar.
 */
export default function BarisTopik({ label, dipilih, onUbah, direkomendasikan }: BarisTopikProps) {
    return (
        <label className="group flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={dipilih} onChange={onUbah} className="peer sr-only" />

            <span aria-hidden="true" className="relative flex shrink-0 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-edvora-primary">
                {/* Lingkaran biru lembut di belakang centang: mengembang dan memudar masuk saat baris di-hover. */}
                <span className="absolute inset-0 scale-0 rounded-full bg-edvora-primary/20 opacity-0 transition duration-300 ease-out group-hover:scale-[1.4] group-hover:opacity-100 motion-reduce:transition-none" />

                <span
                    className={`relative flex h-[25.889px] w-[26.701px] items-center justify-center rounded-full border-[0.755px] transition-colors duration-300 ease-out ${
                        dipilih ? 'border-siswa-centang bg-siswa-centang' : 'border-siswa-garis-halus bg-white group-hover:border-edvora-primary/50'
                    }`}
                >
                    {/* Titik biru di tengah lingkaran kosong: membesar dari nol saat baris di-hover, sebagai tanda "bisa dicentang".
                        Saat sudah dicentang titiknya tidak muncul, karena lingkarannya sudah biru penuh. */}
                    <span
                        className={`absolute inset-0 m-auto h-[20px] w-[20px] rounded-full bg-siswa-centang/70 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                            dipilih ? 'scale-0' : 'scale-0 group-hover:scale-100'
                        }`}
                    />

                    {/* Ikon centang selalu dirender, lalu muncul/hilang dengan memudar dan membesar supaya tidak tiba-tiba. */}
                    <img
                        src="/images/ikon/centang.png"
                        alt=""
                        className={`h-[17.543px] w-[17.543px] object-contain transition duration-300 ease-out ${dipilih ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                    />
                </span>
            </span>

            {/* origin-left: tulisan membesar ke kanan, tidak menabrak lingkaran centang. */}
            <span className="inline-block min-w-0 origin-left text-[15px] font-semibold leading-normal text-siswa-judul-seksi transition-transform duration-300 ease-out group-hover:scale-105">
                {label}
            </span>

            {/* Lencana: shrink-0 + whitespace-nowrap, sebab overflow-hidden membuat lebar minimumnya 0 dan tanpa ini lencana ikut menyusut sampai teksnya terpotong. */}
            {direkomendasikan && (
                <span className="relative flex h-[25.889px] shrink-0 items-center overflow-hidden whitespace-nowrap rounded-tombol bg-lencana-rekomendasi px-[14px] text-[12px] font-semibold text-white shadow-panel">
                    {/* Kilau: garis cahaya putih transparan yang menyapu lencana; overflow-hidden memotongnya di tepi lencana. */}
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1/3 animate-kilau bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:hidden"
                    />
                    <span className="relative">Direkomendasikan</span>
                </span>
            )}
        </label>
    );
}
