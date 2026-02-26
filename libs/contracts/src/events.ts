export interface OrderCreatedEvent {
    orderId: string;
    customerId: string;
    productId: string;
    quantity: number;
    totalAmount: number;
}

export interface StockReservedEvent {
    orderId: string;
    productId: string;
    quantity: number;
}

export interface StockFailedEvent {
    orderId: string;
    reason: string;
}

export interface PaymentCompletedEvent {
    orderId: string;
    customerId: string;
    amount: number;
}

export interface PaymentFailedEvent {
    orderId: string;
    reason: string;
}