/**
 * Fuso fixo em America/Sao_Paulo — o fuso do produto (operador brasileiro).
 *
 * Módulos de pedidos (`pedidosDoQuadro`, `fluxoDoPedido`) decidem "mesmo dia" e
 * formatam a hora de cada marco pelo fuso LOCAL do runtime (`Date#getDate`,
 * `toLocaleTimeString`). Rodando em UTC (CI/nuvem), um pedido de "ontem 21:00
 * -03:00" cai em "hoje" e um marco de "07:29 -03:00" vira "10:29": a suíte
 * reprovava 4 casos por 3h de diferença, sem nenhuma mudança de código. Definido
 * no topo do config (processo pai, antes dos workers) para que cada worker herde
 * o fuso pelo `process.env`. O invariante está travado em
 * `src/__tests__/fusoDosTestes.test.ts`.
 */
process.env.TZ = 'America/Sao_Paulo';

module.exports = {
  /**
   * Sem limite de workers o jest abria um por núcleo e a máquina passava mais
   * tempo trocando de contexto do que rodando teste: a suíte levava 154s e
   * reprovava 3 casos por TIMEOUT — casos diferentes a cada rodada, o que faz
   * o time aprender a ignorar vermelho. Com metade dos núcleos: 1009/1009 em
   * 26s. Mais lento em papel, seis vezes mais rápido na prática.
   */
  maxWorkers: '50%',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
    // O alias `@/` existe no tsconfig e no vite, mas não existia aqui: todo
    // arquivo que importa por `@/` era INTESTÁVEL — o jest não resolvia o
    // módulo e o teste morria antes de rodar. Eram 6 arquivos invisíveis para
    // a suíte, entre eles a tela de diagnóstico do WhatsApp.
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // `.spec.ts` além de `.test.ts`: a spec descreve o CONTRATO de um módulo
  // (o que ele promete a quem chama) e nasce antes da implementação; o teste
  // cobre o comportamento de uma tela ou de um bug específico. Nomes
  // diferentes para intenções diferentes.
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/__tests__/**/*.spec.ts?(x)'],
  transform: {
    '/src/mobile/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    '/src/components/whatsapp/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    // src/utils lê `import.meta.env` (base do storefront). Sem o transform, o
    // arquivo inteiro fica intestável — foi o que manteve storefrontUrl.ts sem
    // teste até agora.
    '/src/utils/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    // src/components/maps lê a chave do Google via `import.meta.env`.
    '/src/components/maps/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    // src/services e src/config leem `import.meta.env` (API base, slug da loja).
    // `(?!__tests__)` porque o transform reescreve `import.meta.env` no texto:
    // aplicado a um teste que MENCIONA a expressão num comentário, ele injeta
    // o stub no meio da prosa e o arquivo deixa de compilar.
    '/src/services/(?!__tests__/).+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    '/src/config/(?!__tests__/).+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
