
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
  // Teste no Frontend (Nginx Static)
  const res = http.get('https://cursos.incluireeducar.com.br/'); 

  // Debug: Se falhar, mostrar o erro no console (apenas 1% das vezes para não poluir)
  if (res.status !== 200 && Math.random() < 0.01) {
    console.log('Erro Status:', res.status, 'Body:', res.body ? res.body.substring(0, 100) : 'Sem corpo');
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
    'protocol is HTTP/2': (r) => r.proto === 'HTTP/2.0',
  });

  sleep(1);
}
