import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Ubah nilai ini ke false bila ingin onboarding muncul di setiap kunjungan (pengujian/debugging)
export const ONBOARDING_SHOW_ONCE = true;
const STORAGE_KEY = 'edvora_peringkat_onboarding_done';

export function shouldShowOnboarding(): boolean {
    if (!ONBOARDING_SHOW_ONCE) return true;
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
        return false;
    }
}

export function markOnboardingDone(): void {
    try {
        localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
        // Abaikan jika localStorage tidak didukung / diblokir browser
    }
}

interface RectBox {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
}

interface PeringkatOnboardingProps {
    tabRef: React.RefObject<HTMLElement | null>;
    podiumRef?: React.RefObject<HTMLElement | null>;
    daftarRef?: React.RefObject<HTMLElement | null>;
    onActiveChange?: (active: boolean) => void;
}

export default function PeringkatOnboarding({
    tabRef,
    podiumRef,
    daftarRef,
    onActiveChange,
}: PeringkatOnboardingProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const bubbleRef = useRef<HTMLDivElement>(null);
    const selesaiBtnRef = useRef<HTMLButtonElement>(null);

    const [boxes, setBoxes] = useState<RectBox[]>([]);
    const [bubblePos, setBubblePos] = useState({
        left: 0,
        top: 0,
        width: 600,
        tailLeft: 300,
    });

    const updateGeometry = () => {
        if (!tabRef.current) return;

        const tabRect = tabRef.current.getBoundingClientRect();
        const newBoxes: RectBox[] = [];

        // 1. Wadah tab switcher
        newBoxes.push({
            x: tabRect.left - 4,
            y: tabRect.top - 4,
            width: tabRect.width + 8,
            height: tabRect.height + 8,
            rx: 16,
        });

        // 2. Kartu podium (bisa 1 kotak wadah atau per kartu)
        if (podiumRef?.current) {
            const podiumCards = podiumRef.current.querySelectorAll(':scope > div');
            if (podiumCards.length > 0) {
                podiumCards.forEach((card) => {
                    const r = card.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        newBoxes.push({
                            x: r.left - 4,
                            y: r.top - 4,
                            width: r.width + 8,
                            height: r.height + 8,
                            rx: 20,
                        });
                    }
                });
            } else {
                const pRect = podiumRef.current.getBoundingClientRect();
                if (pRect.width > 0 && pRect.height > 0) {
                    newBoxes.push({
                        x: pRect.left - 4,
                        y: pRect.top - 4,
                        width: pRect.width + 8,
                        height: pRect.height + 8,
                        rx: 20,
                    });
                }
            }
        }

        // 3. Tabel daftar peringkat
        if (daftarRef?.current) {
            const dRect = daftarRef.current.getBoundingClientRect();
            if (dRect.width > 0 && dRect.height > 0) {
                newBoxes.push({
                    x: dRect.left - 4,
                    y: dRect.top - 4,
                    width: dRect.width + 8,
                    height: dRect.height + 8,
                    rx: 20,
                });
            }
        }

        setBoxes(newBoxes);

        // Cari tombol tab "Pemeringkatan Khusus"
        const buttons = tabRef.current.querySelectorAll('button');
        const khususBtn =
            Array.from(buttons).find((b) => b.textContent?.includes('Khusus')) ??
            buttons[1] ??
            buttons[0];

        const khususRect = khususBtn?.getBoundingClientRect();
        const khususCenterX = khususRect
            ? khususRect.left + khususRect.width / 2
            : tabRect.left + (tabRect.width * 3) / 4;

        const maxWidth = 640;
        const padding = 16;
        const bubbleWidth = Math.min(maxWidth, window.innerWidth - padding * 2);
        const bubbleHeight = bubbleRef.current?.offsetHeight ?? 190;
        const gap = 16;

        // Pusatkan bubble di atas wadah tab, batasi dalam viewport
        let left = tabRect.left + tabRect.width / 2 - bubbleWidth / 2;
        left = Math.max(padding, Math.min(window.innerWidth - padding - bubbleWidth, left));

        // Letakkan bubble di atas tab switcher
        let top = tabRect.top - bubbleHeight - gap;
        if (top < padding) {
            top = padding;
        }

        // Posisi ekor mengarah ke tengah tombol "Pemeringkatan Khusus"
        let tailLeft = khususCenterX - left;
        tailLeft = Math.max(28, Math.min(bubbleWidth - 28, tailLeft));

        setBubblePos({
            left,
            top,
            width: bubbleWidth,
            tailLeft,
        });
    };

    // Inisialisasi setelah DOM termuat
    useEffect(() => {
        if (!shouldShowOnboarding()) return;

        // Beri jeda singkat agar animasi kemunculan elemen selesai dan posisi stabil
        const timer = setTimeout(() => {
            setIsMounted(true);
            onActiveChange?.(true);
            requestAnimationFrame(() => {
                updateGeometry();
                setIsVisible(true);
            });
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    // Fokuskan tombol "Selesai" saat dialog dibuka
    useEffect(() => {
        if (isVisible && selesaiBtnRef.current) {
            selesaiBtnRef.current.focus();
        }
    }, [isVisible]);

    // Kunci scroll dan dengarkan resize / scroll saat spotlight aktif
    useEffect(() => {
        if (!isMounted) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleResize = () => {
            updateGeometry();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [isMounted]);

    const handleClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        setIsVisible(false);
        markOnboardingDone();

        setTimeout(() => {
            setIsMounted(false);
            onActiveChange?.(false);
        }, 200);
    };

    useEffect(() => {
        if (!isMounted) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMounted, isClosing]);

    if (!isMounted || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            className={`fixed inset-0 z-40 transition-opacity duration-200 ${
                isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
            }`}
            aria-live="polite"
        >
            {/* SVG Mask untuk membuat sorotan transparan bertepi halus pada elemen-elemen penting */}
            <svg
                className="pointer-events-auto fixed inset-0 h-full w-full select-none"
                style={{ width: '100vw', height: '100vh' }}
                aria-hidden="true"
            >
                <defs>
                    <filter id="spotlight-glow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <mask id="spotlight-mask">
                        {/* Latar putih = area tertutup overlay gelap */}
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {/* Area hitam = lubang transparan agar elemen di bawahnya tetap terang */}
                        {boxes.map((b, i) => (
                            <rect
                                key={i}
                                x={b.x}
                                y={b.y}
                                width={b.width}
                                height={b.height}
                                rx={b.rx}
                                fill="black"
                            />
                        ))}
                    </mask>
                </defs>

                {/* Lapisan gelap pekat (dark navy-black) yang menutupi seluruh halaman */}
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(10, 18, 36, 0.72)"
                    mask="url(#spotlight-mask)"
                />

                {/* Garis pendar lembut biru (soft blue glow) di sekeliling area yang disorot */}
                {boxes.map((b, i) => (
                    <rect
                        key={i}
                        x={b.x}
                        y={b.y}
                        width={b.width}
                        height={b.height}
                        rx={b.rx}
                        fill="none"
                        stroke="rgba(120, 160, 255, 0.75)"
                        strokeWidth="2.5"
                        filter="url(#spotlight-glow)"
                    />
                ))}
            </svg>

            {/* Balon ucapan (speech bubble) di atas tab switcher */}
            <div
                ref={bubbleRef}
                role="dialog"
                aria-modal="true"
                aria-label="Panduan Pemeringkatan Try Out"
                className="pointer-events-auto fixed z-50 rounded-[24px] bg-white p-6 shadow-2xl transition-all duration-200 sm:p-8"
                style={{
                    left: `${bubblePos.left}px`,
                    top: `${bubblePos.top}px`,
                    width: `${bubblePos.width}px`,
                    maxWidth: '640px',
                    filter: 'drop-shadow(0 12px 32px rgba(0, 0, 0, 0.25))',
                }}
            >
                <p className="font-poppins text-[17px] font-medium leading-[1.45] text-[#26355D] sm:text-[20px]">
                    Disini kamu bisa melihat posisi dan peluangmu berdasarkan universitas dan program studi pilihanmu
                </p>

                {/* Tombol selesai di kanan bawah balon */}
                <div className="mt-5 flex justify-end">
                    <button
                        ref={selesaiBtnRef}
                        type="button"
                        onClick={handleClose}
                        className="rounded-full bg-gradient-to-r from-[#658FDF] to-[#4F77C2] px-6 py-2 text-[14px] font-bold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5B88DD] focus:ring-offset-2"
                    >
                        Selesai
                    </button>
                </div>

                {/* Ekor segitiga mengarah ke bawah, lurus ke tombol tab Pemeringkatan Khusus */}
                <svg
                    className="absolute -bottom-[11px] text-white"
                    style={{ left: `${bubblePos.tailLeft}px`, transform: 'translateX(-50%)' }}
                    width="22"
                    height="12"
                    viewBox="0 0 22 12"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path d="M0 0 L22 0 L12.1 10.8 C11.5 11.4 10.5 11.4 9.9 10.8 L0 0 Z" />
                </svg>
            </div>
        </div>,
        document.body
    );
}
