const { format } = require('@react-input/mask');
console.log("Unmasked:", format('12345678910', { mask: 'ddd.ddd.ddd-dd', replacement: { d: /\d/ } }));
console.log("Masked:", format('123.456.789-10', { mask: 'ddd.ddd.ddd-dd', replacement: { d: /\d/ } }));
