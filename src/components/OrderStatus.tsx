import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';
const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 10;

interface Order {
  session_id: string;
  product_id: string;
  quantity: number;
  size: string | null;
  amount_total: number | null;
  currency: string | null;
  status: string;
}

interface OrderStatusProps {
  sessionId: string;
}

export default function OrderStatus({ sessionId }: OrderStatusProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (order || attempts >= MAX_ATTEMPTS) {
      if (attempts >= MAX_ATTEMPTS && !order) setGaveUp(true);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          setOrder(await res.json());
          return;
        }
      } catch {
        // network error, will retry until MAX_ATTEMPTS
      }
      setAttempts((n) => n + 1);
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [order, attempts, sessionId]);

  if (order) {
    return (
      <div className="order-status order-status-confirmed">
        <p>✅ Order confirmed and recorded.</p>
        <ul>
          <li>Product: {order.product_id}</li>
          <li>Quantity: {order.quantity}</li>
          {order.size && <li>Size: {order.size}</li>}
          {order.amount_total != null && (
            <li>
              Paid: {(order.amount_total / 100).toFixed(2)} {order.currency?.toUpperCase()}
            </li>
          )}
        </ul>
      </div>
    );
  }

  if (gaveUp) {
    return (
      <div className="order-status order-status-pending">
        <p>
          Still waiting on the webhook. Make sure <code>stripe listen</code> is running and
          forwarding to <code>/webhooks/stripe</code>, then refresh this page.
        </p>
      </div>
    );
  }

  return (
    <div className="order-status">
      <p>Waiting for payment confirmation from the Stripe webhook…</p>
    </div>
  );
}
