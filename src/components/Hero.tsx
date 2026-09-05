import { motion, useInView, type Variants } from "framer-motion";
import { useRef, useEffect } from "react";
import { useBalloons } from "../context/BalloonContext";
import React from "react";
import { SiDotnet, SiThreedotjs, SiUnity, SiUnrealengine, SiReact } from "react-icons/si";
import { useAdaptiveInk } from "../hooks/useAdaptiveInk";
import { getModelScreen } from "../utils/modelProbe";
import { TECH_COLORS } from "../constants/palette";
import type { BalloonIconData } from "../types";

const BALLOON_SPAWN = { count: 10, speed: 1.5, rotation: true } as const;

const CUT_PADDING = 1.05;
const CUT_FEATHER = 30;

const TextBody = React.memo(function TextBody(): React.ReactElement {
    const { spawnBalloons } = useBalloons();
    const ref = useRef<HTMLDivElement>(null);

    const ink = useAdaptiveInk(ref);
    const inkChannel = parseInt(ink.slice(1, 3), 16);
    const contrastChannel = (255 - inkChannel).toString(16).padStart(2, "0");
    const contrastInk = `#${contrastChannel}${contrastChannel}${contrastChannel}`;
    const isInView = useInView(ref, {
        once: false,
        amount: 0.4,
        margin: "0px 0px -100px 0px",
    });

    const haloSoft = "0 1px 1px #00000033";

    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame = 0;
        let rect: DOMRect | null = null;
        let stale = true;
        const invalidate = (): void => { stale = true; };

        const tick = (): void => {
            frame = requestAnimationFrame(tick);
            const el = panelRef.current;
            if (!el) return;
            if (stale || !rect) { rect = el.getBoundingClientRect(); stale = false; }

            const model = getModelScreen();
            const r = model.radius * CUT_PADDING;
            const overlaps = model.visible
                && model.x + r > rect.left && model.x - r < rect.right
                && model.y + r > rect.top && model.y - r < rect.bottom;

            el.style.setProperty("--cut-x", `${model.x - rect.left}px`);
            el.style.setProperty("--cut-y", `${model.y - rect.top}px`);
            el.style.setProperty("--cut-r", overlaps ? `${r}px` : "0px");
            el.style.setProperty("--cut-f", overlaps ? `${CUT_FEATHER}px` : "0px");
        };

        frame = requestAnimationFrame(tick);
        window.addEventListener("resize", invalidate);
        window.addEventListener("scroll", invalidate, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", invalidate);
            window.removeEventListener("scroll", invalidate);
        };
    }, []);

    const cutMask = "radial-gradient(circle at var(--cut-x, -999px) var(--cut-y, -999px),"
        + " transparent 0 var(--cut-r, 0px),"
        + " #000 calc(var(--cut-r, 0px) + var(--cut-f, 0px)) 100%)";

    const discMask = "radial-gradient(circle at var(--cut-x, -999px) var(--cut-y, -999px),"
        + " #000 0 var(--cut-r, 0px),"
        + " transparent calc(var(--cut-r, 0px) + var(--cut-f, 0px)) 100%)";

    const dotMask = "radial-gradient(circle at center, #000 0 1.15px, transparent 1.75px)";
    const panelFill = `linear-gradient(180deg, ${contrastInk}3D 0%, ${contrastInk}2E 55%, ${contrastInk}1A 100%)`;

    const containerVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.1 },
        },
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" },
        },
    };

    const titleGroupVariants: Variants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
    };

    const balloonIcons: BalloonIconData[] = [
        {
            icon: <SiUnrealengine size={44} />,
            color: TECH_COLORS.unreal,
            name: "Unreal",
        },
        {
            icon: <SiUnity size={44} />,
            color: TECH_COLORS.unity,
            name: "Unity",
        },
        {
            icon: <SiThreedotjs size={44} />,
            color: TECH_COLORS.three,
            name: "Three.js",
        },
        {
            icon: <SiReact size={44} />,
            color: TECH_COLORS.react,
            name: "React",
        },
        {
            icon: (
                <span
                    className="inline-flex w-full h-full items-center justify-center rounded-full"
                    style={{ backgroundColor: "currentColor" }}
                >
                    <span className="inline-flex dotnet-glyph" style={{ color: contrastInk }}>
                        <SiDotnet size={16} />
                    </span>
                </span>
            ),
            color: TECH_COLORS.dotnet,
            name: ".NET",
        },
    ];

    const renderIcon = ({ icon, color }: BalloonIconData): React.ReactElement => (
        <span
            aria-hidden="true"
            className="inline-flex w-[22px] h-[22px] [&>svg]:w-full [&>svg]:h-full"
            style={{
                color: "inherit",
                ["--hover-color" as string]: color,
                backfaceVisibility: "hidden",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = color)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "inherit")}
        >
            {icon}
        </span>
    );

    const balloonIconContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.3 },
        },
    };

    const balloonIconItemVariants: Variants = {
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 100, damping: 12 },
        },
    };

    const corner = (place: string, edges: string, round: string): React.ReactElement => (
        <span
            aria-hidden="true"
            className={`absolute w-5 h-5 ${place} ${edges} ${round}`}
            style={{ borderColor: ink, opacity: 0.5 }}
        />
    );

    return (
        <div className="absolute top-0 w-3/5 lg:w-1/2 h-full flex items-center justify-center p-3 lg:p-5 z-[99] pointer-events-none select-none">
            <motion.div
                ref={ref}
                className="max-w-xl"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                style={{ color: ink }}
            >
                <div ref={panelRef} className="relative p-3 md:px-5 md:py-4">
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                            background: panelFill,
                            border: `1px solid ${ink}26`,
                            backdropFilter: "blur(3px)",
                            WebkitBackdropFilter: "blur(3px)",
                            maskImage: cutMask,
                            WebkitMaskImage: cutMask,
                        }}
                    />
                    <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                            background: panelFill,
                            backdropFilter: "blur(3px)",
                            WebkitBackdropFilter: "blur(3px)",
                            maskImage: `${dotMask}, ${discMask}`,
                            WebkitMaskImage: `${dotMask}, ${discMask}`,
                            maskSize: "6px 6px, 100% 100%",
                            WebkitMaskSize: "6px 6px, 100% 100%",
                            maskRepeat: "repeat, no-repeat",
                            WebkitMaskRepeat: "repeat, no-repeat",
                            maskComposite: "intersect",
                            WebkitMaskComposite: "source-in",
                        }}
                    />
                    {corner("-top-px -left-px", "border-t border-l", "rounded-tl-2xl")}
                    {corner("-top-px -right-px", "border-t border-r", "rounded-tr-2xl")}
                    {corner("-bottom-px -left-px", "border-b border-l", "rounded-bl-2xl")}
                    {corner("-bottom-px -right-px", "border-b border-r", "rounded-br-2xl")}

                    <div className="relative">
                        <motion.div variants={titleGroupVariants} className="w-full">
                            <motion.h1
                                variants={itemVariants}
                                className="whitespace-nowrap text-[clamp(1.1rem,5.5vw,2.25rem)] md:text-[clamp(1.25rem,4.8vw,3.75rem)] font-black leading-[0.9] tracking-[-0.065em]"
                                style={{
                                    fontFamily: '"Helvetica Neue", Arial, sans-serif',
                                    textShadow: haloSoft,
                                }}
                            >
                                R. Melih Güney
                            </motion.h1>
                            <motion.p
                                variants={itemVariants}
                                className="mt-1 ml-1 whitespace-nowrap text-[clamp(0.5rem,2.4vw,0.8rem)] md:text-[clamp(0.6rem,1.2vw,0.8rem)] font-semibold uppercase leading-none tracking-[0.15em] md:tracking-[0.25em]"
                                style={{ textShadow: haloSoft }}
                            >
                                Software Engineer, MSc
                            </motion.p>
                        </motion.div>
                        <motion.p
                            variants={itemVariants}
                            className="mt-4 md:mt-6 max-w-[58ch] text-left md:text-justify text-xs md:text-sm leading-[1.55] md:leading-[1.65] tracking-[-0.02em]"
                            style={{ textShadow: haloSoft }}
                        >
                            Hello! I work on interactive systems and graphics, and this is my personal portfolio, showcasing my public projects spanning games, simulations, and low-level graphics programming. Feel free to check my{" "}
                            <motion.a
                                href="https://linkedin.com/in/rmguney"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer font-medium inline-block pointer-events-auto underline decoration-from-font underline-offset-2"
                                whileHover={{
                                    scale: 1.05,
                                    color: "#0A66C2"
                                }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                style={{ color: ink, textShadow: haloSoft }}
                            >
                                LinkedIn
                            </motion.a>{" "}
                            for my professional background, and to reach out, cheers!
                        </motion.p>
                    </div>
                </div>

                <motion.div
                    variants={balloonIconContainerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                    className="grid grid-cols-5 md:grid-cols-10 lg:flex lg:items-center gap-2 mt-3 px-5 md:px-6"
                >
                    <div className="contents lg:flex lg:space-x-5">
                        {balloonIcons.map((iconData, index) => (
                            <motion.div
                                key={index}
                                variants={balloonIconItemVariants}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                role="button"
                                aria-label={`Spawn ${iconData.name} balloons`}
                                className="cursor-pointer relative group drop-shadow-sm pointer-events-auto"
                                style={{ backfaceVisibility: "hidden", willChange: "transform" }}
                                onClick={() =>
                                    spawnBalloons(
                                        iconData.color,
                                        BALLOON_SPAWN.count,
                                        BALLOON_SPAWN.speed,
                                        undefined,
                                        BALLOON_SPAWN.rotation
                                    )
                                }
                            >
                                {renderIcon(iconData)}
                                <span
                                    className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 opacity-0 lg:group-hover:opacity-100 text-[9px] transition-opacity pointer-events-none whitespace-nowrap"
                                    style={{ color: iconData.color, textShadow: haloSoft }}
                                >
                                    {iconData.name}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
});

export default TextBody;
