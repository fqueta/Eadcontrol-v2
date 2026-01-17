
import http from 'k6/http';

export default function () {
  console.log('--- Iniciando Diagnóstico ---');
  
  // 1. Teste Frontend
  const resFront = http.get('https://cursos.incluireeducar.com.br/');
  console.log(`[Frontend] Status: ${resFront.status}`);
  if (resFront.status !== 200) {
      console.log(`[Frontend] Body Preview: ${resFront.body ? resFront.body.substring(0, 150) : 'Sem corpo'}`);
  }

  // 2. Teste API
  const resApi = http.get('https://api-cursos.incluireeducar.com.br/api/v1/health-check');
  console.log(`[API] Status: ${resApi.status}`);
}
