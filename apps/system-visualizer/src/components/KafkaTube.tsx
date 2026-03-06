import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import type { Packet } from '../types';
import { ArrowDown, ArrowUp } from 'lucide-react';

function ActivePacket({ packet, isFrozen }: { packet: Packet, isFrozen: boolean }) {
    const [bounced, setBounced] = useState(false);

    useEffect(() => {
        if (packet.animation.includes('bounce')) {
            const t = setTimeout(() => setBounced(true), 2000);
            return () => clearTimeout(t);
        }
    }, [packet]);

    const dotColors = {
        green: 'bg-green-400 shadow-[0_0_15px_3px_rgba(74,222,128,0.7)]',
        red: 'bg-red-400 shadow-[0_0_15px_3px_rgba(248,113,113,0.7)]',
        yellow: 'bg-yellow-400 shadow-[0_0_15px_3px_rgba(250,204,21,0.7)]',
        bounceRed: 'bg-red-500 shadow-[0_0_20px_5px_rgba(239,68,68,0.9)]'
    };



    let animClass = "";
    if (packet.animation === 'slide-right' || packet.animation === 'slide-down') animClass = "animate-slide-down-tube";
    else if (packet.animation === 'slide-left' || packet.animation === 'slide-up') animClass = "animate-slide-up-tube";
    else if (packet.animation.includes('bounce-down') || packet.animation.includes('bounce-right')) animClass = "animate-bounce-down-tube";
    else if (packet.animation.includes('bounce-up') || packet.animation.includes('bounce-left')) animClass = "animate-bounce-up-tube";

    return (
        <div
            className={cn(
                "absolute flex items-center justify-center z-30 top-0 left-1/2",
                animClass,
                isFrozen && "[animation-play-state:paused]! grayscale opacity-50"
            )}
        >
            <div className={cn("w-3.5 h-3.5 rounded-full relative animate-packet-pulse", bounced ? dotColors.bounceRed : dotColors[packet.color])}>
                <div className={cn(
                    "absolute whitespace-nowrap bg-card border border-border px-1.5 py-0.5 rounded text-[9px] font-bold font-sans top-1/2 -translate-y-1/2 shadow-sm text-foreground",
                    bounced ? "text-destructive border-destructive/20 bg-destructive/5" : "",
                    "ml-5" // offset label to the right of the dot
                )}>
                    {bounced ? `❌ ${packet.label}` : packet.label}
                </div>
            </div>
        </div>
    );
}

interface KafkaTubeProps {
    topic: string;
    messageCount: number;
    packets: Packet[];
    isPulsing?: boolean;
    isPulsingRed?: boolean;
    isFrozen?: boolean;
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}

export function KafkaTube({ topic, messageCount, packets, isPulsing, isPulsingRed, isFrozen, orientation = 'horizontal', className }: KafkaTubeProps) {
    const isVertical = orientation === 'vertical';

    return (
        <div className={cn("relative flex items-center justify-center w-full h-full z-0 transition-opacity", isFrozen && "opacity-60", className)}>

            {/* The Wire */}
            <div className={cn(
                "absolute rounded-full transition-colors z-0",
                isVertical ? "h-full w-[3px]" : "w-full h-[3px]",
                isPulsing ? "bg-primary shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse" :
                    isPulsingRed ? "bg-destructive shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" :
                        "bg-muted"
            )}>
                {/* Arrow Indicators */}
                {isVertical && (
                    <div className="absolute inset-x-[-2] h-full flex flex-col items-center justify-between py-2 text-primary pointer-events-none -ml-[4.5px]">
                        <ArrowUp size={12} className="opacity-90" />
                        <ArrowDown size={12} className="opacity-90" />
                    </div>
                )}
            </div>

            {/* Status Box */}
            <div className={cn(
                "z-10 bg-card border px-3 py-1.5 rounded-lg flex items-center gap-3 shadow-sm transition-colors",
                isPulsing ? "border-primary/50" :
                    isPulsingRed ? "border-destructive/50" :
                        "border-border"
            )}>
                <span className="text-primary font-sans text-[10px] font-bold">{topic}</span>
                <span className="bg-muted text-muted-foreground font-sans text-[10px] px-1.5 py-0.5 rounded border border-border">
                    {messageCount}
                </span>
            </div>

            {/* Packets Container */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                {packets.map(packet => <ActivePacket key={packet.id} packet={packet} isFrozen={!!isFrozen} />)}
            </div>

        </div>
    );
}
