import { ShoppingCart, Power, ToggleRight, ToggleLeft, Skull } from 'lucide-react';
import { cn } from '../utils/cn';
import { SagaDbPanel } from './SagaDbPanel';
import type { ServicesState, Product, SagaDbRow } from '../types';

interface ControlPanelProps {
    customerId: string;
    setCustomerId: (v: string) => void;
    selectedProduct: Product | null;
    setSelectedProduct: (p: Product) => void;
    products: Product[];
    quantity: number;
    setQuantity: (v: number) => void;
    simulateFailure: boolean;
    setSimulateFailure: (v: boolean) => void;
    simulationStatus: string;
    placeOrder: (isCrash: boolean) => void;
    toggleKillSwitch: (v: any) => void;
    servicesState: ServicesState;
    sagaDb: SagaDbRow | null;
    isOfflineSaga: boolean;
}

export function ControlPanel({
    customerId, setCustomerId,
    selectedProduct, setSelectedProduct,
    products,
    quantity, setQuantity,
    simulateFailure, setSimulateFailure,
    simulationStatus, placeOrder,
    toggleKillSwitch, servicesState,
    sagaDb, isOfflineSaga
}: ControlPanelProps) {
    return (
        <div className="flex flex-col gap-4 lg:overflow-y-auto pr-2 custom-scrollbar">
            {/* Controls */}
            <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2 flex items-center gap-2">
                    <ShoppingCart size={14} className="text-primary" /> Controls
                </h3>
                <div className="space-y-3 text-[11px]">
                    <div>
                        <label className="block text-muted-foreground mb-1">Customer ID</label>
                        <input
                            type="text"
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="w-full bg-secondary border border-border rounded px-2 py-1.5 focus:border-primary text-foreground outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-muted-foreground mb-1">Product</label>
                        <div className="space-y-1.5">
                            {products.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProduct(p)}
                                    className={cn(
                                        "p-1.5 rounded border flex justify-between cursor-pointer text-[10px]",
                                        selectedProduct?.id === p.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary"
                                    )}
                                >
                                    <div><span className="text-foreground">{p.name}</span> <span className={p.stock > 0 ? "text-green-600" : "text-destructive"}>({p.stock})</span></div>
                                    <div className="text-primary font-bold">${p.price}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/3">
                            <label className="block text-muted-foreground mb-1">Qty</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="w-full bg-secondary border border-border rounded px-2 py-1 focus:border-primary text-foreground outline-none"
                            />
                        </div>
                        <div className="flex-1 flex flex-col justify-end">
                            <div className="text-primary font-bold bg-card border border-border rounded px-2 py-1 text-right shadow-sm">
                                ${((selectedProduct?.price || 0) * quantity).toFixed(2)}
                            </div>
                        </div>
                    </div>
                    <div className="pt-2">
                        <div className="flex items-center justify-between p-2 border border-border bg-card rounded mb-2 shadow-sm">
                            <span className="text-muted-foreground font-medium">Fail Payment</span>
                            <button onClick={() => setSimulateFailure(!simulateFailure)} className={simulateFailure ? "text-destructive" : "text-muted"}>
                                {simulateFailure ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            </button>
                        </div>
                        <button
                            disabled={simulationStatus === 'PROCESSING' || simulationStatus === 'WAITING' || simulationStatus === 'RECOVERING' || simulationStatus === 'CRASHED' || !selectedProduct}
                            onClick={() => placeOrder(false)}
                            className="w-full bg-primary hover:opacity-90 text-primary-foreground font-bold py-2 rounded mb-2 disabled:opacity-50 transition-opacity shadow-sm"
                        >
                            Place Order
                        </button>
                        <button
                            disabled={simulationStatus === 'PROCESSING' || simulationStatus === 'WAITING' || simulationStatus === 'RECOVERING' || simulationStatus === 'CRASHED' || !selectedProduct}
                            onClick={() => placeOrder(true)}
                            className="w-full bg-card hover:bg-destructive/5 text-destructive border border-destructive/20 font-bold py-1.5 rounded disabled:opacity-50 flex justify-center gap-1 transition-colors shadow-sm"
                        >
                            <Skull size={14} /> Crash Simulator
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                <h3 className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2 flex items-center gap-2">
                    <Power size={14} className="text-destructive" /> Kill Switches
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {(['order', 'saga', 'inventory', 'payment'] as const).map((service) => (
                        <div key={service} className="flex items-center justify-between p-2 border border-border bg-secondary rounded text-[10px]">
                            <span className="capitalize text-muted-foreground font-medium">{service}</span>
                            <button
                                onClick={() => toggleKillSwitch(service)}
                                className={cn(
                                    "p-1 rounded-full border transition-colors",
                                    servicesState[service].isOffline ? "bg-muted text-muted-foreground border-border" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                )}
                            >
                                <Power size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-[150px]">
                <SagaDbPanel data={sagaDb} isOffline={isOfflineSaga} />
            </div>
        </div>
    );
}
