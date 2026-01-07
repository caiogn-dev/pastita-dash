import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import { useRouter } from "next/router";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteGuard } from "@/components/RouteGuard";
import { Layout } from "@/components/Layout";
import { RealtimeBridge } from "@/components/RealtimeBridge";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const withoutLayout = router.pathname === "/login";

  const pageTitleMap: Record<string, { title: string; subtitle?: string }> = {
    "/": { title: "Resumo", subtitle: "Visão rápida do negócio" },
    "/orders": { title: "Pedidos", subtitle: "Acompanhe a fila e status" },
    "/users": { title: "Usuários", subtitle: "Clientes cadastrados" },
    "/products": { title: "Produtos", subtitle: "Catálogo e estoque" },
  };

  const meta = pageTitleMap[router.pathname] || { title: "Painel Pastita" };

  return (
    <AuthProvider>
      <Head>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="googlebot" content="noindex,nofollow" />
      </Head>
      <RouteGuard>
        {withoutLayout ? (
          <Component {...pageProps} />
        ) : (
          <Layout title={meta.title} subtitle={meta.subtitle}>
            <RealtimeBridge />
            <Component {...pageProps} />
          </Layout>
        )}
      </RouteGuard>
    </AuthProvider>
  );
}
