import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type LayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

const navLinks = [
  { href: "/", label: "Resumo" },
  { href: "/orders", label: "Pedidos" },
  { href: "/users", label: "Usuários" },
  { href: "/products", label: "Produtos" },
];

export function Layout({ children, title, subtitle }: LayoutProps) {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (href: string) => {
    setSidebarOpen(false);
    router.push(href);
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/pastita-logo.ico" alt="Pastita" />
          <div>
            <div>Pastita - Dashboard</div>
            <small className="muted">Painel administrativo</small>
          </div>
        </div>
        <nav className="nav">
          {navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => handleNav(link.href)}
              className={`unstyled ${router.pathname === link.href ? "active" : ""}`}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="card">
          <div className="muted" style={{ marginBottom: "0.35rem" }}>
            Conectado como
          </div>
          <div style={{ fontWeight: 700 }}>{user?.email ?? "Administrador"}</div>
          <button className="btn secondary" style={{ marginTop: "0.75rem", width: "100%" }} onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button className="mobile-toggle" onClick={() => setSidebarOpen((v) => !v)}>
            Menu
          </button>
          <div>
            {title && <h2 style={{ margin: 0 }}>{title}</h2>}
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
