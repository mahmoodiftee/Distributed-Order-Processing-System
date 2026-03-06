import { useState, useEffect, useRef } from 'react';
import { Database, X } from 'lucide-react';
import { cn } from '../utils/cn'; // Assume we create this util
import type { SagaDbRow } from '../types';

function FlashTd({ value }: { value: string }) {
    const [flash, setFlash] = useState(false);
    const prevVal = useRef(value);

    useEffect(() => {
        if (prevVal.current !== value) {
            setFlash(true);
            prevVal.current = value;

            const t = setTimeout(() => setFlash(false), 500);
            return () => clearTimeout(t);
        }
    }, [value]);

    return (
        <td className={cn("px-4 py-3 transition-colors duration-500", flash ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground", value === 'FAILED' && !flash ? 'text-destructive' : '')}>
            {value}
        </td>
    );
}

export function SagaDbPanel({ data, isOffline }: { data: SagaDbRow | null, isOffline: boolean }) {
    return (
        <div className={cn("w-full h-full bg-card border border-border rounded-lg shadow-sm relative transition-all flex flex-col overflow-hidden", isOffline && "ring-1 ring-destructive/20")}>
            <div className="bg-secondary px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-primary font-sans text-xs font-semibold">
                    <Database size={12} /> saga_orchestrator.Saga
                </div>
            </div>

            <div className="relative flex-1 overflow-auto">
                {isOffline && (
                    <div className="absolute inset-0 bg-background/40 z-20 flex items-center justify-center border-t-2 border-destructive/20 rounded-b-lg overflow-hidden">
                        <div className="bg-card text-destructive font-sans text-[10px] tracking-wider px-3 py-1 text-center border border-destructive/20 rounded flex flex-col items-center gap-1 shadow-sm font-bold">
                            <X size={14} className="text-destructive" />
                            ORCHESTRATOR OFFLINE<br />LAST KNOWN STATE
                        </div>
                    </div>
                )}

                <table className={cn("w-full text-xs text-left font-sans whitespace-nowrap", isOffline && "grayscale opacity-50")}>
                    <thead className="text-[10px] text-muted-foreground uppercase bg-muted/50">
                        <tr>
                            <th className="px-3 py-2">orderId</th>
                            <th className="px-3 py-2">status</th>
                            <th className="px-3 py-2">currentStep</th>
                            <th className="px-3 py-2">failureReason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data ? (
                            <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                <FlashTd value={data.orderId} />
                                <FlashTd value={data.status} />
                                <FlashTd value={data.currentStep} />
                                <FlashTd value={data.failureReason} />
                            </tr>
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-3 py-4 text-center text-slate-600">No active sagas</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
