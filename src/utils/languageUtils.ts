import { LANGUAGE_CONFIG } from '../constants/projects';
import type { LanguageStat, Repository } from '../types';

const groupLookup: Record<string, string> = {};

Object.entries(LANGUAGE_CONFIG.groups).forEach(([groupName, languages]) => {
    languages.forEach((lang: string) => {
        groupLookup[lang] = groupName;
    });
});

export const LanguageUtils = {
    getDisplayName(language: string): string {
        return groupLookup[language] || language;
    },

    getColor(language: string): string {
        return LANGUAGE_CONFIG.colors[language] || '#fff';
    },

    normalizeName(language: string): string {
        if (language === 'CSS' || language === 'HTML') return 'JavaScript';
        if (language === 'ASP.NET') return 'C#';
        return language;
    },

    aggregateStats(repos: Repository[], mapName: (language: string) => string): LanguageStat[] {
        const languages: Record<string, number> = {};
        let totalBytes = 0;

        repos.forEach(repo => {
            if (repo.languages) {
                Object.entries(repo.languages).forEach(([language, bytes]) => {
                    const name = mapName(this.normalizeName(language));
                    languages[name] = (languages[name] || 0) + bytes;
                    totalBytes += bytes;
                });
            }
        });

        return Object.entries(languages)
            .filter(([, bytes]) => (bytes / totalBytes) * 100 >= 0.1)
            .map(([language, bytes]) => ({
                name: language,
                bytes,
                percentage: Math.round((bytes / totalBytes) * 100)
            }))
            .sort((a, b) => b.bytes - a.bytes);
    },

    calculateStats(repos: Repository[]): LanguageStat[] {
        return this.aggregateStats(repos, language => this.getDisplayName(language));
    },

    calculateRawStats(repos: Repository[]): LanguageStat[] {
        return this.aggregateStats(repos, language => language);
    },

    repoMatchesLanguage(repo: Repository, selectedLanguage: string): boolean {
        if (!repo.languages) return false;

        const groupLanguages = LANGUAGE_CONFIG.groups[selectedLanguage];
        if (groupLanguages) {
            return groupLanguages.some((lang: string) => repo.languages[lang] !== undefined);
        }

        return repo.languages[selectedLanguage] !== undefined ||
            Object.keys(repo.languages).some(lang =>
                this.getDisplayName(lang) === selectedLanguage
            );
    },

    repoMatchesOthers(repo: Repository, otherLanguages: string[]): boolean {
        if (!repo.languages) return false;

        return otherLanguages.some(langName => {
            const groupLanguages = LANGUAGE_CONFIG.groups[langName];
            if (groupLanguages) {
                return groupLanguages.some((lang: string) => repo.languages[lang] !== undefined);
            }

            return repo.languages[langName] !== undefined ||
                Object.keys(repo.languages).some(lang =>
                    this.getDisplayName(lang) === langName
                );
        });
    }
};



