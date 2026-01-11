export const formatRepoName = (name: string) => {
    if (!name) return 'Unknown';

    let cleanName = name;
    if (name.endsWith('.github.io')) {
        cleanName = name.replace('.github.io', '');
    }

    const lowercaseWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of'];

    const words = cleanName.split('-');

    return words
        .map((word, index) => {
            if (index === 0 || index === words.length - 1 || !lowercaseWords.includes(word.toLowerCase())) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word.toLowerCase();
        })
        .join(' ');
}
