
import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuração do Teste de Carga
export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp-up para 100 usuários
    { duration: '1m', target: 1000 }, // Carga de 1000 usuários
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requisições devem ser < 500ms
  },
};

export default function () {
  // Teste na API (Login ou Rota Pública)
  const res = http.get('https://api-cursos.incluireeducar.com.br/api/v1/health-check'); // Ajuste a rota se necessário

  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
  });

  sleep(1);
}
