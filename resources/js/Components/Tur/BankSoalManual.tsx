import TurFitur, { LangkahTur } from './TurFitur';

// Target = nilai atribut data-tur di FormSoal.tsx
const LANGKAH_BANK_SOAL_MANUAL: LangkahTur[] = [
    {
        target: 'info-soal',
        posisi: 'bawah',
        teks: 'Lengkapi informasi soal, seperti kode soal, topik, tipe soal, dan tingkat kesulitan agar soal tersimpan dalam kategori yang tepat',
    },
    {
        target: 'pratinjau',
        posisi: 'bawah',
        teks: 'Periksa tampilan soal sebelum disimpan untuk memastikan isi dan opsi jawaban sudah sesuai',
    },
    {
        target: 'simpan-draft',
        posisi: 'atas',
        teks: 'Simpan soal sebagai draft jika masih perlu diperiksa atau diperbaiki sebelum dipublish',
    },
    {
        target: 'simpan-publish',
        posisi: 'atas',
        teks: 'Simpan sekaligus terbitkan soal agar dapat dikerjakan oleh siswa',
    },
];

export default function BankSoalManual({ aktif = true }: { aktif?: boolean }) {
    return <TurFitur kunci="bank-soal-manual" versi={2} langkah={LANGKAH_BANK_SOAL_MANUAL} aktif={aktif} />;
}