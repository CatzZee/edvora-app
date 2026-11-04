import KartuStat from './KartuStat';

interface BannerSapaanProps {
    nama: string;
    level: number;
    poin: number;
}

/** Banner sapaan di puncak Beranda, berisi nama siswa serta Level dan Poin. */
export default function BannerSapaan({ nama, level, poin }: BannerSapaanProps) {
    return (
        // Di HP (di bawah sm) sapaan dan kotak statistik disusun ke bawah supaya nama panjang tidak mendorong kotak keluar banner.
        <section className="flex min-h-[83px] flex-col items-start gap-3 rounded-kartu bg-gradient-to-l from-siswa-banner-awal to-siswa-banner-akhir px-[26px] py-4 shadow-kartu sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
                <h1 className="break-words text-[24px] font-semibold leading-tight text-white">Halo, {nama}!</h1>
                <p className="mt-1 text-[15px] font-normal leading-tight text-white">Siap kejar target Drill Soal?</p>
            </div>

            <dl className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:shrink-0 sm:gap-6">
                <KartuStat label="Level" nilai={level} />
                <KartuStat label="Poin" nilai={poin} />
            </dl>
        </section>
    );
}
