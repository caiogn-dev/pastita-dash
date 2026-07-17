// Stub para imports de CSS/CSS Modules nos testes Jest.
// Substitui a dependência `identity-obj-proxy` (que não está instalada): para
// `import './x.css'` (efeito colateral) o valor é ignorado; para CSS Modules
// (`import styles from './x.module.css'`) devolve o próprio nome da classe,
// preservando o comportamento de `styles.foo === 'foo'`.
module.exports = new Proxy(
  {},
  {
    get: (_target, key) => (key === '__esModule' ? false : key),
  }
);
