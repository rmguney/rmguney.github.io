import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";

const INK_SHADOW = "0 1px 2px rgba(0,0,0,0.1)";
import { useBalloons } from "../context/BalloonContext";
import React from "react";
import { SiDotnet, SiThreedotjs, SiUnity, SiUnrealengine, SiReact } from "react-icons/si";
import { useAdaptiveInk } from "../hooks/useAdaptiveInk";
import { TECH_COLORS } from "../constants/palette";
import type { BalloonIconData } from "../types";

const BALLOON_SPAWN = { count: 10, speed: 1.5, rotation: true } as const;

const TextBody = React.memo(function TextBody(): React.ReactElement {
    const { spawnBalloons } = useBalloons();
    const ref = useRef<HTMLDivElement>(null);

    const ink = useAdaptiveInk(ref);
    const contrastInk = ink === "#ffffff" ? "#000000" : "#ffffff";
    const isInView = useInView(ref, {
        once: false,
        amount: 0.4,
        margin: "0px 0px -100px 0px",
    });

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
            className="transition-all duration-200 inline-flex w-[22px] h-[22px] [&>svg]:w-full [&>svg]:h-full"
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

    return (
        <div className="absolute top-0 w-3/4 lg:w-1/2 h-full flex items-center justify-center p-4 lg:p-8 z-[99] pointer-events-none select-none">
            <motion.div
                ref={ref}
                className="p-8 max-w-xl"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                style={{ color: ink }}
            >
                <motion.h1
                    variants={itemVariants}
                    className="text-4xl md:text-5xl font-semibold lg:tracking-[0.2em]"
                    style={{ textShadow: INK_SHADOW }}
                >
                    R.MELIH GUNEY
                </motion.h1>
                <motion.small
                    variants={itemVariants}
                    className="font-medium text-xs lg:tracking-[0.2em]"
                    style={{ textShadow: INK_SHADOW }}
                >
                    Software Engineer, MSc
                </motion.small>
                <motion.p
                    variants={itemVariants}
                    className="text-sm lg:leading-relaxed mt-4 lg:tracking-[0.03em] md:text-justify"
                    style={{ textShadow: INK_SHADOW }}
                >
                    Hello! I work on interactive systems and computer graphics, and this is my personal portfolio, showcasing my open source projects ranging from games and simulations to low level graphics programming. Feel free to check my{" "}
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
                        style={{ color: ink, textShadow: INK_SHADOW }}
                    >
                        LinkedIn
                    </motion.a>{" "}
                    for my professional background, and to reach out, cheers!
                </motion.p>

                <motion.div
                    variants={balloonIconContainerVariants}
                    initial="hidden"
                    animate={isInView ? "show" : "hidden"}
                    className="grid grid-cols-5 md:grid-cols-10 lg:flex lg:items-center gap-2 mt-3"
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
                                    style={{ color: iconData.color, textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
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



