import React from 'react';

interface CardGlassProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

const CardGlass: React.FC<CardGlassProps> = ({
    children,
    className = "",
    hoverEffect = true
}) => {
    return (
        <div className={`
      relative
      bg-[rgba(255,255,255,0.03)]
      backdrop-blur-xl
      border border-white/10
      rounded-2xl
      p-6
      shadow-2xl
      transition-all duration-300
      ${hoverEffect ? 'hover:shadow-[0_0_20px_rgba(198,168,90,0.12)] hover:border-white/20' : ''}
      ${className}
    `}>
            {children}
        </div>
    );
};

export default CardGlass;
