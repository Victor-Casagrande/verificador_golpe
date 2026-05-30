/**
 * Helper para stub-ar módulos externos que podem estar ausentes em
 * `node_modules` durante a execução dos testes unitários.
 *
 * Estratégia: monkey-patch em `Module._load` que consulta um registro de
 * stubs ANTES de delegar para a resolução padrão. Permite testar módulos
 * que importam dependências nativas (bcrypt, jsonwebtoken, pg, puppeteer-core)
 * sem precisar de `npm install` no ambiente de CI.
 *
 * Uso típico em um teste:
 *
 *   const stubs = require("../helpers/moduleStubs");
 *   stubs.register({
 *     bcrypt: { hash: async () => "fake", compare: async () => true },
 *     jsonwebtoken: { sign: () => "fake.jwt", verify: () => ({}) },
 *   });
 *   // ... carregue o módulo que dependia desses pacotes ...
 *   stubs.restore();
 */

const Module = require("node:module");

const stubs = new Map();
let originalLoad = null;

const register = (mapping) => {
  for (const [name, exportsObj] of Object.entries(mapping)) {
    stubs.set(name, exportsObj);
  }

  if (originalLoad) return;

  originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (stubs.has(request)) {
      return stubs.get(request);
    }
    return originalLoad.apply(this, [request, parent, isMain]);
  };
};

const unregister = (name) => {
  stubs.delete(name);
};

const restore = () => {
  stubs.clear();
  if (originalLoad) {
    Module._load = originalLoad;
    originalLoad = null;
  }
};

const clearRequireCacheFor = (modulePath) => {
  delete require.cache[modulePath];
};

module.exports = {
  register,
  unregister,
  restore,
  clearRequireCacheFor,
};
