import Head from "next/head";
import useSWR from "swr";
import { fetcher } from "@/lib/api";

type User = {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  last_login?: string;
  date_joined?: string;
};

type UsersResponse = {
  results: User[];
};

export default function UsersPage() {
  const { data, error, isLoading } = useSWR<UsersResponse>("/admin/users/", fetcher);

  return (
    <>
      <Head>
        <title>Usuários | Pastita Dash</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Clientes</h3>
        {isLoading && <div className="muted">Carregando usuários...</div>}
        {error && <div className="card">Erro ao carregar usuários.</div>}

        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Último acesso</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {data?.results?.map((user) => (
              <tr key={user.id}>
                <td>{`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "—"}</td>
                <td>{user.email}</td>
                <td>{user.phone ?? "—"}</td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleString() : "—"}</td>
                <td>{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
