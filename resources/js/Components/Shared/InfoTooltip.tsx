import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface InfoTooltipProps {
    text: string;
    placement?: 'top' | 'left';
    tone?: 'default' | 'light';
    className?: string;
}

export default function InfoTooltip({
    text,
    placement = 'top',
    tone = 'default',
    className = '',
}: InfoTooltipProps) {
    const tooltipId = useId();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isTapped, setIsTapped] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const [pos, setPos] = useState({
        place: 'top' as 'top' | 'bottom' | 'left',
        left: 0,
        bottom: 0,
        top: 0,
        width: 310,
        tailLeft: 26,
        tailTop: 20,
    });

    const isOpen = isHovered || isFocused || isTapped;

    const calculatePosition = () => {
        if (!buttonRef.current) return null;
        const rect = buttonRef.current.getBoundingClientRect();
        const iconCenterX = rect.left + rect.width / 2;
        const iconCenterY = rect.top + rect.height / 2;

        const maxWidth = 310;
        const padding = 16;
        const bubbleWidth = Math.min(maxWidth, window.innerWidth - padding * 2);
        const bubbleHeight = tooltipRef.current?.offsetHeight ?? 110;
        const gap = 8;

        if (placement === 'left') {
            const spaceOnLeft = rect.left - gap;
            // Jika ada cukup ruang di sebelah kiri ikon, posisikan di kiri
            if (spaceOnLeft >= bubbleWidth + padding) {
                const left = rect.left - gap - bubbleWidth;
                let top = iconCenterY - bubbleHeight / 2;

                // Pastikan tidak meluap ke atas atau bawah viewport
                if (top < padding) {
                    top = padding;
                } else if (top + bubbleHeight > window.innerHeight - padding) {
                    top = window.innerHeight - padding - bubbleHeight;
                }

                let tailTop = iconCenterY - top;
                tailTop = Math.max(16, Math.min(bubbleHeight - 16, tailTop));

                return {
                    place: 'left' as const,
                    left,
                    bottom: 0,
                    top,
                    width: bubbleWidth,
                    tailLeft: 0,
                    tailTop,
                };
            }
            // Jika ruang kiri tidak cukup, otomatis jatuh ke mode atas/bawah (fallback)
        }

        // Mode atas / bawah (default top atau fallback dari left)
        const placeBelow = rect.top < 120;
        const place = placeBelow ? ('bottom' as const) : ('top' as const);

        const tailMargin = 26;
        // Default: gelembung melebar ke kanan, ekor di kiri dekat ikon
        let left = iconCenterX - tailMargin;

        // Jika melebar ke kanan melewati batas kanan layar, balik ke kiri dengan ekor di kanan dekat ikon
        if (left + bubbleWidth > window.innerWidth - padding) {
            left = iconCenterX - (bubbleWidth - tailMargin);
        }

        // Pastikan tidak keluar dari batas viewport
        if (left < padding) {
            left = padding;
        }
        if (left + bubbleWidth > window.innerWidth - padding) {
            left = window.innerWidth - padding - bubbleWidth;
        }

        // Posisi horizontal ekor agar selalu tepat mengarah ke tengah ikon
        let tailLeft = iconCenterX - left;
        tailLeft = Math.max(18, Math.min(bubbleWidth - 18, tailLeft));

        return {
            place,
            left,
            bottom: window.innerHeight - rect.top + gap,
            top: rect.bottom + gap,
            width: bubbleWidth,
            tailLeft,
            tailTop: 0,
        };
    };

    useEffect(() => {
        if (isOpen) {
            const nextPos = calculatePosition();
            if (nextPos) {
                setPos(nextPos);
            }
            setIsMounted(true);
            const frame = requestAnimationFrame(() => {
                // Hitung ulang dengan tinggi DOM riil setelah elemen terpasang
                const accuratePos = calculatePosition();
                if (accuratePos) {
                    setPos(accuratePos);
                }
                setIsVisible(true);
            });
            // Re-evaluasi bila elemen induk bertransisi (mis. kartu membesar saat hover)
            const timer = setTimeout(() => {
                const refreshedPos = calculatePosition();
                if (refreshedPos) {
                    setPos(refreshedPos);
                }
            }, 200);

            return () => {
                cancelAnimationFrame(frame);
                clearTimeout(timer);
            };
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setIsMounted(false);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Perbarui posisi saat scroll atau resize jika tooltip sedang terbuka
    useEffect(() => {
        if (!isOpen) return;
        const handleUpdate = () => {
            const nextPos = calculatePosition();
            if (nextPos) setPos(nextPos);
        };
        window.addEventListener('scroll', handleUpdate, true);
        window.addEventListener('resize', handleUpdate);
        return () => {
            window.removeEventListener('scroll', handleUpdate, true);
            window.removeEventListener('resize', handleUpdate);
        };
    }, [isOpen]);

    // Tutup saat klik di luar untuk perangkat sentuh (tap)
    useEffect(() => {
        if (!isTapped) return;
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setIsTapped(false);
            }
        };
        document.addEventListener('pointerdown', handleOutsideClick);
        return () => document.removeEventListener('pointerdown', handleOutsideClick);
    }, [isTapped]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsHovered(false);
            setIsFocused(false);
            setIsTapped(false);
        }
    };

    return (
        <span className="inline-flex items-center align-middle">
            <button
                ref={buttonRef}
                type="button"
                aria-describedby={tooltipId}
                aria-label="Informasi"
                className={
                    tone === 'light'
                        ? `inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 ${className}`
                        : `inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#C9CCD3] transition-colors hover:text-[#AEB3BD] focus:outline-none focus-visible:ring-2 focus-visible:ring-siswa-subtes focus-visible:ring-offset-1 ${className}`
                }
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onClick={() => setIsTapped((prev) => !prev)}
                onKeyDown={handleKeyDown}
            >
                {tone === 'light' ? (
                    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="9" cy="9" r="9" fill="white" />
                        <circle cx="9" cy="5.25" r="1.15" fill="#4F77C2" />
                        <rect x="7.95" y="7.5" width="2.1" height="5.8" rx="1.05" fill="#4F77C2" />
                    </svg>
                ) : (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                        <circle cx="8" cy="4.75" r="1" fill="white" />
                        <rect x="7.1" y="6.75" width="1.8" height="5" rx="0.9" fill="white" />
                    </svg>
                )}
            </button>

            {isMounted && typeof document !== 'undefined' && createPortal(
                <div
                    ref={tooltipRef}
                    id={tooltipId}
                    role="tooltip"
                    className={`pointer-events-none fixed z-[60] transition-all duration-150 ease-out ${
                        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
                    style={{
                        left: `${pos.left}px`,
                        ...(pos.place === 'left'
                            ? { top: `${pos.top}px` }
                            : pos.place === 'bottom'
                            ? { top: `${pos.top}px` }
                            : { bottom: `${pos.bottom}px` }),
                        width: `${pos.width}px`,
                        filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.15))',
                    }}
                >
                    <div className="relative rounded-[18px] bg-white px-5 py-4 text-left font-poppins text-[13.5px] font-medium leading-[1.65] text-siswa-judul">
                        {text}

                        {/* Ekor ke kanan saat bubble di kiri */}
                        {pos.place === 'left' && (
                            <svg
                                className="absolute -right-[8px] text-white"
                                style={{ top: `${pos.tailTop}px`, transform: 'translateY(-50%)' }}
                                width="9"
                                height="16"
                                viewBox="0 0 9 16"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M0 0 L0 16 L8.1 8.8 C8.6 8.4 8.6 7.6 8.1 7.2 L0 0 Z" />
                            </svg>
                        )}

                        {/* Ekor ke bawah saat bubble di atas */}
                        {pos.place === 'top' && (
                            <svg
                                className="absolute -bottom-[8px] text-white"
                                style={{ left: `${pos.tailLeft}px`, transform: 'translateX(-50%)' }}
                                width="16"
                                height="9"
                                viewBox="0 0 16 9"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M0 0 L16 0 L8.8 8.1 C8.4 8.6 7.6 8.6 7.2 8.1 L0 0 Z" />
                            </svg>
                        )}

                        {/* Ekor ke atas saat bubble di bawah */}
                        {pos.place === 'bottom' && (
                            <svg
                                className="absolute -top-[8px] text-white"
                                style={{ left: `${pos.tailLeft}px`, transform: 'translateX(-50%)' }}
                                width="16"
                                height="9"
                                viewBox="0 0 16 9"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M0 9 L16 9 L8.8 0.9 C8.4 0.4 7.6 0.4 7.2 0.9 L0 9 Z" />
                            </svg>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </span>
    );
}
