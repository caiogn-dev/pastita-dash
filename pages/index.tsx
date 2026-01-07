import Head from "next/head";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import styles from "@/styles/Home.module.css";

type SummaryResponse = {
  today_revenue: number;
  today_orders: number;
  pending_orders: number;
  active_users: number;
};

export default function Home() {
  const { data, error, isLoading } = useSWR<SummaryResponse>("/admin/summary/", fetcher);

  return (
    <div className={styles.page}>
      <Head>
        <title>Painel Pastita</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Painel interno</p>
          <h1>Pastita Dashboard</h1>
          <p className={styles.lead}>Monitore pedidos, clientes e produtos em um só lugar.</p>
        </div>
      </header>

      <section className="card-grid">
        <div className="card">
          <div className="muted">Faturamento (hoje)</div>
          <h2 style={{ margin: 0 }}>R$ {data?.today_revenue?.toFixed(2) ?? "0,00"}</h2>
        </div>
        <div className="card">
          <div className="muted">Pedidos (hoje)</div>
          <h2 style={{ margin: 0 }}>{data?.today_orders ?? "—"}</h2>
        </div>
        <div className="card">
          <div className="muted">Pendentes</div>
          <h2 style={{ margin: 0 }}>{data?.pending_orders ?? "—"}</h2>
        </div>
        <div className="card">
          <div className="muted">Usuários ativos</div>
          <h2 style={{ margin: 0 }}>{data?.active_users ?? "—"}</h2>
        </div>
      </section>

      {error && <div className="card">Erro ao carregar resumo.</div>}
      {isLoading && <div className="muted">Carregando...</div>}
    </div>
  );
}
