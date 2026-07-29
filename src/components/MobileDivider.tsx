import { FaCaretDown, FaCaretUp } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';

const MobileDivider: React.FC = () => {
    const [isInUpperHalf, setIsInUpperHalf] = useState<boolean>(true);
    const animationFrameId = useRef<number | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleScroll = (): void => {
            const el = rootRef.current;
            if (!el) return;
            setIsInUpperHalf(el.getBoundingClientRect().top > window.innerHeight / 2);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, []);

    const cancelScroll = (): void => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    };

    useEffect(() => {
        const userScrollHandler = (): void => cancelScroll();

        window.addEventListener('wheel', userScrollHandler, { passive: true });
        window.addEventListener('touchmove', userScrollHandler, { passive: true });
        window.addEventListener('keydown', userScrollHandler, { passive: true });

        return () => {
            window.removeEventListener('wheel', userScrollHandler);
            window.removeEventListener('touchmove', userScrollHandler);
            window.removeEventListener('keydown', userScrollHandler);
        };
    }, []);

    const smoothScroll = (targetPosition: number): void => {
        cancelScroll();

        const duration = 1000;
        const start = window.pageYOffset;
        const distance = targetPosition - start;
        let startTime: number | null = null;

        const animation = (currentTime: number): void => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            const ease = (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            window.scrollTo(0, start + distance * ease(progress));

            if (timeElapsed < duration) {
                animationFrameId.current = requestAnimationFrame(animation);
            }
        };

        animationFrameId.current = requestAnimationFrame(animation);
    };

    const handleClick = (): void => {
        if (isInUpperHalf) {
            smoothScroll(document.documentElement.scrollHeight - window.innerHeight);
        } else {
            smoothScroll(0);
        }
    };

    return (
        <div ref={rootRef} className="absolute -bottom-1 w-full flex flex-col justify-between items-center p-5 bg-[#111111] z-998 lg:hidden">
            <div className="flex flex-col items-center cursor-pointer" onClick={handleClick}>
                {isInUpperHalf ? <FaCaretDown className="text-white" size="20" /> : <FaCaretUp className="text-white" size="20" />}
            </div>
        </div>
    );
};

export default MobileDivider;
