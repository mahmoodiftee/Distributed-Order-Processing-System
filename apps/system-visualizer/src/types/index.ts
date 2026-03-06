

export type ServiceStatus = 'idle' | 'processing' | 'success' | 'failed' | 'offline' | 'crashed';
export type PacketColor = 'green' | 'red' | 'yellow';
export type AnimationType = 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down' | 'bounce-right' | 'bounce-left' | 'bounce-up' | 'bounce-down';

export interface ServiceState {
    status: ServiceStatus;
    log: string;
    isOffline: boolean;
    participated: boolean;
    isIdempotent?: boolean;
    bootProgress?: number;
}

export interface ServicesState {
    order: ServiceState;
    saga: ServiceState;
    inventory: ServiceState;
    payment: ServiceState;
    confirmed: ServiceState;
}

export interface Packet {
    id: string;
    tubeId: string;
    label: string;
    color: PacketColor;
    animation: AnimationType;
}

export interface Product {
    id: string;
    name: string;
    stock: number;
    price: number;
}

export interface SagaDbRow {
    orderId: string;
    status: string;
    currentStep: string;
    failureReason: string;
    updatedAt: string;
}

export type EventBorder = 'green' | 'red' | 'yellow' | 'gray';

export interface LogEvent {
    id: string;
    timestamp: string;
    name: string;
    source: string;
    destination: string;
    payload: any;
    color: EventBorder;
    icon: React.ReactNode;
}
