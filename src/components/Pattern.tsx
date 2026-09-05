import React, { useEffect, useMemo, useState } from "react";
import type { PatternProps } from "../types";

const ICONS: string[] = [
    '/icons/1.svg',
    '/icons/2.svg',
    '/icons/3.svg',
    '/icons/4.svg',
    '/icons/5.svg',
    '/icons/6.svg',
    '/icons/7.svg',
    '/icons/8.svg',
    '/icons/9.svg',
    '/icons/10.svg',
];

const NUM_LINES = 10;
const ICONS_PER_LINE = 30;
const LARGE_SCREEN_QUERY = '(min-width: 1024px)';

const generatePattern = (numLines: number, iconsPerLine: number, icons: string[]): string[][] => {
    const pattern: string[][] = [];
    for (let i = 0; i < numLines; i++) {
        const line: string[] = [];
        for (let j = 0; j < iconsPerLine; j++) {
            const iconIndex = (i + j) % icons.length;
            line.push(icons[iconIndex]);
        }
        pattern.push(line);
    }
    return pattern;
};

const Pattern: React.FC<PatternProps> = ({ size = 30 }) => {
    // The grid below is 300 nodes and is already hidden under lg. Keeping it out of
    // the DOM there too spares the style/layout pass on the smaller form factors.
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(LARGE_SCREEN_QUERY);
        const update = (): void => setIsLargeScreen(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    const pattern = useMemo(() =>
        generatePattern(NUM_LINES, ICONS_PER_LINE, ICONS),
        []
    );

    if (!isLargeScreen) return null;

    return (
        // Shifted left by half of (console width + row gap) so the pattern centers on the
        // cards column instead of on the row that also holds the GameBoy console.
        <div className="relative lg:right-[237px]">
            <div
                className={`items-center top-[135px] space-y-[24px] relative hidden lg:block`}
                style={{ zIndex: -1, filter: 'blur(0.5px)', opacity: 0.6 }}
            >
                {pattern.map((line, lineIndex) => (
                    <div
                        key={lineIndex}
                        className="flex justify-center items-center space-x-24px"
                    >
                        {line.map((iconSrc, iconIndex) => (
                            <div key={`${lineIndex}-${iconIndex}`}>
                                <img
                                    src={iconSrc}
                                    alt=""
                                    width={size * 2}
                                    height={size * 2}
                                    className="object-contain"
                                    decoding="async"
                                    style={{ width: size, height: size }}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div style={{
                position: 'absolute',
                inset: 0,
                boxShadow: 'inset 0 0 90px 90px #111111',
                pointerEvents: 'none',
                zIndex: 0,
            }} />
        </div>
    );
};

export default Pattern;
