import React, { useMemo } from 'react';
import { LANGUAGE_CONFIG, MAX_LANGUAGE_BADGES } from '../../constants/projects';
import { LanguageUtils } from '../../utils/languageUtils';
import type { LanguageStat, Repository } from '../../types';

interface LanguageFilterProps {
    allLanguageStats: LanguageStat[];
    selectedLanguage: string | null;
    setSelectedLanguage: (lang: string | null) => void;
    allRepos: Repository[];
}

const LanguageFilter: React.FC<LanguageFilterProps> = ({
    allLanguageStats,
    selectedLanguage,
    setSelectedLanguage,
    allRepos
}) => {
    const { majorLanguages, minorLanguages, othersPercentage } = useMemo(() => {
        const major = allLanguageStats.slice(0, MAX_LANGUAGE_BADGES);
        const majorNames = new Set(major.map(lang => lang.name));
        const minor = LanguageUtils.calculateRawStats(allRepos)
            .filter(lang => !majorNames.has(LanguageUtils.getDisplayName(lang.name)));
        const othersPercent = minor.reduce((sum, lang) => sum + lang.percentage, 0);
        return { majorLanguages: major, minorLanguages: minor, othersPercentage: othersPercent };
    }, [allLanguageStats, allRepos]);

    return (
        <div
            className="flex items-center justify-center flex-wrap gap-2 px-4 md:px-1 lg:justify-start"
        >
            {majorLanguages.map(lang => {
                const groupedLanguages = LANGUAGE_CONFIG.groups[lang.name];

                const existingGroupedLanguages = groupedLanguages
                    ? groupedLanguages.filter((subLang: string) =>
                        allRepos.some(repo => repo.languages && repo.languages[subLang] !== undefined)
                    )
                    : [];

                const hasGroup = existingGroupedLanguages.length > 1;

                return (
                    <div key={lang.name} className="relative group/filter flex-shrink-0">
                        <button
                            onClick={() => setSelectedLanguage(lang.name === selectedLanguage ? null : lang.name)}
                            className={`text-xs px-2 py-1 rounded-full flex items-center transition-all
                  ${lang.name === selectedLanguage
                                    ? 'bg-amber-100/10 text-amber-50 ring-2 ring-amber-50/50'
                                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                        >
                            <span
                                className="inline-block w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: LanguageUtils.getColor(lang.name) }}
                            ></span>
                            <span>{lang.name}</span>
                            <span className="ml-1.5 text-white/50">{lang.percentage}%</span>
                        </button>

                        {hasGroup && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-1
                  bg-black/50 backdrop-blur-sm rounded-lg text-[9px] text-white/90 
                  opacity-0 group-hover/filter:opacity-100 pointer-events-none 
                  transition-opacity duration-500 z-50
                  border border-white/10 shadow-lg whitespace-nowrap">
                                <div className="flex flex-row items-center gap-1.5">
                                    {existingGroupedLanguages.map((subLang) => (
                                        <span key={subLang} className="flex items-center">
                                            <span
                                                className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                                                style={{ backgroundColor: LanguageUtils.getColor(subLang) }}
                                            ></span>
                                            {subLang}
                                        </span>
                                    ))}
                                </div>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px]
                    border-4 border-transparent border-b-black/90"></div>
                            </div>
                        )}
                    </div>
                );
            })}

            {minorLanguages.length > 0 && (
                <div className="relative group/filter flex-shrink-0">
                    <div
                        className="text-xs px-2 py-1 rounded-full flex items-center bg-white/5 text-white/50 cursor-default"
                    >
                        <span
                            className="inline-block w-2 h-2 rounded-full mr-1.5"
                            style={{ backgroundColor: '#fff' }}
                        ></span>
                        <span>Other</span>
                        <span className="ml-1.5 text-white/50">{othersPercentage}%</span>
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-1
                  bg-black/50 backdrop-blur-sm rounded-lg text-[9px] text-white/90 
                  opacity-0 group-hover/filter:opacity-100 pointer-events-none 
                  transition-opacity duration-500 z-50
                  border border-white/10 shadow-lg whitespace-nowrap">
                        <div className="flex flex-row items-center gap-1.5">
                            {minorLanguages.map((lang) => (
                                <span key={lang.name} className="flex items-center">
                                    <span
                                        className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                                        style={{ backgroundColor: LanguageUtils.getColor(lang.name) }}
                                    ></span>
                                    {lang.name}
                                </span>
                            ))}
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px]
                    border-4 border-transparent border-b-black/90"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LanguageFilter;
