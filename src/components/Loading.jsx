import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

const loadingTexts = [
  "Inflating balloons...",
  "Teaching Pikachu to float...",
  "Convincing the model to load...",
  "Examining the pixels...",
  "Tickling the server...",
  "Aligning the stars...",
  "Praying to the machine gods...",
  "Counting to infinity...",
  "Chasing the mosquitoes away...",
  "Consulting the magic 8-ball...",
  "All of this is meaningless and we're all going to die anyway...",
  "Possibly summoning the Nintendo lawyers...",
];

const Loading = React.memo(function Loading({ progress = 0 }) {
  const [currentText, setCurrentText] = useState(loadingTexts[0]);
  const [isClient, setIsClient] = useState(false);
  
const displayProgress = progress;

  useEffect(() => {
    setIsClient(true);
    setCurrentText(
      loadingTexts[Math.floor(Math.random() * loadingTexts.length)]
    );

    const interval = setInterval(() => {
      setCurrentText(
        loadingTexts[Math.floor(Math.random() * loadingTexts.length)]
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-[9p99] bg-[#111111]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
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
      </AnimatePresence>
    </div>
  );
});

export default Loading;
