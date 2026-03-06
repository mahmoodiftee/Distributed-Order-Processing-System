import { useState, useEffect, useRef } from 'react';
import type {
    ServicesState, ServiceState, ServiceStatus, PacketColor, Packet,
    Product, SagaDbRow
} from '../types';
import { PRODUCTS } from '../constants/products';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function useOrderSimulation() {
    const [simulationStatus, setSimulationStatus] = useState<'IDLE' | 'PROCESSING' | 'WAITING' | 'SUCCESS' | 'FAILED' | 'CRASHED' | 'RECOVERING'>('IDLE');

    const [servicesState, setServicesState] = useState<ServicesState>({
        order: { status: 'idle', log: 'Waiting...', isOffline: false, participated: false },
        saga: { status: 'idle', log: 'Waiting...', isOffline: false, participated: false },
        inventory: { status: 'idle', log: 'Waiting...', isOffline: false, participated: false },
        payment: { status: 'idle', log: 'Waiting...', isOffline: false, participated: false },
        confirmed: { status: 'idle', log: 'Waiting...', isOffline: false, participated: false },
    });

    const [activePackets, setActivePackets] = useState<Packet[]>([]);
    const [tubeCounts, setTubeCounts] = useState<Record<string, number>>({});
    const [pulsingTubes, setPulsingTubes] = useState<string[]>([]);
    const [redPulsingTubes, setRedPulsingTubes] = useState<string[]>([]);

    const [shakingFastService, setShakingFastService] = useState<keyof ServicesState | null>(null);
    const [showLightning, setShowLightning] = useState(false);
    const [pulsingOrangeService, setPulsingOrangeService] = useState<keyof ServicesState | null>(null);
    const [celebratingService, setCelebratingService] = useState<keyof ServicesState | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const [products, setProducts] = useState<Product[]>(PRODUCTS);
    const [sagaDb, setSagaDb] = useState<SagaDbRow | null>(null);
    const [pausedService, setPausedService] = useState<keyof ServicesState | null>(null);
    const [isCrashedSaga, setIsCrashedSaga] = useState(false);
    const processedStepsRef = useRef<Set<string>>(new Set());

    const [bannerInfo, setBannerInfo] = useState({ orderId: '', amount: '', reason: '', origin: '' });
    const [customerId, setCustomerId] = useState('customer-1');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [simulateFailure, setSimulateFailure] = useState(false);

    // Refs for async logic
    const servicesStateRef = useRef(servicesState);
    useEffect(() => { servicesStateRef.current = servicesState; }, [servicesState]);

    const pauseResolverRef = useRef<(() => void) | null>(null);
    const pausedServiceRef = useRef(pausedService);
    useEffect(() => { pausedServiceRef.current = pausedService; }, [pausedService]);

    const simulateFailureRef = useRef(simulateFailure);
    useEffect(() => { simulateFailureRef.current = simulateFailure; }, [simulateFailure]);

    const selectedProductRef = useRef(selectedProduct);
    useEffect(() => { selectedProductRef.current = selectedProduct; }, [selectedProduct]);

    useEffect(() => {
        if (shakingFastService) {
            const t = setTimeout(() => {
                setShakingFastService(null);
                setShowLightning(false);
            }, 500);
            return () => clearTimeout(t);
        }
    }, [shakingFastService]);

    useEffect(() => {
        if (showConfetti) {
            const t = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(t);
        }
    }, [showConfetti]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setActivePackets([{ id: 'demo-1', tubeId: 'order.created', label: 'Order', color: 'green', animation: 'slide-down' }]);
            setTimeout(() => setActivePackets([]), 850);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const safeSetService = (srv: keyof ServicesState, log?: string, status?: ServiceStatus, participated?: boolean, extraInfo?: Partial<ServiceState>) => {
        setServicesState(prev => ({
            ...prev,
            [srv]: {
                ...prev[srv],
                log: log !== undefined ? log : prev[srv].log,
                status: status !== undefined ? status : prev[srv].status,
                participated: participated !== undefined ? participated : prev[srv].participated,
                ...extraInfo
            }
        }));
    };

    const sendPacketAnim = async (tubeId: string, label: string, color: PacketColor, animPath: any, expectedSrv: keyof ServicesState) => {
        while (servicesStateRef.current[expectedSrv].isOffline || servicesStateRef.current[expectedSrv].status === 'crashed') {
            const pid = Math.random().toString();
            const retryAnim = animPath.replace('slide', 'bounce') as any;
            setActivePackets(p => [...p, { id: pid, tubeId, label, color, animation: retryAnim }]);

            await sleep(800);
            setActivePackets(p => p.filter(x => x.id !== pid));

            setSimulationStatus('WAITING');
            setPulsingTubes(prev => Array.from(new Set([...prev, tubeId])));
            safeSetService(expectedSrv, 'Service Unavailable — waiting for restart');
            setPausedService(expectedSrv);

            await new Promise<void>(res => { pauseResolverRef.current = res; });
        }

        const pid = Math.random().toString();
        setActivePackets(p => [...p, { id: pid, tubeId, label, color, animation: animPath }]);
        await sleep(800);
        setActivePackets(p => p.filter(x => x.id !== pid));
        setTubeCounts(c => ({ ...c, [tubeId]: (c[tubeId] || 0) + 1 }));
    };

    const placeOrder = async (isCrashSimulation: boolean = false) => {
        if (simulationStatus !== 'IDLE' && simulationStatus !== 'SUCCESS' && simulationStatus !== 'FAILED') return;

        setSimulationStatus('PROCESSING');
        setRedPulsingTubes([]);
        setPulsingOrangeService(null);
        setCelebratingService(null);
        setShowConfetti(false);
        setIsCrashedSaga(false);
        processedStepsRef.current = new Set();

        const orderId = 'ORD-' + Math.floor(Math.random() * 10000);
        const amount = ((selectedProductRef.current?.price || 0) * quantity).toFixed(2);
        setBannerInfo({ orderId, amount, reason: '', origin: '' });

        setServicesState({
            order: { status: 'idle', log: 'Waiting...', isOffline: servicesStateRef.current.order.isOffline, participated: false },
            saga: { status: 'idle', log: 'Waiting...', isOffline: servicesStateRef.current.saga.isOffline, participated: false },
            inventory: { status: 'idle', log: 'Waiting...', isOffline: servicesStateRef.current.inventory.isOffline, participated: false },
            payment: { status: 'idle', log: 'Waiting...', isOffline: servicesStateRef.current.payment.isOffline, participated: false },
            confirmed: { status: 'idle', log: 'Waiting...', isOffline: servicesStateRef.current.confirmed.isOffline, participated: false },
        });
        setSagaDb(null);

        // Step 1: Order -> Saga
        safeSetService('order', 'Received POST /orders', 'processing', true);
        await sleep(2000);
        safeSetService('order', 'Saving order as PENDING');
        await sleep(2000);
        safeSetService('order', 'Emitting ORDER_CREATED');
        await sendPacketAnim('order.created', 'ORDER_CREATED', 'green', 'slide-down', 'saga');

        // Step 2: Saga -> Inventory
        safeSetService('saga', 'ORDER_CREATED received', 'processing', true);
        await sleep(2000);
        safeSetService('saga', 'Persisting saga: status=STARTED');
        setSagaDb({ orderId, status: 'STARTED', currentStep: 'RESERVING_STOCK', failureReason: '-', updatedAt: new Date().toISOString() });
        await sleep(2000);
        safeSetService('saga', 'Forwarding to Inventory');
        await sendPacketAnim('stock.reserved', 'RESERVE_STOCK', 'green', 'slide-up', 'inventory');

        // Step 3: Inventory -> Saga
        safeSetService('inventory', 'Checking stock', 'processing', true);
        await sleep(2000);
        if (selectedProductRef.current && selectedProductRef.current.id === 'product-3') {
            safeSetService('inventory', 'INSUFFICIENT STOCK', 'failed');
            setShowLightning(true);
            setShakingFastService('inventory');
            await sleep(1000);
            await sendPacketAnim('stock.reserved', 'STOCK_FAILED', 'red', 'slide-down', 'saga');

            safeSetService('saga', 'Received STOCK_FAILED');
            await sleep(2000);
            setSagaDb(prev => prev ? { ...prev, status: 'FAILED', currentStep: 'FAILED', failureReason: 'Insufficient Stock', updatedAt: new Date().toISOString() } : prev);
            safeSetService('saga', 'Saga failed', 'failed');
            safeSetService('order', 'Order Failed', 'failed');
            setBannerInfo(p => ({ ...p, reason: 'Insufficient Stock', origin: 'Inventory Service' }));
            setSimulationStatus('FAILED');
            return;
        }

        const stepId = `${orderId}:inventory:RESERVE_STOCK`;
        if (processedStepsRef.current.has(stepId)) {
            safeSetService('inventory', '[IDEMPOTENT] Returned Cached Success', 'success', true, { isIdempotent: true });
            await sleep(1500);
            safeSetService('inventory', 'Stock reserved (verified)', 'success', true, { isIdempotent: false });
        } else {
            safeSetService('inventory', 'Stock reserved', 'success');
            setProducts(prev => prev.map(p => p.id === selectedProductRef.current?.id ? { ...p, stock: p.stock - quantity } : p));
            processedStepsRef.current.add(stepId);
        }
        await sendPacketAnim('stock.reserved', 'STOCK_RESERVED', 'green', 'slide-down', 'saga');

        safeSetService('saga', 'Received STOCK_RESERVED');
        await sleep(1000);

        // Step 4: Saga -> Payment
        await sendPacketAnim('payment.completed', 'PROCESS_PAYMENT', 'green', 'slide-up', 'payment');

        if (isCrashSimulation) {
            safeSetService('saga', 'Persisting step: CHARGING_PAYMENT');
            setSagaDb(p => p ? { ...p, currentStep: 'CHARGING_PAYMENT', updatedAt: new Date().toISOString() } : p);
            await sleep(400);
            setIsCrashedSaga(true);
            safeSetService('saga', 'CRITICAL FAULT', 'crashed');
            setSimulationStatus('CRASHED');
            await sleep(2500);
            safeSetService('saga', '', 'crashed', true, { bootProgress: 0 });
            for (let i = 0; i <= 100; i += 5) {
                safeSetService('saga', '', 'crashed', true, { bootProgress: i });
                await sleep(100);
            }
            setIsCrashedSaga(false);
            safeSetService('saga', 'Initializing...', 'idle', true, { bootProgress: undefined });
            await sleep(1000);
            safeSetService('saga', 'Connecting to Kafka...', 'idle', true);
            await sleep(1000);
            safeSetService('saga', 'Scanning for orphaned sagas...', 'processing', true);
            await sleep(1000);
            safeSetService('saga', 'Found orphaned saga!', 'processing', true);
            await sleep(1000);
            setSimulationStatus('RECOVERING');
            safeSetService('saga', 'Initiating idempotent resume...', 'processing', true);
            await sleep(1000);

            // DEMONSTRATE IDEMPOTENCY: Re-verify step
            safeSetService('saga', 'Checking Inventory (Deduplication)...', 'processing', true);
            await sendPacketAnim('stock.reserved', 'RESERVE_STOCK', 'green', 'slide-up', 'inventory');

            safeSetService('inventory', '[IDEMPOTENT] Returned Cached Success', 'success', true, { isIdempotent: true });
            await sleep(1500);
            safeSetService('inventory', 'Stock reserved (verified)', 'success', true, { isIdempotent: false });
            await sendPacketAnim('stock.reserved', 'STOCK_RESERVED', 'green', 'slide-down', 'saga');

            safeSetService('saga', 'Saga resumed — proceeding to Payment');
            await sleep(1000);
            setSimulationStatus('PROCESSING');
        }

        safeSetService('payment', 'Processing payment', 'processing', true);
        await sleep(2000);
        if (simulateFailureRef.current) {
            safeSetService('payment', 'PAYMENT DECLINED', 'failed');
            setShowLightning(true);
            setShakingFastService('payment');
            await sleep(1000);
            setRedPulsingTubes(['payment.completed']);
            await sendPacketAnim('payment.completed', 'PAYMENT_FAIL', 'red', 'slide-down', 'saga');
            setRedPulsingTubes(['payment.completed', 'stock.reserved']);
            safeSetService('saga', 'Payment failed, compensating');
            await sendPacketAnim('stock.reserved', 'COMPENSATING', 'red', 'slide-up', 'inventory');
            setPulsingOrangeService('inventory');
            safeSetService('inventory', 'Releasing stock');
            setProducts(prev => prev.map(p => p.id === selectedProductRef.current?.id ? { ...p, stock: p.stock + quantity } : p));
            await sleep(2000);
            await sendPacketAnim('stock.reserved', 'COMPENSATED', 'red', 'slide-down', 'saga');
            setRedPulsingTubes([]);
            safeSetService('saga', 'Saga failed');
            setSagaDb(prev => prev ? { ...prev, status: 'FAILED', currentStep: 'COMPENSATED', failureReason: 'Payment Declined', updatedAt: new Date().toISOString() } : prev);
            safeSetService('saga', 'Saga failed', 'failed');
            safeSetService('order', 'Order Failed', 'failed');
            setBannerInfo(p => ({ ...p, reason: 'Payment Declined', origin: 'Payment Service' }));
            setSimulationStatus('FAILED');
            return;
        }

        const payStepId = `${orderId}:payment:PROCESS_PAYMENT`;
        if (processedStepsRef.current.has(payStepId)) {
            safeSetService('payment', '[IDEMPOTENT] Returned Cached Success', 'success', true, { isIdempotent: true });
            await sleep(1500);
            safeSetService('payment', 'Payment successful', 'success', true, { isIdempotent: false });
        } else {
            safeSetService('payment', 'Payment successful', 'success');
            processedStepsRef.current.add(payStepId);
        }
        await sendPacketAnim('payment.completed', 'PAYMENT_OK', 'green', 'slide-down', 'saga');
        safeSetService('saga', 'Received PAYMENT_COMPLETED');
        await sleep(2000);
        setSagaDb(prev => prev ? { ...prev, status: 'COMPLETED', currentStep: 'DONE', failureReason: '-', updatedAt: new Date().toISOString() } : prev);
        safeSetService('saga', 'Saga completed', 'success');
        await sendPacketAnim('order.confirmed', 'ORDER_DONE', 'green', 'slide-up', 'confirmed');

        safeSetService('confirmed', 'Order Confirmed', 'success', true);
        safeSetService('order', 'Order Confirmed', 'success');
        setSimulationStatus('SUCCESS');
        setShowConfetti(true);
        setCelebratingService('confirmed');
    };

    const toggleKillSwitch = (serviceKey: keyof Omit<ServicesState, 'confirmed'>) => {
        setServicesState(prev => {
            const isCurrentlyOffline = prev[serviceKey].isOffline;
            const newState = { ...prev };

            if (!isCurrentlyOffline) {
                newState[serviceKey] = { ...newState[serviceKey], isOffline: true, status: 'offline', log: 'CONNECTION LOST' };
            } else {
                newState[serviceKey] = { ...newState[serviceKey], isOffline: false, status: 'idle', log: 'Initializing...' };
                setTimeout(() => safeSetService(serviceKey, 'Connecting to Kafka...', 'idle'), 500);
                setTimeout(() => {
                    safeSetService(serviceKey, 'ONLINE', 'idle');
                    if (pausedServiceRef.current === serviceKey) {
                        setSimulationStatus('PROCESSING');
                        setPulsingTubes([]);
                        setPausedService(null);
                        if (pauseResolverRef.current) { pauseResolverRef.current(); pauseResolverRef.current = null; }
                    }
                }, 1000);
            }
            return newState;
        });
    };

    return {
        simulationStatus,
        servicesState,
        activePackets,
        tubeCounts,
        pulsingTubes,
        redPulsingTubes,
        shakingFastService,
        showLightning,
        pulsingOrangeService,
        celebratingService,
        showConfetti,
        sagaDb,
        pausedService,
        isCrashedSaga,
        bannerInfo,
        customerId,
        selectedProduct,
        products,
        quantity,
        simulateFailure,
        setCustomerId,
        setSelectedProduct,
        setQuantity,
        setSimulateFailure,
        placeOrder,
        toggleKillSwitch,
        getPacketsForTube: (tubeId: string) => activePackets.filter(p => p.tubeId === tubeId),
    };
}
