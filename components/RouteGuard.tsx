import { useRouter } from "next/router";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const publicRoutes = ["/login"];

export function RouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const path = router.pathname;

    if (!token && !publicRoutes.includes(path)) {
      router.replace("/login");
    }
    if (token && publicRoutes.includes(path)) {
      router.replace("/");
    }
  }, [token, loading, router]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div className="muted">Carregando...</div>
      </div>
    );
  }

  const path = router.pathname;
  if (!token && !publicRoutes.includes(path)) return null;

  return <>{children}</>;
}
