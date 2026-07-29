export const SCENE_BALLOON_COLORS = ['#e8b856', '#f8a78a', '#add1e4'] as const;

export const TECH_COLORS = {
    unreal: '#F7931D',
    unity: '#ff0066',
    three: '#696969',
    react: '#61DAFB',
    dotnet: '#512BD4',
} as const;

export const ALL_BALLOON_COLORS: string[] = [
    ...SCENE_BALLOON_COLORS,
    ...Object.values(TECH_COLORS),
];
