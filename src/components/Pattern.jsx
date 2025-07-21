import React, { useMemo } from "react";

const ICONS = [
  '/icons/1.svg',
  '/icons/2.svg',
  '/icons/3.svg',
  '/icons/4.svg',
  '/icons/5.svg',
  '/icons/6.svg',
  '/icons/7.svg',
  '/icons/8.svg',
  '/icons/9.svg',
  '/icons/10.svg',
];

const NUM_LINES = 10;
const ICONS_PER_LINE = 30;

const generatePattern = (numLines, iconsPerLine, icons) => {
  const pattern = [];
  for (let i = 0; i < numLines; i++) {
    const line = [];
    for (let j = 0; j < iconsPerLine; j++) {
      const iconIndex = (i + j) % icons.length;
      line.push(icons[iconIndex]);
    }
    pattern.push(line);
  }
  return pattern;
};

const Pattern = ({ size = 30 }) => {
  const pattern = useMemo(() => 
    generatePattern(NUM_LINES, ICONS_PER_LINE, ICONS),
    [] 
  );

  return (
    <div className="relative">
      <div 
        className={`items-center top-[135px] space-y-[24px] relative hidden lg:block`} 
        style={{ zIndex: -1, filter: 'blur(0.5px)', opacity: 0.6 }}
      >
        {pattern.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className="flex justify-center items-center space-x-[24px]"
          >
            {line.map((iconSrc, iconIndex) => (
              <div key={`${lineIndex}-${iconIndex}`}>
                <img src={iconSrc} alt="" width={size} height={size} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 90px 90px #111111',
        pointerEvents: 'none',
        zIndex: 0,
      }} />
    </div>
  );
};

export default Pattern;