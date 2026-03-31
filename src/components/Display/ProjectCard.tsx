import React, { useEffect, useRef } from 'react';
import { motion, type Variants } from "framer-motion";
import { formatRepoName } from './utils';
import Badges from './Badges';
import type { Repository } from '../../types';

interface ProjectCardProps {
    repo: Repository;
    index: number;
    activeIndex: number | null;
    setActiveIndex: (index: number | null) => void;
    setCurrentWebsite: (url: string | null) => void;
    setCartridgeSelected: (selected: boolean) => void;
    isSmallScreen: boolean;
    itemVariants: Variants;
    cardRef: React.RefObject<HTMLButtonElement | null>;
    isCartridgesInView: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
    repo,
    index,
    activeIndex,
    setActiveIndex,
    setCurrentWebsite,
    setCartridgeSelected,
    isSmallScreen,
    itemVariants,
    cardRef,
    isCartridgesInView
}) => {

    const pointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const tiltFrame = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (tiltFrame.current !== null) {
                cancelAnimationFrame(tiltFrame.current);
            }
        };
    }, []);

    const handleCardMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current || !isCartridgesInView) return;

        pointerPos.current.x = e.clientX;
        pointerPos.current.y = e.clientY;

        if (tiltFrame.current !== null) return;
        tiltFrame.current = requestAnimationFrame(() => {
            tiltFrame.current = null;
            const card = cardRef.current;
            if (!card) return;

            const { left, top, width, height } = card.getBoundingClientRect();
            const x = (pointerPos.current.x - left - width / 2) / 15;
            const y = (pointerPos.current.y - top - height / 2) / 15;

            card.style.transition = 'transform 0.3s ease-out';
            card.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg) scale3d(1.05, 1.05, 1.05)`;

            const highlight = card.querySelector<HTMLElement>('.card-highlight');
            if (highlight) {
                highlight.style.opacity = '1';
                highlight.style.transition = 'background 0.3s ease-out 0.1s, opacity 0.3s ease-out';

                const angleOffset = Math.atan2(-y, -x) * (180 / Math.PI);
                const gradientAngle = (angleOffset + 270) % 360;

                const distance = Math.sqrt(x * x + y * y);
                const intensity = 0.001 + Math.min(0.05, distance / 40);

                highlight.style.background = `linear-gradient(
            ${gradientAngle}deg,
            rgba(255,255,255,${intensity}),
            transparent 95%
          )`;
            }
        });
    };

    const handleCardMouseLeave = () => {
        if (tiltFrame.current !== null) {
            cancelAnimationFrame(tiltFrame.current);
            tiltFrame.current = null;
        }
        const card = cardRef.current;
        if (!card) return;

        card.style.transition = 'transform 0.4s ease-out';
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';

        const highlight = card.querySelector<HTMLElement>('.card-highlight');
        if (highlight) {
            highlight.style.opacity = '0';
            highlight.style.transition = 'background 0.4s ease-out, opacity 0.3s ease-out';
            highlight.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 90%)';
        }
    };

    return (
        <motion.button
            key={repo.id || index}
            ref={cardRef}
            variants={isSmallScreen ? {} : itemVariants}
            onClick={() => {
                const newIndex = index === activeIndex ? null : index;
                setActiveIndex(newIndex);
                if (newIndex === null) {
                    setCurrentWebsite(null);
                    setCartridgeSelected(false);
                }
            }}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className={`group relative
        ${isSmallScreen ? 'w-[160px] h-[160px]' : 'w-[189px] h-[190px]'}
        ${index === activeIndex ? 'ring-2 ring-amber-100/70 ring-offset-2 ring-offset-black/30 rounded-md' : ''}`}
            style={{
                transformStyle: 'preserve-3d',
                transition: 'all 0.4s ease-out'
            }}
        >
            <div
                className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/15 to-white/5 rounded-lg backdrop-blur-sm"
                style={{
                    transform: 'translateZ(20px)',
                    background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.06) 0%,
              rgba(255, 255, 255, 0.03) 50%, 
              rgba(255, 255, 255, 0.01) 100%
            )
          `,
                    boxShadow: `
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 1px 0 0 rgba(255, 255, 255, 0.2),
            inset 0 0 30px rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1),
            0 8px 32px 0 rgba(0, 0, 0, 0.37),
            0 4px 16px 0 rgba(0, 0, 0, 0.2)
          `,
                    border: '1px solid rgba(255, 255, 255, 0.18)'
                }}
            >
                <div className="absolute left-2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-white/20 via-white/10 to-white/20"></div>
                <div className="absolute left-4 top-4 bottom-4 w-[1px] bg-gradient-to-b from-white/15 via-white/5 to-white/15"></div>
                <div className="absolute right-2 top-4 bottom-4 w-[2px] bg-gradient-to-b from-white/20 via-white/10 to-white/20"></div>
                <div className="absolute right-4 top-4 bottom-4 w-[1px] bg-gradient-to-b from-white/15 via-white/5 to-white/15"></div>

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-gradient-to-b from-white/20 to-transparent rounded-b-lg"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-gradient-to-t from-white/20 to-transparent rounded-t-lg"></div>
            </div>

            <div
                className="absolute inset-0 flex items-center justify-center px-6"
                style={{ transform: 'translateZ(40px)' }}
            >
                <div className="flex flex-col items-center space-y-1 max-w-full">
                    <h2 className={`font-bold text-center bg-gradient-to-r from-white via-amber-50 to-white
            bg-clip-text text-transparent bg-[length:200%_100%] drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] leading-tight
            ${isSmallScreen ? 'text-base' : 'text-lg'}`}>
                        {formatRepoName(repo.name)}
                    </h2>

                    <p className={`text-center text-white/60
            drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] leading-tight
            ${isSmallScreen ? 'text-[10px]' : 'text-xs'}`}>
                        {repo.description.length > (isSmallScreen ? 80 : 100) ?
                            repo.description.substring(0, isSmallScreen ? 80 : 100) + '...' :
                            repo.description}
                    </p>

                    <div className={`mt-1 ${isSmallScreen ? 'w-[120px]' : 'w-[145px]'}`}>
                        <Badges languages={repo.languages} hasWebsite={!repo.isGithubPage} isPortfolio={repo.isPortfolio} />
                    </div>
                </div>
            </div>

            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-0 pointer-events-none rounded-lg card-highlight"
                style={{
                    transform: 'translateZ(25px)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 60%)',
                    transition: 'background 0.3s ease-out, opacity 0.3s ease-out'
                }}
            />
        </motion.button>
    );
};

export default ProjectCard;
