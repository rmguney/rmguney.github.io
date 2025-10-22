import { PiMouseLeftClickFill } from "react-icons/pi";
import { RiDragMove2Line } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const Guide = () => {
  const [hoveredIcons, setHoveredIcons] = useState({
    click: false,
    plus: false,
    drag: false
  });

  const balloonColors = ["#fdaea4", "#67e8f9", "#fef08a"];
  
  const [iconColors, setIconColors] = useState({
    click: balloonColors[0],
    plus: balloonColors[1],
    drag: balloonColors[2]
  });

  useEffect(() => {
    const intervals = {
      click: setInterval(() => {
        if (!hoveredIcons.click) {
          setIconColors(prev => ({
            ...prev,
            click: balloonColors[Math.floor(Math.random() * balloonColors.length)]
          }));
        }
      }, 800),
      plus: setInterval(() => {
        if (!hoveredIcons.plus) {
          setIconColors(prev => ({
            ...prev,
            plus: balloonColors[Math.floor(Math.random() * balloonColors.length)]
          }));
        }
      }, 800),
      drag: setInterval(() => {
        if (!hoveredIcons.drag) {
          setIconColors(prev => ({
            ...prev,
            drag: balloonColors[Math.floor(Math.random() * balloonColors.length)]
          }));
        }
      }, 800)
    };

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [hoveredIcons]);

  const handleHover = (iconName) => {
    setHoveredIcons(prev => ({ ...prev, [iconName]: true }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="z-[99] hidden md:flex flex-row items-center gap-2 absolute bottom-20 right-14"
    >
      <motion.div 
        className="relative group"
        whileHover={{ scale: 1.1 }}
        onHoverStart={() => handleHover('click')}
        animate={!hoveredIcons.click ? {
          scale: [1, 1.2, 1],
          rotate: [0, -5, 5, 0],
        } : { scale: 1, rotate: 0 }}
        style={{
          filter: !hoveredIcons.click 
            ? `drop-shadow(0 0 20px ${iconColors.click}) drop-shadow(0 0 12px ${iconColors.click}) drop-shadow(0 0 6px ${iconColors.click}) brightness(1.6)`
            : 'none',
          transition: 'filter 0.6s ease-in-out'
        }}
        transition={!hoveredIcons.click ? {
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut"
        } : { type: "spring", stiffness: 400, damping: 10 }}
      >
        <PiMouseLeftClickFill 
          size={25} 
          className="text-[#0f0f0f] transition-all hidden lg:block cursor-help"
        />
        <span 
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs transition-opacity whitespace-nowrap pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        >
          Click on the scene
        </span>
      </motion.div>
      <motion.div 
        className="relative group"
        whileHover={{ scale: 1.1 }}
        onHoverStart={() => handleHover('plus')}
        animate={!hoveredIcons.plus ? {
          scale: [1, 1.2, 1],
          rotate: [0, -5, 5, 0],
        } : { scale: 1, rotate: 0 }}
        style={{
          filter: !hoveredIcons.plus 
            ? `drop-shadow(0 0 20px ${iconColors.plus}) drop-shadow(0 0 12px ${iconColors.plus}) drop-shadow(0 0 6px ${iconColors.plus}) brightness(1.6)`
            : 'none',
          transition: 'filter 0.6s ease-in-out'
        }}
        transition={!hoveredIcons.plus ? {
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4
        } : { type: "spring", stiffness: 400, damping: 10 }}
      >
        <FiPlus 
          size={15} 
          className="text-[#0f0f0f] transition-all cursor-help" 
        />
        <span 
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs transition-opacity whitespace-nowrap pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        >
          Hold it
        </span>
      </motion.div>
      <motion.div 
        className="relative group"
        whileHover={{ scale: 1.1 }}
        onHoverStart={() => handleHover('drag')}
        animate={!hoveredIcons.drag ? {
          scale: [1, 1.2, 1],
          rotate: [0, -5, 5, 0],
        } : { scale: 1, rotate: 0 }}
        style={{
          filter: !hoveredIcons.drag 
            ? `drop-shadow(0 0 20px ${iconColors.drag}) drop-shadow(0 0 12px ${iconColors.drag}) drop-shadow(0 0 6px ${iconColors.drag}) brightness(1.6)`
            : 'none',
          transition: 'filter 0.6s ease-in-out'
        }}
        transition={!hoveredIcons.drag ? {
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.8
        } : { type: "spring", stiffness: 400, damping: 10 }}
      >
        <RiDragMove2Line 
          size={25} 
          className="text-[#0f0f0f] transition-all cursor-help" 
        />
        <span 
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs transition-opacity whitespace-nowrap pointer-events-none"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
        >
          Drag to rotate
        </span>
      </motion.div>
    </motion.div> 
  );
};

export default Guide;
