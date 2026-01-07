import { FormEvent, useMemo, useState } from "react";
import Head from "next/head";
import useSWR from "swr";
import api, { fetcher } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category?: string;
  is_active?: boolean;
};

type ProductsResponse = {
  results: Product[];
};

export default function ProductsPage() {
  const { data, error, isLoading, mutate } = useSWR<ProductsResponse>("/admin/products/", fetcher);
  const [formState, setFormState] = useState<Partial<Product>>({
    name: "",
    price: 0,
    stock_quantity: 0,
    category: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(formState.id), [formState.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      if (!formState.name) throw new Error("Nome é obrigatório");
      if (!formState.price) throw new Error("Preço é obrigatório");

      if (isEditing && formState.id) {
        await api.patch(`/admin/products/${formState.id}/`, formState);
        setMessage("Produto atualizado com sucesso.");
      } else {
        await api.post("/admin/products/", formState);
        setMessage("Produto criado com sucesso.");
      }
      setFormState({ name: "", price: 0, stock_quantity: 0, category: "", is_active: true });
      mutate();
    } catch (err: any) {
      setMessage(err?.message || "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setFormState(product);
    setMessage(null);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) return;
    setDeletingId(productId);
    setMessage(null);
    try {
      await api.delete(`/admin/products/${productId}/`);
      setMessage("Produto removido.");
      mutate();
    } catch (err: any) {
      setMessage(err?.message || "Erro ao remover produto.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Produtos | Pastita Dash</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="card-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{isEditing ? "Editar produto" : "Novo produto"}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                value={formState.name ?? ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="inline">
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="price">Preço (R$)</label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formState.price ?? 0}
                  onChange={(e) => setFormState((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="stock">Estoque</label>
                <input
                  id="stock"
                  type="number"
                  value={formState.stock_quantity ?? 0}
                  onChange={(e) => setFormState((prev) => ({ ...prev, stock_quantity: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="category">Categoria</label>
              <input
                id="category"
                value={formState.category ?? ""}
                onChange={(e) => setFormState((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
            <div className="inline">
              <label className="inline" style={{ gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={formState.is_active ?? true}
                  onChange={(e) => setFormState((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                Ativo
              </label>
            </div>
            {message && <div className="muted">{message}</div>}
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar produto"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Catálogo</h3>
          {isLoading && <div className="muted">Carregando produtos...</div>}
          {error && <div className="card">Erro ao carregar produtos.</div>}

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Categoria</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.results?.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>R$ {product.price?.toFixed?.(2) ?? product.price}</td>
                  <td>{product.stock_quantity}</td>
                  <td>{product.category ?? "—"}</td>
                  <td className="inline">
                    <button className="btn secondary" onClick={() => handleEdit(product)}>
                      Editar
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? "Removendo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
