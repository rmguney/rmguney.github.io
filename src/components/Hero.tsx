import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";
import { useBalloons } from "../context/BalloonContext";
import React from "react";
import { SiDotnet, SiThreedotjs, SiUnity, SiUnrealengine, SiReact } from "react-icons/si";
import type { BalloonIconData } from "../types";

const TextBody = React.memo(function TextBody(): React.ReactElement {
    const { spawnBalloons } = useBalloons();
    const ref = useRef<HTMLDivElement>(null);
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
            hoverColor: "#2AE5B2",
            name: "Unreal",
            description: "",
            sceneColor: "#89d9c4",
            nameClassName: "text-teal-600",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            icon: <SiUnity size={44} />,
            hoverColor: "#ff0066",
            name: "Unity",
            description: "",
            sceneColor: "#ffa8cb",
            nameClassName: "text-rose-500",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            icon: <SiThreedotjs size={44} />,
            hoverColor: "#696969",
            name: "Three.js",
            description: "",
            sceneColor: "#C2C8D6",
            nameClassName: "text-neutral-600",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            icon: <SiReact size={44} />,
            hoverColor: "#61DAFB",
            name: "React",
            description: "",
            sceneColor: "#85c7ed",
            nameClassName: "text-sky-500",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            icon: (
                <span
                    className="inline-flex w-full h-full items-center justify-center rounded-full"
                    style={{ backgroundColor: "currentColor" }}
                >
                    <SiDotnet size={16} fill="#ffffff" color="#ffffff" />
                </span>
            ),
            hoverColor: "#512BD4",
            name: ".NET",
            description: "",
            sceneColor: "#9e8ed4",
            nameClassName: "text-violet-600",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
    ];

    const renderIcon = ({ icon, hoverColor }: BalloonIconData): React.ReactElement => (
        <span
            aria-hidden="true"
            className="transition-all duration-200 inline-flex w-[22px] h-[22px] [&>svg]:w-full [&>svg]:h-full"
            style={{
                color: "#111111",
                ["--hover-color" as string]: hoverColor ?? "#000000",
                backfaceVisibility: "hidden",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor ?? "#000000")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#111111")}
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
            >
                <motion.h1
                    variants={itemVariants}
                    className="text-4xl md:text-5xl font-semibold text-[#0f0f0f] lg:tracking-[0.2em]"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                >
                    R.MELIH GUNEY
                </motion.h1>
                <motion.small
                    variants={itemVariants}
                    className="text-[#0f0f0f] font-medium text-xs lg:tracking-[0.2em]"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                >
                    Software Engineer, MSc
                </motion.small>
                <motion.p
                    variants={itemVariants}
                    className="text-sm lg:leading-relaxed text-[#0f0f0f] mt-4 lg:tracking-[0.03em] md:text-justify"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                >
                    Hello! I work on interactive systems and computer graphics, and this is my personal portfolio, showcasing my open source projects ranging from games and simulations to low level graphics programming. Feel free to check my{" "}
                    <motion.a
                        href="https://linkedin.com/in/rmguney"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer font-medium inline-block text-[#0f0f0f] pointer-events-auto"
                        whileHover={{
                            scale: 1.05,
                            color: "#0A66C2"
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
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
                                        iconData.sceneColor,
                                        iconData.balloonOptions.count,
                                        iconData.balloonOptions.speed,
                                        iconData.balloonOptions.size,
                                        iconData.balloonOptions.rotation
                                    )
                                }
                            >
                                {renderIcon(iconData)}
                                <span
                                    className={`absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 opacity-0 lg:group-hover:opacity-100 text-[9px] transition-opacity pointer-events-none whitespace-nowrap ${iconData.nameClassName ?? "text-neutral-900"
                                        }`}
                                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                                >
                                    {iconData.name}
                                </span>
                                <span
                                    className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 opacity-0 lg:group-hover:opacity-100 text-[8px] text-neutral-800 transition-opacity pointer-events-none whitespace-nowrap"
                                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                                >
                                    {iconData.description}
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
