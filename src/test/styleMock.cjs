// Stub para imports de CSS em testes Jest (identity-obj-proxy não é dependência).
// Retorna um Proxy onde qualquer classe acessada devolve seu próprio nome,
// imitando CSS Modules sem exigir um pacote externo.
module.exports = new Proxy(
  {},
  {
    get: (_target, key) => (key === "__esModule" ? false : String(key)),
  }
);
