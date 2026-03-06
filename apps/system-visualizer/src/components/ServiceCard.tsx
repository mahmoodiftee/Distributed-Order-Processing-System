import type { ReactNode } from 'react';
import { Zap, Undo2 } from 'lucide-react';
import { cn } from '../utils/cn';
import type { ServiceStatus } from '../types';

interface ServiceCardProps {
    name: string;
    status: ServiceStatus;
    log: string;
    icon: ReactNode;
    isOffline: boolean;
    shakingFast?: boolean;
    pulsingOrange?: boolean;
    celebrating?: boolean;
    checkBadge?: boolean;
    isIdempotent?: boolean;
    showLightning?: boolean;
    isCrashed?: boolean;
    bootProgress?: number;
    className?: string;
}

export function ServiceCard({ name, status, log, icon, isOffline, shakingFast, pulsingOrange, celebrating, checkBadge, isIdempotent, showLightning, isCrashed, bootProgress, className }: ServiceCardProps) {
    const isDead = isOffline || isCrashed || status === 'crashed';

    const glowClass = isDead
        ? ''
        : celebrating
            ? 'shadow-[0_0_20px_rgba(79,70,229,0.1)] border-indigo-500/20'
            : isIdempotent
                ? 'shadow-[0_0_30px_rgba(6,182,212,0.6)] border-cyan-400 ring-4 ring-cyan-500/40 animate-pulse'
                : pulsingOrange
                    ? 'shadow-[0_0_20px_rgba(217,119,87,0.15)] border-brand-orange/30'
                    : status === 'processing'
                        ? 'shadow-[0_0_15px_rgba(234,179,8,0.1)] border-yellow-500/20'
                        : status === 'success'
                            ? 'shadow-[0_0_15px_rgba(34,197,94,0.1)] border-green-500/20'
                            : status === 'failed'
                                ? 'shadow-[0_0_15px_rgba(239,68,68,0.1)] border-red-500/20'
                                : 'border-border';

    const badgeColor = isDead
        ? 'bg-red-500/20 text-red-500 border-red-500/50'
        : status === 'processing'
            ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
            : isIdempotent
                ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                : status === 'success' || checkBadge
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : status === 'failed'
                        ? 'bg-red-500/20 text-red-400 border-red-500/50'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/50';

    return (
        <div className={cn("flex flex-col items-center w-full relative z-10", isCrashed && "animate-crt-tear", className)}>
            {celebrating && (
                <div className="absolute inset-0 rounded-xl animate-[ripple-center_1s_cubic-bezier(0,0.2,0.8,1)_infinite] pointer-events-none z-0"></div>
            )}
            <div
                className={cn(
                    "w-full bg-paper rounded-xl p-4 border border-border shadow-sm relative overflow-hidden",
                    "flex flex-col items-center transition-all duration-300",
                    glowClass,
                    isDead && "grayscale opacity-60",
                    shakingFast && "animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_infinite]"
                )}
            >
                {isDead && (
                    <div className="absolute inset-0 bg-secondary/50 z-20 pointer-events-none flex flex-col items-center justify-center border-2 border-destructive/20 rounded-xl">
                        <div className="bg-paper text-destructive font-bold tracking-widest px-3 py-1 text-sm border border-border rounded shadow-sm">
                            {isCrashed ? 'CRASHED' : 'OFFLINE'}
                        </div>
                    </div>
                )}

                {checkBadge && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-0.5 shadow-[0_0_10px_rgba(34,197,94,0.8)] z-20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                )}

                {isIdempotent && (
                    <div className="absolute top-2 right-2 bg-cyan-500 text-white rounded-full p-1 shadow-[0_0_10px_rgba(6,182,212,0.8)] z-20 animate-[bounce_2s_infinite]">
                        <Undo2 size={12} className="rotate-180" />
                    </div>
                )}

                {showLightning && (
                    <div className="absolute top-2 left-2 text-red-500 z-20 animate-pulse">
                        <Zap size={20} fill="currentColor" />
                    </div>
                )}

                <div className={cn("mb-2 transition-colors",
                    pulsingOrange ? "text-brand-orange" :
                        status === 'processing' ? "text-yellow-400" :
                            status === 'success' || checkBadge ? "text-green-400" :
                                isIdempotent ? "text-cyan-400" :
                                    status === 'failed' || isCrashed ? "text-red-400" :
                                        "text-blue-400",
                    isDead && "*:animate-none"
                )}>
                    {icon}
                </div>

                <h2 className="text-base font-bold text-foreground mb-1 text-center leading-tight">{name}</h2>

                <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-2 uppercase", badgeColor)}>
                    {isCrashed ? 'CRASHED' : isOffline ? 'OFFLINE' : status}
                </div>

                <div className={cn(
                    "w-full bg-secondary rounded border p-2 text-center text-[11px] font-sans flex flex-col items-center justify-center min-h-[36px] transition-colors gap-1",
                    status === 'failed' || isCrashed ? "border-destructive/30 text-destructive" :
                        pulsingOrange ? "border-brand-orange/30 text-brand-orange" :
                            isIdempotent ? "border-cyan-500/30 text-cyan-500 font-bold bg-cyan-500/5" :
                                log.includes('orphaned saga') ? "border-yellow-500/50 text-yellow-600 font-bold" :
                                    "border-border text-muted-foreground",
                    isCrashed && "opacity-0"
                )}>
                    <div className="flex items-center gap-1 leading-tight">
                        {pulsingOrange && <Undo2 size={12} />}
                        {showLightning && <Zap size={12} />}
                        {log}
                    </div>

                    {bootProgress !== undefined && (
                        <div className="w-full mt-1">
                            <div className="text-[9px] text-muted-foreground mb-0.5 text-left">Restarting Orchestrator...</div>
                            <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                                <div className="bg-primary h-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: `${bootProgress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
