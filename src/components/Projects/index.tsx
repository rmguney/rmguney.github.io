import React, { useState, useEffect, useRef } from 'react'
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa'
import { motion, useInView } from "framer-motion";
import type { Repository, LanguageStat } from '../../types';
import Pattern from '../Pattern';
import { fetchReposData } from '../../utils/prefetchRepos';
import { applyLiveStats, fetchReadmeFromApi } from '../../utils/liveStats';
import { REPOS_PER_PAGE, REPOS_PER_PAGE_MOBILE, MAX_LANGUAGE_BADGES } from '../../constants/projects';
import { LanguageUtils } from '../../utils/languageUtils';
import ProjectCard from './ProjectCard';
import GameBoyConsole from './GameBoyConsole';
import LanguageFilter from './LanguageFilter';

const EMBED_GUARD_KEY = 'embed_crash_guard';
const CRASHED_EMBEDS_KEY = 'crashed_embeds';

const readCrashedEmbeds = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(CRASHED_EMBEDS_KEY) || '[]');
    } catch {
        return [];
    }
};

const GameBoy = React.memo(function GameBoy() {
    const [allRepos, setAllRepos] = useState<Repository[]>([]);
    const [displayedRepos, setDisplayedRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [currentWebsite, setCurrentWebsite] = useState<string | null>(null)
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const [cartridgeSelected, setCartridgeSelected] = useState(false)

    const [allLanguageStats, setAllLanguageStats] = useState<LanguageStat[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);

    const iframeRef = useRef<HTMLIFrameElement>(null)
    const textRef = useRef(null);
    const isInView = useInView(textRef, {
        once: true,
        amount: 0.3,
        margin: "0px 0px -100px 0px"
    });

    const cartridgesRef = useRef(null);
    const isCartridgesInView = useInView(cartridgesRef, {
        once: true,
        amount: 0.3
    });

    const cardRefs = React.useMemo(
        () => Array.from({ length: REPOS_PER_PAGE }, () => React.createRef<HTMLButtonElement>()),
        []
    );

    const [readmeContent, setReadmeContent] = useState('');
    const [readmeLoading, setReadmeLoading] = useState(false);

    const [crashedEmbeds, setCrashedEmbeds] = useState<string[]>(readCrashedEmbeds);
    const [pendingCrashRestore, setPendingCrashRestore] = useState<string | null>(null);
    const consoleRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const crashed = sessionStorage.getItem(EMBED_GUARD_KEY);
        if (!crashed) return;
        sessionStorage.removeItem(EMBED_GUARD_KEY);
        setCrashedEmbeds(prev => {
            if (prev.includes(crashed)) return prev;
            const next = [...prev, crashed];
            try { localStorage.setItem(CRASHED_EMBEDS_KEY, JSON.stringify(next)); } catch { }
            return next;
        });
        setPendingCrashRestore(crashed);
    }, []);

    const activeRepo = activeIndex !== null ? displayedRepos[activeIndex] : undefined;
    const embeddedRepoName = cartridgeSelected && currentWebsite && activeRepo
        && !activeRepo.isGithubPage && !activeRepo.isPortfolio && !crashedEmbeds.includes(activeRepo.name)
        ? activeRepo.name
        : null;

    useEffect(() => {
        if (!embeddedRepoName) return;
        const setGuard = () => {
            try { sessionStorage.setItem(EMBED_GUARD_KEY, embeddedRepoName); } catch { }
        };
        const clearGuard = () => {
            try { sessionStorage.removeItem(EMBED_GUARD_KEY); } catch { }
        };
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') clearGuard();
            else setGuard();
        };
        setGuard();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pagehide', clearGuard);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pagehide', clearGuard);
            clearGuard();
        };
    }, [embeddedRepoName]);

    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSmallScreen(window.innerWidth < 1024);
        };

        checkScreenSize();

        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    resetAllCardTransforms();
                }
            });
        }, { threshold: 0.1 });

        if (cartridgesRef.current) {
            observer.observe(cartridgesRef.current);
        }

        return () => {
            if (cartridgesRef.current) {
                observer.unobserve(cartridgesRef.current);
            }
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        if (allRepos.length > 0) {
            const stats = LanguageUtils.calculateStats(allRepos);
            setAllLanguageStats(stats);
        }
    }, [allRepos]);

    useEffect(() => {
        if (selectedLanguage) {
            let filtered;
            if (selectedLanguage === '__others__') {
                const majorNames = new Set(
                    allLanguageStats.slice(0, MAX_LANGUAGE_BADGES).map(lang => lang.name)
                );
                const minorLanguages = LanguageUtils.calculateMinorStats(allRepos, majorNames)
                    .map(lang => lang.name);
                filtered = allRepos.filter(repo =>
                    LanguageUtils.repoMatchesOthers(repo, minorLanguages)
                );
            } else {
                filtered = allRepos.filter(repo =>
                    LanguageUtils.repoMatchesLanguage(repo, selectedLanguage)
                );
            }
            setFilteredRepos(filtered);
            const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
            setTotalPages(Math.ceil(filtered.length / reposPerPage));
            setCurrentPage(1);
        } else {
            setFilteredRepos([]);
            const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
            setTotalPages(Math.ceil(allRepos.length / reposPerPage));
        }
    }, [selectedLanguage, allRepos, isSmallScreen, allLanguageStats]);

    const resetAllCardTransforms = () => {
        cardRefs.forEach((ref) => {
            if (ref.current) {
                ref.current.style.transition = 'none';
                void ref.current.offsetWidth;
                ref.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                setTimeout(() => {
                    if (ref.current) {
                        ref.current.style.transition = 'transform 0.4s ease-out';
                    }
                }, 10);

                const highlight = ref.current.querySelector<HTMLElement>('.card-highlight');
                if (highlight) {
                    highlight.style.opacity = '0';
                    highlight.style.transition = 'none';
                    highlight.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent 60%)';

                    setTimeout(() => {
                        if (highlight) {
                            highlight.style.transition = 'background 0.3s ease-out, opacity 0.3s ease-out';
                        }
                    }, 10);
                }
            }
        });
    };

    const [animateItems, setAnimateItems] = useState(true);

    useEffect(() => {
        if (allRepos.length > 0) {
            const reposToUse = selectedLanguage ? filteredRepos : allRepos;
            const reposPerPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;

            const startIdx = (currentPage - 1) * reposPerPage;
            const endIdx = Math.min(startIdx + reposPerPage, reposToUse.length);
            setDisplayedRepos(reposToUse.slice(startIdx, endIdx));

            setActiveIndex(null);
            setCartridgeSelected(false);

            setAnimateItems(false);
            setTimeout(() => setAnimateItems(true), 50);
        }
    }, [currentPage, allRepos, filteredRepos, selectedLanguage, isSmallScreen]);

    useEffect(() => {
        if (!pendingCrashRestore || allRepos.length === 0 || displayedRepos.length === 0) return;
        const globalIdx = allRepos.findIndex(repo => repo.name === pendingCrashRestore);
        if (globalIdx === -1) {
            setPendingCrashRestore(null);
            return;
        }
        const localIdx = displayedRepos.findIndex(repo => repo.name === pendingCrashRestore);
        if (localIdx === -1) {
            const perPage = isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE;
            setCurrentPage(Math.floor(globalIdx / perPage) + 1);
            return;
        }
        setActiveIndex(localIdx);
        setCartridgeSelected(true);
        setPendingCrashRestore(null);
        setTimeout(() => {
            consoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }, [pendingCrashRestore, allRepos, displayedRepos, isSmallScreen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            resetAllCardTransforms();
        }, 50);

        return () => clearTimeout(timer);
    }, [displayedRepos]);

    useEffect(() => {
        return () => {
            resetAllCardTransforms();
        };
    }, []);

    useEffect(() => {
        const loadRepos = async () => {
            try {
                setLoading(true);
                const { repos } = await fetchReposData();
                setAllRepos(repos);
                setTotalPages(Math.ceil(repos.length / REPOS_PER_PAGE));
                setError(null);

                const refreshed = await applyLiveStats(repos);
                if (refreshed) {
                    setAllRepos(refreshed);
                    setTotalPages(Math.ceil(refreshed.length / REPOS_PER_PAGE));
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                setAllRepos([]);
                setDisplayedRepos([]);
            } finally {
                setLoading(false);
            }
        };

        loadRepos();
    }, []);

    useEffect(() => {
        const README_CACHE_PREFIX = 'readme_cache_';
        const README_CACHE_TTL = 60 * 60 * 1000;

        const fetchReadme = async () => {
            const selected = activeIndex !== null ? displayedRepos[activeIndex] : undefined;
            if (!selected || (!selected.isGithubPage && !selected.isPortfolio && !crashedEmbeds.includes(selected.name))) {
                setReadmeContent('');
                return;
            }

            try {
                setReadmeLoading(true);
                const repoUrl = selected.githubUrl;
                const urlParts = repoUrl.split('/');
                const owner = urlParts[urlParts.length - 2];
                const repo = urlParts[urlParts.length - 1];

                const cacheKey = `${README_CACHE_PREFIX}${owner}_${repo}`;

                const cachedReadme = localStorage.getItem(cacheKey);
                if (cachedReadme) {
                    try {
                        const { content, timestamp } = JSON.parse(cachedReadme);
                        const age = Date.now() - timestamp;

                        if (age < README_CACHE_TTL) {
                            setReadmeContent(content);
                            setReadmeLoading(false);
                            return;
                        }
                    } catch {
                        localStorage.removeItem(cacheKey);
                    }
                }

                let content: string;
                const response = await fetch(`/readmes/${encodeURIComponent(repo)}.md`);

                if (response.ok) {
                    content = await response.text();
                } else if (response.status === 404) {
                    const live = await fetchReadmeFromApi(owner, repo);
                    if (live === null) {
                        setReadmeContent("*No README file found in this repository.*");
                        return;
                    }
                    content = live;
                } else {
                    throw new Error(`README unavailable: ${response.status}`);
                }

                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        content,
                        timestamp: Date.now()
                    }));
                } catch { }

                setReadmeContent(content);
            } catch (err) {
                setReadmeContent("*No README content available.*");
            } finally {
                setReadmeLoading(false);
            }
        };

        fetchReadme();
    }, [activeIndex, displayedRepos, crashedEmbeds]);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: {
            opacity: 0,
            x: -100,
        },
        show: {
            opacity: 1,
            x: 0,
            transition: {
                x: {
                    type: "spring",
                    stiffness: 100,
                    damping: 12
                },
                opacity: {
                    duration: 0.2
                }
            }
        }
    };

    useEffect(() => {
        if (activeIndex !== null && displayedRepos.length > 0 && activeIndex < displayedRepos.length) {
            setCurrentWebsite(displayedRepos[activeIndex].url)
            setCartridgeSelected(true)
        }
    }, [activeIndex, displayedRepos])

    const [isPageChanging, setIsPageChanging] = useState(false);

    const handleDPadClick = (direction: string) => {
        try {
            if (allRepos.length === 0) return;

            if (direction === 'up' || direction === 'down') {
                if (isPageChanging) return;

                setIsPageChanging(true);

                if (direction === 'down') {
                    if (currentPage > 1) {
                        setCurrentPage(prev => prev - 1);
                    }
                } else {
                    if (currentPage < totalPages) {
                        setCurrentPage(prev => prev + 1);
                    }
                }

                setTimeout(() => setIsPageChanging(false), 300);
                return;
            }

            if (activeIndex === null) {
                setActiveIndex(0);
                setCartridgeSelected(true);
                return;
            }

            setCartridgeSelected(true);

            if (direction === 'right') {
                if (activeIndex < displayedRepos.length - 1) {
                    setActiveIndex(activeIndex + 1);
                }
            } else if (direction === 'left') {
                if (activeIndex > 0) {
                    setActiveIndex(activeIndex - 1);
                }
            }
        } catch { }
    };

    const handleAButtonClick = () => {
        if (allRepos.length === 0) return;

        if (activeIndex === null) {
            setActiveIndex(0);
            setCartridgeSelected(true);
            return;
        }

        try {
            window.open(displayedRepos[activeIndex].url, '_blank', 'noopener,noreferrer');
        } catch { }
    };

    const handleBButtonClick = () => {
        if (allRepos.length === 0) return;

        if (activeIndex === null) {
            setActiveIndex(0);
            setCartridgeSelected(true);
            return;
        }

        try {
            window.open(displayedRepos[activeIndex].githubUrl, '_blank', 'noopener,noreferrer');
        } catch { }
    };

    const goToNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
      .scrollbar-thin::-webkit-scrollbar {
        height: 4px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
      }
      .readme-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .readme-scrollbar::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 4px;
      }
      .readme-scrollbar::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
      }
      .readme-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      .readme-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #444 #2a2a2a;
      }
      
      .gameboy-tooltip {
        position: absolute;
        background: transparent;
        color: rgba(69, 69, 69, 1);
        padding: 4px 6px;
        border-radius: 6px;
        font-size: 10px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        font-weight: 600;
        text-shadow: 0 0 1px rgba(0, 0, 0, 0.4), 0 1px 1px rgba(0, 0, 0, 0.2);
        z-index: 100;
        transition: opacity 0.2s ease-in-out;
      }
      
      .gameboy-button:hover .gameboy-tooltip {
        opacity: 1;
      }
      
      .action-button-tooltip {
        left: 50%;
        bottom: 105%;
        transform: translateX(-50%);
        text-align: center;
      }
      
      .gameboy-button.disabled {
        cursor: not-allowed;
      }
      
      .gameboy-button.disabled .gameboy-tooltip {
        opacity: 0 !important;
      }
      
      .gameboy-button:has(.opacity-50) .gameboy-tooltip {
        max-opacity: 0.5;
      }
    `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const [entranceKey, setEntranceKey] = useState(0);
    const [hasMounted, setHasMounted] = useState(false);
    const [gameboyAnimated, setGameboyAnimated] = useState(false);
    useEffect(() => {
        if (!loading && !hasMounted) {
            setEntranceKey(prev => prev + 1);
            setHasMounted(true);
        }
    }, [loading, hasMounted]);

    useEffect(() => {
        if (!loading && !gameboyAnimated) {
            setTimeout(() => setGameboyAnimated(true), 800);
        }
    }, [loading, gameboyAnimated]);

    return (
        <div className="h-auto flex flex-col items-center justify-start overflow-hidden -mt-10 lg:mt-0">
            <Pattern />
            <div className="lg:absolute relative lg:w-full max-w-7xl flex flex-col lg:flex-row justify-center lg:justify-left lg:gap-6 items-center lg:bottom-[-515px]">
                <div className="flex flex-col justify-left scale-90 lg:scale-100 pt-0 lg:w-[820px]">
                    <div
                        className="relative mb-8 flex flex-col items-center lg:items-start lg:pl-0 lg:w-[820px]"
                        ref={textRef}
                    >
                        <motion.span
                            key={`titlebar-span-${entranceKey}`}
                            initial={hasMounted ? false : { opacity: 0, y: 10 }}
                            animate={isInView ? {
                                opacity: 0.15,
                                y: 0
                            } : {
                                opacity: 0,
                                y: 10
                            }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="absolute lg:-top-24 hidden lg:block text-[50px] lg:text-[120px] font-black whitespace-nowrap"
                            style={{
                                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.2))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: '0 0 40px rgba(255,255,255,0.1)'
                            }}>
                            {allRepos.length} PUBLIC
                        </motion.span>
                        <motion.h1
                            key={`titlebar-h1-${entranceKey}`}
                            initial={hasMounted ? false : { opacity: 0, y: -10 }}
                            animate={isInView ? {
                                opacity: 1,
                                y: 0
                            } : {
                                opacity: 0,
                                y: -10
                            }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="pt-6 lg:pt-0 relative text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white/80 via-amber-50/90 to-white/80 lg:tracking-[0.2em] text-center lg:text-left"
                            style={{ textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                            REPOSITORIES
                        </motion.h1>

                        {!loading && !error && (
                            <motion.div
                                key={`titlebar-sortbar-${entranceKey}`}
                                initial={hasMounted ? false : { opacity: 0, y: 5 }}
                                animate={isInView ? {
                                    opacity: 1,
                                    y: 0
                                } : {
                                    opacity: 0,
                                    y: 5
                                }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="mt-4 lg:mt-2 w-full relative"
                            >
                                <LanguageFilter
                                    allLanguageStats={allLanguageStats}
                                    selectedLanguage={selectedLanguage}
                                    setSelectedLanguage={setSelectedLanguage}
                                    allRepos={allRepos}
                                />
                            </motion.div>
                        )}
                    </div>

                    <div>
                        <motion.div
                            ref={cartridgesRef}
                            variants={containerVariants}
                            initial={isSmallScreen ? "show" : "hidden"}
                            animate={isSmallScreen ? "show" : (isCartridgesInView && animateItems ? "show" : "hidden")}
                            className={`flex flex-wrap justify-center gap-4 ${isSmallScreen ? 'gap-2' : 'gap-4'}`}
                        >
                            {loading ? (
                                <div className="text-white text-center py-8">
                                    <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full mb-4"></div>
                                    <p>Loading repositories...</p>
                                </div>
                            ) : error ? (
                                <div className="text-amber-200 text-center py-8">
                                    <p>Error loading repositories: {error}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="mt-4 px-4 py-2 bg-amber-200/20 hover:bg-amber-200/30 rounded-md transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : displayedRepos.length === 0 ? (
                                <div className="text-white text-center py-8">
                                    {selectedLanguage ? (
                                        <>
                                            <p>No repositories found using {selectedLanguage}.</p>
                                        </>
                                    ) : (
                                        <p>No repositories found.</p>
                                    )}
                                </div>
                            ) : (
                                displayedRepos.map((repo, index) => (
                                    <ProjectCard
                                        key={repo.id || index}
                                        repo={repo}
                                        index={index}
                                        activeIndex={activeIndex}
                                        setActiveIndex={setActiveIndex}
                                        setCurrentWebsite={setCurrentWebsite}
                                        setCartridgeSelected={setCartridgeSelected}
                                        isSmallScreen={isSmallScreen}
                                        itemVariants={itemVariants}
                                        cardRef={cardRefs[index]}
                                        isCartridgesInView={isCartridgesInView}
                                    />
                                ))
                            )}
                        </motion.div>

                        {!loading && !error && allRepos.length > (isSmallScreen ? REPOS_PER_PAGE_MOBILE : REPOS_PER_PAGE) && (
                            <div className="flex items-center justify-center space-x-4 mt-6">
                                <button
                                    onClick={goToPreviousPage}
                                    disabled={currentPage === 1}
                                    className={`px-2 py-2.5 rounded-full flex items-center justify-center transition-all
                    ${currentPage === 1
                                            ? 'text-white/30 cursor-not-allowed'
                                            : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                                    aria-label="Previous page"
                                >
                                    <FaCaretLeft className="mr-1" />
                                </button>

                                <div className="text-white/80 px-2 mb-0.5">
                                    <span className="font-medium">{currentPage}</span>
                                    <span className="mx-1">/</span>
                                    <span>{totalPages}</span>
                                </div>

                                <button
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    className={`px-2 py-2.5 rounded-full flex items-center justify-center transition-all
                    ${currentPage === totalPages
                                            ? 'text-white/30 cursor-not-allowed'
                                            : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                                    aria-label="Next page"
                                >
                                    <FaCaretRight className="ml-1" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <GameBoyConsole
                    gameboyAnimated={gameboyAnimated}
                    loading={loading}
                    entranceKey={entranceKey}
                    cartridgeSelected={cartridgeSelected}
                    currentWebsite={currentWebsite}
                    activeIndex={activeIndex}
                    displayedRepos={displayedRepos}
                    readmeLoading={readmeLoading}
                    readmeContent={readmeContent}
                    handleDPadClick={handleDPadClick}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    handleAButtonClick={handleAButtonClick}
                    handleBButtonClick={handleBButtonClick}
                    iframeRef={iframeRef}
                    crashedEmbeds={crashedEmbeds}
                    consoleRef={consoleRef}
                />
            </div>
        </div>
    )
});

export default GameBoy;
