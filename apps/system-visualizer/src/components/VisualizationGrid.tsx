import { ShoppingCart, Package, CreditCard, CheckCircle, Cpu } from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import { KafkaTube } from './KafkaTube';
import { Banners } from './Banners';
import type { ServicesState, Packet } from '../types';

interface VisualizationGridProps {
    servicesState: ServicesState;
    shakingFastService: string | null;
    showLightning: boolean;
    pulsingOrangeService: string | null;
    celebratingService: string | null;
    simulationStatus: string;
    tubeCounts: Record<string, number>;
    pulsingTubes: string[];
    redPulsingTubes: string[];
    isCrashedSaga: boolean;
    getPacketsForTube: (id: string) => Packet[];
    bannerInfo: {
        orderId: string;
        amount: string;
        reason: string;
        origin: string;
    };
}

export function VisualizationGrid({
    servicesState,
    shakingFastService,
    showLightning,
    pulsingOrangeService,
    celebratingService,
    simulationStatus,
    tubeCounts,
    pulsingTubes,
    redPulsingTubes,
    isCrashedSaga,
    getPacketsForTube,
    bannerInfo
}: VisualizationGridProps) {
    return (
        <div className="flex-1 bg-muted/20 rounded-xl border border-border flex items-center justify-center p-4 relative overflow-hidden min-h-[500px] lg:min-h-0">
            <Banners
                status={simulationStatus as any}
                orderId={bannerInfo.orderId}
                amount={bannerInfo.amount}
                reason={bannerInfo.reason}
                origin={bannerInfo.origin}
            />

            <div className="flex flex-col lg:grid lg:grid-cols-4 lg:grid-rows-[auto_1fr_auto] gap-x-4 gap-y-4 lg:gap-y-0 w-full max-w-5xl mx-auto items-center justify-items-center py-8 lg:py-0">
                {/* Row 1: Services */}
                <div className="w-full max-w-[180px] lg:col-start-1 lg:row-start-1">
                    <ServiceCard
                        name="Order Service"
                        status={servicesState.order.status}
                        log={servicesState.order.log}
                        icon={<ShoppingCart size={28} />}
                        isOffline={servicesState.order.isOffline}
                        isIdempotent={servicesState.order.isIdempotent}
                        checkBadge={simulationStatus === 'SUCCESS' && servicesState.order.participated}
                    />
                </div>

                <div className="lg:hidden w-full h-[60px]">
                    <KafkaTube
                        topic="order.created"
                        orientation="vertical"
                        messageCount={tubeCounts['order.created'] || 0}
                        packets={getPacketsForTube('order.created')}
                        isPulsing={pulsingTubes.includes('order.created')}
                        isPulsingRed={redPulsingTubes.includes('order.created')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>

                <div className="w-full max-w-[180px] lg:col-start-2 lg:row-start-1">
                    <ServiceCard
                        name="Inventory Service"
                        status={servicesState.inventory.status}
                        log={servicesState.inventory.log}
                        icon={<Package size={28} />}
                        isOffline={servicesState.inventory.isOffline}
                        isIdempotent={servicesState.inventory.isIdempotent}
                        shakingFast={shakingFastService === 'inventory'}
                        showLightning={shakingFastService === 'inventory' && showLightning}
                        pulsingOrange={pulsingOrangeService === 'inventory'}
                        checkBadge={simulationStatus === 'SUCCESS' && servicesState.inventory.participated}
                    />
                </div>

                <div className="lg:hidden w-full h-[60px]">
                    <KafkaTube
                        topic="stock.reserved"
                        orientation="vertical"
                        messageCount={tubeCounts['stock.reserved'] || 0}
                        packets={getPacketsForTube('stock.reserved')}
                        isPulsing={pulsingTubes.includes('stock.reserved')}
                        isPulsingRed={redPulsingTubes.includes('stock.reserved')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>

                <div className="w-full max-w-[180px] lg:col-start-3 lg:row-start-1">
                    <ServiceCard
                        name="Payment Service"
                        status={servicesState.payment.status}
                        log={servicesState.payment.log}
                        icon={<CreditCard size={28} />}
                        isOffline={servicesState.payment.isOffline}
                        isIdempotent={servicesState.payment.isIdempotent}
                        shakingFast={shakingFastService === 'payment'}
                        showLightning={shakingFastService === 'payment' && showLightning}
                        checkBadge={simulationStatus === 'SUCCESS' && servicesState.payment.participated}
                    />
                </div>

                <div className="lg:hidden w-full h-[60px]">
                    <KafkaTube
                        topic="payment.completed"
                        orientation="vertical"
                        messageCount={tubeCounts['payment.completed'] || 0}
                        packets={getPacketsForTube('payment.completed')}
                        isPulsing={pulsingTubes.includes('payment.completed')}
                        isPulsingRed={redPulsingTubes.includes('payment.completed')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>

                <div className="w-full max-w-[180px] lg:col-start-4 lg:row-start-1">
                    <ServiceCard
                        name="Order Confirmed"
                        status={servicesState.confirmed.status}
                        log={servicesState.confirmed.log}
                        icon={<CheckCircle size={28} />}
                        isOffline={servicesState.confirmed.isOffline}
                        isIdempotent={servicesState.confirmed.isIdempotent}
                        celebrating={celebratingService === 'confirmed'}
                        checkBadge={simulationStatus === 'SUCCESS' && servicesState.confirmed.participated}
                    />
                </div>

                <div className="lg:hidden w-full h-[60px]">
                    <KafkaTube
                        topic="order.confirmed"
                        orientation="vertical"
                        messageCount={tubeCounts['order.confirmed'] || 0}
                        packets={getPacketsForTube('order.confirmed')}
                        isPulsing={pulsingTubes.includes('order.confirmed')}
                        isPulsingRed={redPulsingTubes.includes('order.confirmed')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>

                {/* Row 2: V-Tubes (Desktop only) */}
                <div className="hidden lg:block lg:col-start-1 lg:row-start-2 w-full h-[120px] py-1">
                    <KafkaTube
                        topic="order.created"
                        orientation="vertical"
                        messageCount={tubeCounts['order.created'] || 0}
                        packets={getPacketsForTube('order.created')}
                        isPulsing={pulsingTubes.includes('order.created')}
                        isPulsingRed={redPulsingTubes.includes('order.created')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>
                <div className="hidden lg:block lg:col-start-2 lg:row-start-2 w-full h-[120px] py-1">
                    <KafkaTube
                        topic="stock.reserved"
                        orientation="vertical"
                        messageCount={tubeCounts['stock.reserved'] || 0}
                        packets={getPacketsForTube('stock.reserved')}
                        isPulsing={pulsingTubes.includes('stock.reserved')}
                        isPulsingRed={redPulsingTubes.includes('stock.reserved')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>
                <div className="hidden lg:block lg:col-start-3 lg:row-start-2 w-full h-[120px] py-1">
                    <KafkaTube
                        topic="payment.completed"
                        orientation="vertical"
                        messageCount={tubeCounts['payment.completed'] || 0}
                        packets={getPacketsForTube('payment.completed')}
                        isPulsing={pulsingTubes.includes('payment.completed')}
                        isPulsingRed={redPulsingTubes.includes('payment.completed')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>
                <div className="hidden lg:block lg:col-start-4 lg:row-start-2 w-full h-[120px] py-1">
                    <KafkaTube
                        topic="order.confirmed"
                        orientation="vertical"
                        messageCount={tubeCounts['order.confirmed'] || 0}
                        packets={getPacketsForTube('order.confirmed')}
                        isPulsing={pulsingTubes.includes('order.confirmed')}
                        isPulsingRed={redPulsingTubes.includes('order.confirmed')}
                        isFrozen={simulationStatus === 'CRASHED'}
                    />
                </div>

                {/* Row 3: Saga Orchestrator */}
                <div className="w-full lg:max-w-4xl lg:col-start-1 lg:col-span-4 lg:row-start-3 relative z-20 mt-4 lg:mt-1">
                    <ServiceCard
                        name="Saga Orchestrator"
                        status={servicesState.saga.status}
                        log={servicesState.saga.log}
                        icon={<Cpu size={32} />}
                        isOffline={servicesState.saga.isOffline}
                        isIdempotent={servicesState.saga.isIdempotent}
                        checkBadge={simulationStatus === 'SUCCESS' && servicesState.saga.participated}
                        isCrashed={isCrashedSaga}
                        bootProgress={servicesState.saga.bootProgress}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    );
}
