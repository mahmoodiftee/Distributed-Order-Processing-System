
import { CheckCircle, X } from 'lucide-react';

interface BannersProps {
    status: string;
    orderId: string;
    amount: string;
    reason: string;
    origin: string;
}

export function Banners({ status, orderId, amount, reason, origin }: BannersProps) {
    if (status === 'IDLE' || status === 'PROCESSING' || status === 'WAITING' || status === 'RECOVERING' || status === 'CRASHED') return null;

    if (status === 'SUCCESS') {
        return (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-linear-to-r from-green-600 to-green-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.4)] border border-green-400 flex items-center gap-3 md:gap-4 animate-[slide-down_4s_cubic-bezier(0.4,0,0.2,1)_forwards] w-max max-w-[90vw]">
                <CheckCircle size={28} className="animate-pulse shrink-0" />
                <div>
                    <h2 className="text-lg md:text-xl font-bold tracking-tight">ORDER CONFIRMED</h2>
                    <p className="text-[10px] md:text-sm font-mono opacity-90 truncate">ID: {orderId} | Total: ${amount}</p>
                </div>
            </div>
        );
    }

    if (status === 'FAILED') {
        return (
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-linear-to-r from-red-600 to-red-500 text-white px-4 md:px-8 py-3 md:py-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] border border-red-400 flex items-center gap-3 md:gap-4 animate-[slide-down_4s_cubic-bezier(0.4,0,0.2,1)_forwards] w-max max-w-[90vw]">
                <X size={28} className="animate-pulse shrink-0" />
                <div>
                    <h2 className="text-lg md:text-xl font-bold tracking-tight">ORDER FAILED</h2>
                    <p className="text-[10px] md:text-sm font-mono opacity-90 truncate">{reason} {origin ? `(${origin})` : ''}</p>
                </div>
            </div>
        );
    }
    return null;
}
