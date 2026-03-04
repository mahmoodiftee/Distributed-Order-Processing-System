export interface OrderCreatedEvent {
    orderId: string;
    customerId: string;
    productId: string;
    quantity: number;
    totalAmount: number;
    eventId: string;
}

export interface StockReservedEvent {
    orderId: string;
    productId: string;
    quantity: number;
    eventId: string;
}

export interface StockFailedEvent {
    orderId: string;
    reason: string;
    eventId: string;
}

export interface PaymentCompletedEvent {
    orderId: string;
    customerId: string;
    amount: number;
    eventId: string;
}

export interface PaymentFailedEvent {
    orderId: string;
    reason: string;
    eventId: string;
}