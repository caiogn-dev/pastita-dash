import { FormEvent, useState } from "react";
import Head from "next/head";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <Head>
        <title>Login | Pastita Dash</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <h2 style={{ marginTop: 0 }}>Acesso ao painel</h2>
        <p className="muted">Use seu e-mail de administrador.</p>
        <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: "1rem" }}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pastita.com.br"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="card" style={{ background: "rgba(239,71,111,0.15)", borderColor: "rgba(239,71,111,0.5)" }}>
              {error}
            </div>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
