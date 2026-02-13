const PROXY_TARGET = 'http://localhost:5000';

// Angular 19/Vite: use ** for nested paths like /api/expenses/2
module.exports = {
  '/api/**': {
    target: PROXY_TARGET,
    secure: false,
    changeOrigin: true,
  },
};
