// @ts-nocheck
import React from 'react';
import { motion } from "framer-motion";
import { FaGithub, FaCaretUp, FaCaretDown, FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import { HiLink } from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createMarkdownComponents } from './MarkdownComponents';
import { formatRepoName } from './utils';

interface GameBoyConsoleProps {
    gameboyAnimated: boolean;
    loading: boolean;
    isSmallScreen: boolean;
    gameBoyOffset: number;
    entranceKey: number;
    cartridgeSelected: boolean;
    currentWebsite: string | null;
    activeIndex: number | null;
    displayedRepos: any[];
    readmeLoading: boolean;
    readmeContent: string;
    handleDPadClick: (direction: string) => void;
    currentPage: number;
    totalPages: number;
    handleAButtonClick: () => void;
    handleBButtonClick: () => void;
    iframeRef: React.RefObject<HTMLIFrameElement>;
}

const GameBoyConsole: React.FC<GameBoyConsoleProps> = ({
    gameboyAnimated,
    loading,
    isSmallScreen,
    gameBoyOffset,
    entranceKey,
    cartridgeSelected,
    currentWebsite,
    activeIndex,
    displayedRepos,
    readmeLoading,
    readmeContent,
    handleDPadClick,
    currentPage,
    totalPages,
    handleAButtonClick,
    handleBButtonClick,
    iframeRef
}) => {

    const MarkdownComponents = createMarkdownComponents(activeIndex, displayedRepos);

    return (
        <motion.div
            key={`gameboy-${entranceKey}`}
            className="lg:justify-end"
            initial={!gameboyAnimated ? { opacity: 0, x: -100 } : false}
            animate={!loading ? {
                opacity: 1,
                x: isSmallScreen ? 0 : gameBoyOffset
            } : {
                opacity: 0,
                x: -100
            }}
            transition={{
                type: "spring",
                stiffness: 80,
                damping: 12,
                mass: 0.8,
                delay: loading ? 0.3 : 0
            }}
        >
            <div className="relative w-[450px] h-[570px] bg-gradient-to-br from-amber-100 to-amber-300 rounded-[15px_15px_0px_0px] p-[30px] shadow-[inset_2px_2px_3px_rgba(255,255,255,0.3),_inset_-2px_-2px_3px_rgba(0,0,0,0.3),_0_0_20px_rgba(0,0,0,0.4)]">
                <div className="absolute top-[30px] left-[50%] translate-x-[-50%] w-[400px] h-[350px] bg-[#333] rounded-[15px_15px_15px_15px] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                    <div className="absolute top-[20px] left-[50%] translate-x-[-50%] w-[360px] h-[310px] bg-[#9ba5aa] border-[6px] border-solid border-[#555] overflow-hidden">
                        <div className="w-full h-full relative overflow-hidden">
                            {cartridgeSelected && currentWebsite && activeIndex !== null ? (
                                displayedRepos[activeIndex]?.isGithubPage || displayedRepos[activeIndex]?.isPortfolio ? (
                                    <div className="w-full h-full bg-[#212121] flex flex-col overflow-hidden">
                                        <div className="bg-black p-2 flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <FaGithub className="text-white" />
                                                <span className="text-white font-medium truncate">
                                                    {formatRepoName(displayedRepos[activeIndex].name)}.md
                                                    {displayedRepos[activeIndex]?.isPortfolio && <span className="ml-2 text-amber-300 text-xs">(Current Site)</span>}
                                                </span>
                                            </div>
                                        </div>

                                        <div
                                            className="flex-1 overflow-y-auto p-4 text-white/90 text-sm bg-[#1a1a1a] readme-scrollbar"
                                        >
                                            {readmeLoading ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full"></div>
                                                    <span className="ml-2">Loading README...</span>
                                                </div>
                                            ) : (
                                                <div className="markdown-body w-full">
                                                    {displayedRepos[activeIndex]?.isPortfolio && !readmeContent && (
                                                        <div className="p-4 text-center">
                                                            <h1 className="text-xl font-bold text-amber-300 mb-4">Portfolio Website Repository</h1>
                                                            <p>This is the repository for the website you are currently viewing.</p>
                                                            <p className="mt-4 text-white/60">README content is loading or not available.</p>
                                                        </div>
                                                    )}
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={MarkdownComponents}
                                                    >
                                                        {readmeContent}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <iframe
                                        ref={iframeRef}
                                        src={currentWebsite}
                                        className="w-[1211px] h-[1034px] border-0 transform origin-top-left -translate-x-0.5 scale-[0.289]"
                                        title="Screen"
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-[#212121] text-center p-4">
                                    <div className="text-3xl font-bold mb-4 text-white animate-pulse">
                                        {loading ? "Loading repositories..." : "Select a cartridge!"}
                                    </div>
                                    <div className="absolute bottom-8 w-full flex justify-center">
                                        <div className="w-16 h-1 bg-white/30 animate-pulse"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="absolute top-[420px] left-[60px] w-[120px] h-[120px]">
                    <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[120px] h-[37px] bg-[#333] rounded-[5px]" />
                    <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[37px] h-[120px] bg-[#333] rounded-[5px]" />

                    <button
                        onClick={() => handleDPadClick('up')}
                        className={`gameboy-button absolute top-0 left-1/2 -translate-x-1/2 w-[37px] h-[41px] z-10 flex items-center justify-center hover:scale-[0.97] hover:shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]
                  ${currentPage >= totalPages ? 'disabled opacity-50' : ''}`}
                        aria-label="Next page"
                    >
                        <FaCaretUp className="text-gray-500" />
                        <div className="gameboy-tooltip" style={{ bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%) translateY(5px)' }}>Next Page</div>
                    </button>
                    <button
                        onClick={() => handleDPadClick('right')}
                        className={`gameboy-button absolute top-1/2 right-0 -translate-y-1/2 w-[41px] h-[37px] z-10 flex items-center justify-center shadow-lg hover:scale-[0.97] hover:shadow-[inset_-4px_0_8px_rgba(0,0,0,0.4)]
                  ${activeIndex === null || activeIndex >= displayedRepos.length - 1 ? 'disabled opacity-50' : ''}`}
                        aria-label="Next project"
                    >
                        <FaCaretRight className="text-gray-500" />
                        <div className="gameboy-tooltip" style={{ left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' }}>Next<br /> Project</div>
                    </button>
                    <button
                        onClick={() => handleDPadClick('down')}
                        className={`gameboy-button absolute bottom-0 left-1/2 -translate-x-1/2 w-[37px] h-[41px] z-10 flex items-center justify-center shadow-lg hover:scale-[0.97] hover:shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4)]
                  ${currentPage <= 1 ? 'disabled opacity-50' : ''}`}
                        aria-label="Previous page"
                    >
                        <FaCaretDown className="text-gray-500" />
                        <div className="gameboy-tooltip" style={{ top: 'calc(100% )', left: '50%', transform: 'translateX(-50%)' }}>Previous Page</div>
                    </button>
                    <button
                        onClick={() => handleDPadClick('left')}
                        className={`gameboy-button absolute top-1/2 left-0 -translate-y-1/2 w-[41px] h-[37px] z-10 flex items-center justify-center shadow-lg hover:scale-[0.97] hover:shadow-[inset_4px_0_8px_rgba(0,0,0,0.4)]
                  ${activeIndex === null || activeIndex <= 0 ? 'disabled opacity-50' : ''}`}
                        aria-label="Previous project"
                    >
                        <FaCaretLeft className="text-gray-500" />
                        <div className="gameboy-tooltip" style={{ right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' }}>Previous<br /> Project</div>
                    </button>
                </div>

                <div className="absolute top-[420px] right-[60px] w-[120px] h-[120px]">
                    <button
                        onClick={handleAButtonClick}
                        className={`gameboy-button absolute top-[22px] right-[0px] w-[45px] h-[45px] 
                  ${activeIndex === null ? 'disabled' : 'hover:shadow-inner hover:scale-[0.98]'}
                  shadow-lg bg-[#333] rounded-full transform rotate-[-30deg] flex items-center justify-center`}
                        aria-label="Visit Deployment"
                    >
                        <HiLink className={`text-gray-500 text-xl transform rotate-[30deg] 
                  ${activeIndex === null ? 'opacity-50' : ''}`} />
                        <div className="gameboy-tooltip action-button-tooltip">Visit Deployment</div>
                    </button>
                    <button
                        onClick={handleBButtonClick}
                        className={`gameboy-button absolute top-[52px] right-[52px] w-[45px] h-[45px] 
                  ${activeIndex === null ? 'disabled' : 'hover:shadow-inner hover:scale-[0.98]'} 
                  shadow-lg bg-[#333] rounded-full transform rotate-[-30deg] flex items-center justify-center`}
                        aria-label="View Source"
                    >
                        <FaGithub className={`text-gray-500 text-xl transform rotate-[30deg] 
                  ${activeIndex === null ? 'opacity-50' : ''}`} />
                        <div className="gameboy-tooltip action-button-tooltip">View Source</div>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default GameBoyConsole;
