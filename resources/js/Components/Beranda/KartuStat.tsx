/**
 * Kotak angka di banner sapaan (Level dan Poin).
 * Dipakai di dalam <dl>, jadi isinya pasangan <dt>/<dd>.
 * awalan: mis. "+" untuk XP dan Poin yang baru didapat di Hasil Try Out.
 * nilai boleh teks yang sudah diformat, mis. skor "557,9" di Peringkat Try Out.
 * tur: penanda data-tur supaya kotak ini bisa disorot TurFitur, mis. di Akun Pribadi.
 */
export default function KartuStat({
    label,
    nilai,
    awalan = '',
    tur,
}: {
    label: string;
    nilai: number | string;
    awalan?: string;
    tur?: string;
}) {
    return (
        // Sedikit membesar saat kursor diarahkan, senada dengan cincin penguasaan.
        <div
            data-tur={tur}
            className="min-w-[55px] rounded-xl bg-white/[0.32] px-3 py-[10px] text-center shadow-[2px_2px_5.7px_0px_rgba(0,0,0,0.01)] transition-transform duration-200 ease-out hover:scale-110"
        >
            <dt className="text-[14px] font-normal leading-none text-white">{label}</dt>
            <dd className="mt-[6px] text-[23px] font-semibold leading-[25px] text-white">
                {awalan}
                {nilai}
            </dd>
        </div>
    );
}
