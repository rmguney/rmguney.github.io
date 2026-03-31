export const REPOS_PER_PAGE = 4;
export const REPOS_PER_PAGE_MOBILE = 2;
export const MAX_LANGUAGE_BADGES = 5;

export const LANGUAGE_CONFIG = {
    groups: {
        "JS Ecosystem": ["JavaScript", "TypeScript", "Svelte", "Vue", "Astro"],
        "C/C++": ["C", "C++"],
        "Shaders": ["HLSL", "GLSL", "WGSL", "ShaderLab"],
        "Shell": ["Shell", "Bash", "PowerShell", "Batchfile"],
        "Python": ["Python", "Jupyter Notebook"],
    },

    colors: {
        'C#': '#178600',
        'C/C++': '#555555',
        'Shaders': '#5686a5',
        'C': '#555555',
        'C++': '#f34b7d',
        'HLSL': '#aace60',
        'GLSL': '#5686a5',
        'WGSL': '#1a5e9a',
        'ShaderLab': '#222c37',
        'Assembly': '#6E4C13',
        'WebAssembly': '#04133b',
        'Python': '#3572A5',
        'Rust': '#dea584',
        'Java': '#b07219',
        'JS Ecosystem': '#f1e05a',
        'JavaScript': '#f1e05a',
        'TypeScript': '#3178c6',
        'Astro': '#ff5c39',
        'Svelte': '#ff3e00',
        'Vue': '#41b883',
        'ASP.NET': '#9400ff',
        'HTML': '#e34c26',
        'CSS': '#563d7c',
        'Shell': '#89e051',
        'Bash': '#89e051',
        'PowerShell': '#012456',
        'Batchfile': '#C1F12E',
        'Dockerfile': '#384d54',
        'Makefile': '#427819',
        'CMake': '#DA3434',
        'Jupyter Notebook': '#DA5B0B',
    } // github colors
} as const;
