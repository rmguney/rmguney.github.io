import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useBalloons } from "../context/BalloonContext";
import React from "react";
import type { BalloonIconData } from "../types";

const TextBody = React.memo(function TextBody(): React.ReactElement {
    const { spawnBalloons } = useBalloons();
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, {
        once: false,
        amount: 0.4,
        margin: "0px 0px -100px 0px",
    });

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" },
        },
    };

    const balloonIcons: BalloonIconData[] = [
        {
            img: "/balloon-icons/unreal.webp",
            name: "Unreal",
            description: "",
            sceneColor: "#C9C0C0",
            nameClassName: "text-neutral-900",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            img: "/balloon-icons/unity.webp",
            name: "Unity",
            description: "",
            sceneColor: "#C3C7CD",
            nameClassName: "text-neutral-900",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            img: "/balloon-icons/three.png",
            name: "Three.js",
            description: "",
            sceneColor: "#C2C8D6",
            nameClassName: "text-neutral-900",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            img: "/balloon-icons/react.png",
            name: "React",
            description: "",
            sceneColor: "#85c7ed",
            nameClassName: "text-sky-600",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
        {
            img: "/balloon-icons/net.png",
            name: ".NET",
            description: "",
            sceneColor: "#BBB0D6",
            nameClassName: "text-violet-600",
            balloonOptions: { count: 10, speed: 1.5, rotation: true },
        },
    ];

    const renderIcon = ({ img, name }: BalloonIconData): React.ReactElement => (
        <img
            src={img}
            alt={name}
            width={22}
            height={22}
            className="transition-all duration-200 grayscale group-hover:grayscale-0 group-hover:scale-110 drop-shadow-sm group-hover:drop-shadow-md"
        />
    );

    const balloonIconContainerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.3 },
        },
    };

    const balloonIconItemVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.8 },
        show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring", stiffness: 100, damping: 12 },
        },
    };

    return (
        <div className="absolute top-0 w-3/4 lg:w-1/2 h-full flex items-center justify-center p-4 lg:p-8 z-[99]">
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
                    Hello! I work on interactive systems and computer graphics, and this is my personal portfolio, showcasing my open source projects ranging from games to simulations, as well as experimental low level graphics work. Feel free to check my{" "}
                    <motion.a
                        href="https://linkedin.com/in/rmguney"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer font-medium inline-block text-[#0f0f0f]"
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
                                whileHover={{
                                    scale: 1.3,
                                    rotate: 3,
                                }}
                                whileTap={{ scale: 0.95 }}
                                className="cursor-pointer relative group"
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
                                    className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 lg:group-hover:opacity-100 text-[9px] transition-opacity pointer-events-none whitespace-nowrap ${iconData.nameClassName ?? "text-neutral-900"
                                        }`}
                                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                                >
                                    {iconData.name}
                                </span>
                                <span
                                    className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 opacity-0 lg:group-hover:opacity-100 text-[8px] text-neutral-800 transition-opacity pointer-events-none whitespace-nowrap"
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
