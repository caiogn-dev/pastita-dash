import { useState } from "react";
import Head from "next/head";
import useSWR from "swr";
import { fetcher } from "@/lib/api";

type OrderItem = {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  user_email?: string;
  customer_name?: string;
  created_at?: string;
};

type OrdersResponse = {
  results: OrderItem[];
};

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "canceled", label: "Cancelados" },
];

export default function OrdersPage() {
  const [status, setStatus] = useState("all");
  const { data, error, isLoading } = useSWR<OrdersResponse>(
    () => `/admin/orders/${status !== "all" ? `?status=${status}` : ""}`,
    fetcher,
  );

  return (
    <>
      <Head>
        <title>Pedidos | Pastita Dash</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="card">
        <div className="inline" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div className="muted">Filtrar por status</div>
            <div className="inline">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`chip ${status === opt.value ? "active" : ""}`}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && <div className="muted">Carregando pedidos...</div>}
        {error && <div className="card">Erro ao carregar pedidos.</div>}

        <table className="table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {data?.results?.map((order) => (
              <tr key={order.id}>
                <td>{order.order_number}</td>
                <td>{order.user_email ?? order.customer_name ?? "—"}</td>
                <td>R$ {order.total_amount?.toFixed?.(2) ?? order.total_amount}</td>
                <td>
                  <span className={`status ${order.status}`}>{order.status}</span>
                </td>
                <td>{order.payment_status ?? "—"}</td>
                <td>{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
