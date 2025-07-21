import { createContext, useContext, useState } from 'react';

const BalloonContext = createContext();

export function BalloonProvider({ children }) {
  const [balloonSpawnQueue, setBalloonSpawnQueue] = useState([]);

  const spawnBalloons = (color, count = 10, speed, size, rotation) => {
    setBalloonSpawnQueue(prev => [...prev, { 
      color, 
      count, 
      speed, 
      size, 
      rotation 
    }]);
  };

  const clearSpawnQueue = () => {
    setBalloonSpawnQueue([]);
  };

  return (
    <BalloonContext.Provider value={{ balloonSpawnQueue, spawnBalloons, clearSpawnQueue }}>
      {children}
    </BalloonContext.Provider>
  );
}

export const useBalloons = () => useContext(BalloonContext);
