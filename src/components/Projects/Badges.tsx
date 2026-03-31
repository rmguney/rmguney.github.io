import React from 'react';
import { LanguageUtils } from '../../utils/languageUtils';

interface BadgesProps {
    languages: Record<string, number>;
    hasWebsite: boolean;
    isPortfolio: boolean;
}

const Badges: React.FC<BadgesProps> = ({ languages, hasWebsite, isPortfolio }) => {
    const websiteBadge = hasWebsite ? (
        <div className="w-full flex justify-center mb-0.5">
            <div
                key="website"
                className="text-[10px] px-0.5 py-0 inline-flex items-center justify-center text-white/90"
            >
                {isPortfolio ? (
                    <>
                        <span
                            className="inline-flex items-center justify-center mr-[2px] mb-0 lg:mb-0.5"
                            style={{ color: '#f59e0b', fontSize: '9px', lineHeight: 1 }}
                        >★</span>
                        <span className="text-white/50">You are here!</span>
                    </>
                ) : (
                    <>
                        <span
                            className="inline-flex items-center justify-center mr-[2px] mb-0 lg:mb-0.5"
                            style={{ color: '#10b981', fontSize: '9px', lineHeight: 1 }}
                        >★</span>
                        <span className="text-white/50">Deployment Live</span>
                    </>
                )}
            </div>
        </div>
    ) : null;

    let languageBadges = null;
    if (languages && Object.keys(languages).length > 0) {
        const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);

        const sortedLanguages = Object.entries(languages)
            .sort(([, bytesA], [, bytesB]) => bytesB - bytesA)
            .map(([lang, bytes]) => ({
                lang,
                bytes,
                percentage: Math.round((bytes / totalBytes) * 100)
            }))
            .filter(({ percentage }) => percentage > 0);

        const displayLanguages = sortedLanguages.slice(0, 3);

        if (displayLanguages.length > 0) {
            languageBadges = (
                <div className="w-full flex flex-wrap justify-center gap-[1px] mb-0.5">
                    {displayLanguages.map(({ lang, percentage }) => {
                        const color = LanguageUtils.getColor(lang);
                        return (
                            <div
                                key={lang}
                                className="text-[10px] px-0.5 py-0 inline-flex items-center justify-center text-white/50 mr-0.5"
                            >
                                <span
                                    className="inline-block w-[5px] h-[5px] rounded-full mr-[2px]"
                                    style={{ backgroundColor: color }}
                                ></span>
                                <span>{lang}</span>
                                <span className="ml-[2px] text-white/30">{percentage}%</span>
                            </div>
                        );
                    })}
                </div>
            );
        }
    }

    let moreBadge = null;
    if (languages && Object.keys(languages).length > 3) {
        const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
        const validLanguages = Object.entries(languages)
            .map(([lang, bytes]) => ({
                lang,
                percentage: Math.round((bytes / totalBytes) * 100)
            }))
            .filter(({ percentage }) => percentage > 0);

        const remainingCount = validLanguages.length - 3;

        if (remainingCount > 0) {
            moreBadge = (
                <div className="w-full flex justify-center">
                    <div
                        key="more"
                        className="text-[10px] px-0.5 py-0 inline-flex items-center justify-center text-white/30"
                    >
                        <span className="text-white/30">+{remainingCount} more</span>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col items-center w-full">
            {websiteBadge}
            {languageBadges}
            {moreBadge}
        </div>
    );
};

export default Badges;
