import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import type { LogEvent } from '../types';

function EventLogRow({ event, flashHighlight }: { event: LogEvent, flashHighlight?: boolean }) {
    const [expanded, setExpanded] = useState(false);

    const borders = {
        green: 'border-green-500',
        red: 'border-red-500',
        yellow: 'border-yellow-500',
        gray: 'border-slate-500'
    };

    return (
        <div className={cn("bg-slate-900 border-l-4 rounded-r shadow-sm overflow-hidden text-sm font-mono transition-colors hover:bg-slate-800/50 animate-[slide-left_0.3s_cubic-bezier(0.4,0,0.2,1)_forwards] shrink-0", borders[event.color], flashHighlight && "animate-[ripple-center_1s_ease-out_forwards]")}>
            <div
                className="px-3 py-2 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 overflow-hidden w-full">
                    <div className="text-slate-400 shrink-0">
                        {event.icon}
                    </div>
                    <span className="text-slate-500 text-[10px] w-16 shrink-0">{event.timestamp}</span>
                    <span className={cn("font-bold text-xs truncate max-w-[120px] sm:max-w-none flex-1", event.color === 'red' ? 'text-red-400' : 'text-slate-200')}>
                        {event.name}
                    </span>
                    {event.source && event.destination && (
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 ml-2 bg-slate-950 px-1 py-0.5 rounded shrink-0">
                            {event.source} <ArrowRight size={10} className="mx-0.5" /> {event.destination}
                        </div>
                    )}
                </div>
                <button className="text-slate-500 hover:text-slate-300 ml-2 shrink-0">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            </div>

            {expanded && (
                <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-300 overflow-x-auto w-full">
                    <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

export function EventLogPanel({ events }: { events: LogEvent[] }) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    return (
        <div className="w-full h-[22vh] bg-slate-900/60 backdrop-blur-sm border-t border-slate-700 shadow-2xl relative z-20 flex flex-col shrink-0">
            <div className="bg-slate-950/50 px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-300 uppercase tracking-widest text-xs flex items-center gap-2">
                    System Event Log
                </h3>
                <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">{events.length} Events</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 relative custom-scrollbar">
                {events.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-sm">
                        Waiting for events...
                    </div>
                ) : (
                    events.map(ev => <EventLogRow key={ev.id} event={ev} />)
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
}
