import { useState, useEffect } from 'react';

export function Confetti() {
    const [pieces, setPieces] = useState<any[]>([]);
    useEffect(() => {
        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#0cf'];
        const p = Array.from({ length: 80 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 0.5,
            size: Math.random() * 10 + 5,
            duration: Math.random() * 2 + 2,
        }));
        setPieces(p);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map(p => (
                <div
                    key={p.id}
                    className="absolute top-[-20px] rounded-sm"
                    style={{
                        left: `${p.x}vw`,
                        width: `${p.size}px`,
                        height: `${p.size * 1.5}px`,
                        backgroundColor: p.color,
                        animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
                    }}
                />
            ))}
        </div>
    );
}
