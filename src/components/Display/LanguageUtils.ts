import { LANGUAGE_CONFIG } from './constants';

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
        // @ts-ignore - Indexing into colors which might not have the key
        return LANGUAGE_CONFIG.colors[language] || '#fff';
    },

    calculateStats(repos: any[]) {
        const languages: Record<string, number> = {};
        let totalBytes = 0;

        repos.forEach(repo => {
            if (repo.languages) {
                Object.entries(repo.languages).forEach(([language, bytes]) => {
                    let langName = language;
                    if (language === 'ShaderLab') langName = 'HLSL';
                    if (language === 'CSS' || language === 'HTML') langName = 'JavaScript';
                    if (language === 'ASP.NET') langName = 'C#';

                    const displayName = this.getDisplayName(langName);
                    languages[displayName] = (languages[displayName] || 0) + (bytes as number);
                    totalBytes += (bytes as number);
                });
            }
        });

        return Object.entries(languages)
            .map(([language, bytes]) => ({
                name: language,
                bytes,
                percentage: Math.round((bytes / totalBytes) * 100)
            }))
            .sort((a, b) => b.bytes - a.bytes);
    },

    repoMatchesLanguage(repo: any, selectedLanguage: string): boolean {
        if (!repo.languages) return false;

        // @ts-ignore
        const groupLanguages = LANGUAGE_CONFIG.groups[selectedLanguage];
        if (groupLanguages) {
            return groupLanguages.some((lang: string) => repo.languages[lang]);
        }

        return repo.languages[selectedLanguage] ||
            Object.keys(repo.languages).some(lang =>
                this.getDisplayName(lang) === selectedLanguage
            );
    },

    repoMatchesOthers(repo: any, otherLanguages: string[]): boolean {
        if (!repo.languages) return false;

        return otherLanguages.some(langName => {
            // @ts-ignore
            const groupLanguages = LANGUAGE_CONFIG.groups[langName];
            if (groupLanguages) {
                return groupLanguages.some((lang: string) => repo.languages[lang]);
            }

            return repo.languages[langName] ||
                Object.keys(repo.languages).some(lang =>
                    this.getDisplayName(lang) === langName
                );
        });
    }
};
