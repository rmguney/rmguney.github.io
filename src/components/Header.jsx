import { FaSpinner, FaLinkedin, FaGithub } from "react-icons/fa";
import { motion } from "framer-motion";

const Header = ({ modelLoaded }) => {
  return (
    <nav className="absolute top-0 w-full flex justify-between items-center h-12 bg-[#111111] shadow-md z-[999] pointer-events-auto">
       <div className="flex items-center lg:w-1/4 justify-center">
        <div className="flex ml-5 lg:ml-0">
          {"/rmguney".split("").map((letter, index) => (
            <motion.span
              key={index}
              className="text-white tracking-widest cursor-pointer hover:text-amber-100 transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              onClick={() => window.location.reload()}
            >
              {letter}
            </motion.span>
          ))}
        </div>
         <motion.a
          href="https://github.com/rmguney/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4"
          whileHover={() => ({ 
            scale: 1.2, 
            rotate: Math.random() * 30 - 15 
          })}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17 
          }}
        >
          <FaGithub size={24} className="text-[#fff] hover:text-amber-100 transition-colors duration-200" />
        </motion.a>
         <motion.a
          href="https://www.linkedin.com/in/rmguney/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4"
          whileHover={() => ({ 
            scale: 1.2, 
            rotate: Math.random() * 30 - 15 
          })}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 17 
          }}
        >
          <FaLinkedin size={24} className="text-[#fff] hover:text-amber-100 transition-colors duration-200" />
        </motion.a>
      </div>
      {!modelLoaded && (
        <div className="flex items-center lg:w-1/4 justify-center text-white">
          <FaSpinner className="animate-spin mr-2" />
          <span className="text-white tracking-widest mr-4 lg:mr-0">Loading</span>
        </div>
      )}
    </nav>
  );
};

export default Header;
