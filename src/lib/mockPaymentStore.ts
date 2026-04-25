// Simple in-memory store for mock payment orders
// In production, use Redis or database

export interface MockOrder {
  userId: string;
  coins: number;
  amount: number;
  status: "created" | "captured" | "cancelled";
  createdAt: number;
}

const orders = new Map<string, MockOrder>();

export function getOrder(token: string): MockOrder | undefined {
  return orders.get(token);
}

export function setOrder(token: string, order: MockOrder): void {
  orders.set(token, order);
}

export function updateOrder(token: string, updates: Partial<MockOrder>): void {
  const order = orders.get(token);
  if (order) {
    orders.set(token, { ...order, ...updates });
  }
}

export function deleteOrder(token: string): void {
  orders.delete(token);
}

// Clean up old orders (older than 30 minutes)
export function cleanupOldOrders(): void {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  for (const [key, order] of orders.entries()) {
    if (order.createdAt < thirtyMinutesAgo) {
      orders.delete(key);
    }
  }
}
