import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { loadProgress } from "../utils/loadProgress";
import React from "react";

const SWEEP_RATE = 250;

const loadingTexts: string[] = [
    "Inflating balloons...",
    "Teaching the mascot to float...",
    "Convincing the models to load...",
    "Examining the pixels...",
    "Tickling the server...",
    "Aligning the stars...",
    "Counting to infinity...",
    "Chasing the mosquitoes away...",
    "Consulting the magic 8-ball...",
    "Possibly summoning the Nintendo lawyers...",
];

const Loading = React.memo(function Loading(): React.ReactElement {
    const [displayProgress, setDisplayProgress] = useState<number>(loadProgress.get());
    const [currentText, setCurrentText] = useState<string>(
        () => loadingTexts[Math.floor(Math.random() * loadingTexts.length)]
    );

    useEffect(() => {
        let frame = 0;
        let displayed = loadProgress.get();
        let last = performance.now();
        const tick = (): void => {
            frame = requestAnimationFrame(tick);
            const now = performance.now();
            const dt = (now - last) / 1000;
            last = now;
            const target = loadProgress.get();
            if (displayed < target) {
                displayed = Math.min(displayed + SWEEP_RATE * dt, target);
                setDisplayProgress(displayed);
            }
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentText(
                loadingTexts[Math.floor(Math.random() * loadingTexts.length)]
            );
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-[#111111]">
            <motion.div
                key={currentText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-center"
            >
                <p className="text-2xl md:text-3xl font-medium text-white">
                    {currentText}{" "}
                    <span className="text-amber-300">
                        {Math.round(Math.min(displayProgress, 100))}%
                    </span>
                </p>

                <motion.div
                    className="flex justify-center items-center mt-6 space-x-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-3 h-3 bg-amber-300 rounded-full"
                            animate={{
                                y: [0, -10, 0],
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                        />
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
});

export default Loading;
