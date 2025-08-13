import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useBalloons } from "../context/BalloonContext";

const TextBody = () => {
  const { spawnBalloons } = useBalloons();
  const ref = useRef(null);
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

  const techIcons = [
    {
      img: "/certs/boun.png",
      name: "MSc SWE",
      description: "Bogazici, Jun 2025",
      sceneColor: "#a6e1f7",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    },
    {
      img: "/certs/mfun.png",
      name: "Att&ck Fundamentals",
      description: "Mitre, Apr 2025",
      sceneColor: "#b3b3b3",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    },
    {
      img: "/certs/msoca.png",
      name: "SOC Assessment",
      description: "Mitre, May 2025",
      sceneColor: "#b5fab4",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    },
    {
      img: "/certs/mcti.png",
      name: "Cyber Threat Intelligence",
      description: "Mitre, Jun 2025",
      sceneColor: "#f5e898",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    },
    {
      img: "/certs/mptm.png",
      name: "Purple Teaming Methodology",
      description: "Mitre, Jul 2025",
      sceneColor: "#d4bbfa",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    },
     {
      img: "/certs/mthde.png",
      name: "Threat Hunting and Detection Engineering",
      description: "Mitre, Aug 2025",
      sceneColor: "#b2c9f7",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    },
/*     {
      img: "/certs/maem.png",
      name: "Adversary Emulation Methodology",
      description: "Mitre, Oct 2025",
      sceneColor: "#f58282",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    }, */
/*     {
      img: "/certs/matde.png",
      name: "Access Token Detection Engineering",
      description: "Mitre, Dec 2025",
      sceneColor: "#969090",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    }, */
/*     {
      img: "/certs/crto.png",
      name: "Certified Red Team Operator",
      description: "Zero-Point, 2026",
      sceneColor: "#91696a",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    }, */
/*     {
      img: "/certs/crtl.png",
      name: "Certified Red Team Lead",
      description: "Zero-Point, 2027",
      sceneColor: "#77778f",
      balloonOptions: { count: 20, speed: 1.5, rotation: true },
    }, */
  ];

  const renderIcon = ({ img, name }) => (
    <img
      src={img}
      alt={name}
      width={22}
      height={22}
      className="transition-transform duration-200 grayscale group-hover:grayscale-0 group-hover:scale-110"
    />
  );

  const techIconsContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const techIconItemVariants = {
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
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="icon-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
          </filter>
          <filter id="icon-shadow-hover">
            <feDropShadow dx="0" dy="1" stdDeviation="4" floodOpacity="0.4" />
          </filter>
        </defs>
      </svg>

      <motion.div
        ref={ref}
        className="p-8 max-w-xl"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        <motion.h1
          variants={itemVariants}
          className="text-5xl font-semibold text-[#0f0f0f] lg:tracking-wider"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        >
          R. Melih Güney
        </motion.h1>
        <motion.small
          variants={itemVariants}
          className="text-[#0f0f0f] font-light text-xs lg:tracking-widest"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        >
          Software Engineer, MSc
        </motion.small>
        <motion.p
          variants={itemVariants}
          className="text-sm leading-relaxed text-[#0f0f0f] mt-4 lg:tracking-widest text-justify"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
        >
          Hello! I mostly work on simulation systems, visual analytics, and some security tooling. This is my personal portfolio showcasing some of my open source projects. Feel free to reach out, cheers!
        </motion.p>

        <motion.div
          variants={techIconsContainerVariants}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          className="flex space-x-5 mt-3"
        >
          {techIcons.map((iconData, index) => (
            <motion.div
              key={index}
              variants={techIconItemVariants}
              whileHover={() => ({
                scale: 1.3,
                rotate: Math.random() * 6 - 3,
                filter: "url(#icon-shadow-hover)",
              })}
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
              style={{
                ["--hover-color"]: iconData.hoverColor,
                filter: "url(#icon-shadow)",
              }}
            >
              {renderIcon(iconData)}
              <span
                className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] transition-opacity pointer-events-none whitespace-nowrap"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
              >
                {iconData.name}
              </span>
              <span
                className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] text-neutral-600 transition-opacity pointer-events-none whitespace-nowrap"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
              >
                {iconData.description}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TextBody;
