interface TopikRekomendasi {
    topikId: string;
    kodeSubtes: string | null;
    namaTopik: string;
}

/** Kartu "Direkomendasikan": topik yang paling perlu dilatih dari semua subtes. */
export default function KartuRekomendasi({ rekomendasi }: { rekomendasi: TopikRekomendasi[] }) {
    return (
        <section className="flex min-h-[196px] flex-col rounded-kartu bg-white p-[14px] shadow-kartu">
            <div className="flex items-center gap-[7px] pl-[1px] pt-[2px]">
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[20px] bg-edvora-primary">
                    <img src="/images/ikon/rekomendasi.svg" alt="" className="h-[26px] w-[26px]" />
                </span>
                <h2 className="text-[18px] font-semibold leading-[33px] text-siswa-judul">Direkomendasikan</h2>
            </div>

            {rekomendasi.length > 0 ? (
                <ul className="mt-[6px] space-y-[3px]">
                    {rekomendasi.map((topik) => (
                        <li
                            key={topik.topikId}
                            // Sedikit membesar saat kursor diarahkan, senada dengan cincin penguasaan.
                            className="flex h-[41px] items-center gap-[11px] rounded-item border border-black/[0.06] px-[5px] transition-transform duration-200 ease-out hover:scale-[1.03]"
                        >
                            <span className="flex h-[33.4px] w-[33.76px] shrink-0 items-center justify-center rounded-item bg-siswa-badge-subtes text-[13px] font-bold leading-4 text-siswa-subtes">
                                {topik.kodeSubtes}
                            </span>
                            <span className="truncate text-[14px] font-normal text-siswa-judul">{topik.namaTopik}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-3 text-[14px] leading-[20px] text-siswa-teks">
                    Selesaikan latihan mode fleksibel untuk mendapatkan rekomendasi topik.
                </p> 
            )}
        </section>
    );
}
