import TurFitur, { LangkahTur } from './TurFitur';

// Hanya satu langkah: menyorot ikon info di samping label "Selesai".
const LANGKAH_PAKET_TO: LangkahTur[] = [
    {
        target: 'info-jadwal',
        posisi: 'atas',
        bulat: true,
        jarakSorot: 6,
        teks: 'Paket akan otomatis dibuka saat waktu mulai dan ditutup saat waktu berakhir sesuai jadwal yang ditentukan',
    },
];

export default function PaketSoalTO({ aktif = true }: { aktif?: boolean }) {
    return <TurFitur kunci="paket-try-out" versi={1} langkah={LANGKAH_PAKET_TO} aktif={aktif} />;
}