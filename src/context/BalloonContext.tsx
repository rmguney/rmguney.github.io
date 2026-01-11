import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { BalloonSpawnRequest, BalloonContextValue } from '../types';

const BalloonContext = createContext<BalloonContextValue | undefined>(undefined);

interface BalloonProviderProps {
    children: ReactNode;
}

export function BalloonProvider({ children }: BalloonProviderProps): React.ReactElement {
    const [balloonSpawnQueue, setBalloonSpawnQueue] = useState<BalloonSpawnRequest[]>([]);

    const spawnBalloons = (
        color: string,
        count: number = 10,
        speed?: number,
        size?: number,
        rotation?: boolean
    ): void => {
        setBalloonSpawnQueue(prev => [...prev, {
            color,
            count,
            speed,
            size,
            rotation
        }]);
    };

    const clearSpawnQueue = (): void => {
        setBalloonSpawnQueue([]);
    };

    return (
        <BalloonContext.Provider value={{ balloonSpawnQueue, spawnBalloons, clearSpawnQueue }}>
            {children}
        </BalloonContext.Provider>
    );
}

export const useBalloons = (): BalloonContextValue => {
    const context = useContext(BalloonContext);
    if (context === undefined) {
        throw new Error('useBalloons must be used within a BalloonProvider');
    }
    return context;
};
