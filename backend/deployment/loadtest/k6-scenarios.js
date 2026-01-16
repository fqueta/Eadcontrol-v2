import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    read_heavy: {
      executor: 'constant-vus',
      vus: 500,
      duration: '5m',
      exec: 'listCourses',
    },
    write_light: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      exec: 'enroll',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed: ['rate<0.005'],
  },
};

export function listCourses() {
  const res = http.get(`${__ENV.API_URL}/api/cursos`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

export function enroll() {
  const payload = JSON.stringify({ curso_id: 1 });
  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${__ENV.API_URL}/api/matriculas`, payload, { headers });
  check(res, { 'status is 200/202': (r) => r.status === 200 || r.status === 202 });
  sleep(1);
}

