import CincinProgres from './CincinProgres';

interface PenguasaanSubtes {
    kode: string | null;
    nama: string;
    persen: number; // 0–100, rata-rata semua topik subtes itu
    adaData: boolean; // false = belum ada topik dengan 20 jawaban fleksibel
}

// Ambang yang sama dengan batas "belum dikuasai" di backend (skor < 30): di bawah itu cincinnya merah.
const AMBANG_RENDAH = 30;

/** Kartu "Penguasaan Per Subtes": satu cincin progres untuk tiap subtes. */
export default function KartuPenguasaan({ penguasaanSubtes }: { penguasaanSubtes: PenguasaanSubtes[] }) {
    return (
        <section className="rounded-kartu bg-white px-[28px] py-[14px] shadow-kartu">
            <h2 className="text-[18px] font-semibold leading-[33px] text-siswa-judul-seksi">Penguasaan Per Subtes</h2>

            {/* HP sempit: 2 kolom berjarak supaya nama subtes yang panjang tidak menimpa kolom sebelah; mulai sm sama seperti desain. */}
            <ul className="mt-[22px] grid grid-cols-2 gap-x-3 gap-y-6 min-[400px]:grid-cols-3 sm:grid-cols-4 sm:gap-x-0 lg:grid-cols-7">
                {penguasaanSubtes.map((subtes) => (
                    <li key={subtes.kode ?? subtes.nama} className="group flex flex-col items-center text-center">
                        {/* Cincin sedikit membesar saat kursor diarahkan ke kolom subtesnya. */}
                        <div className="transition-transform duration-200 ease-out group-hover:scale-110">
                            <CincinProgres
                                persen={subtes.persen}
                                warnaKelas={subtes.persen < AMBANG_RENDAH ? 'stroke-siswa-cincin-rendah' : 'stroke-siswa-cincin-naik'}
                                label={`Penguasaan ${subtes.nama}`}
                            >
                                <span className="text-[18px] font-semibold leading-[33px] text-siswa-judul-kartu">
                                    {Math.round(subtes.persen)}
                                </span>
                            </CincinProgres>
                        </div>

                        <p className="mt-[13px] text-[18px] font-bold leading-4 text-siswa-subtes">{subtes.kode}</p>
                        <p className="mt-[16px] w-full max-w-[94px] break-words text-[13px] font-medium leading-4 text-siswa-teks sm:text-[15px]">{subtes.nama}</p>

                        {!subtes.adaData && <p className="mt-1 text-[11px] text-siswa-teks/80">Belum cukup data</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
