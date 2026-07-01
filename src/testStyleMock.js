/**
 * Stub para imports de CSS/SCSS nos testes (Jest).
 *
 * Substitui o `identity-obj-proxy` (que não é dependência do projeto): imports
 * de estilo com efeito colateral (`import './x.css'`) viram um objeto vazio, e
 * eventuais acessos a classes de CSS Modules (`styles.foo`) retornam o próprio
 * nome da propriedade, preservando o comportamento esperado em asserções.
 */
module.exports = new Proxy(
  {},
  {
    get: (_target, key) => (key === '__esModule' ? false : key),
  }
);
