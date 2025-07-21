import { PiMouseLeftClickFill } from "react-icons/pi";
import { RiDragMove2Line } from "react-icons/ri";
import { FiPlus } from "react-icons/fi";
import { motion } from "framer-motion";

const Guide = () => {
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
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
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
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
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
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
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
