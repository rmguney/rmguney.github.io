export const SCENE_BALLOON_COLORS = ['#ffc6b5', '#b2faff', '#fffba4'] as const;

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
