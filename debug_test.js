
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  insecureSkipTLSVerify: true,
  stages: [
    { duration: '10s', target: 5 }, 
  ],
};

export default function () {
  const res = http.get('https://cursos.incluireeducar.com.br/'); 

  if (res.status !== 200) {
    console.log(`FALHA: Status ${res.status} `);
  } else {
    console.log(`SUCESSO: Status ${res.status}`);
  }

  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
