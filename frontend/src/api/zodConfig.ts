import * as z from 'zod';

// Zod 4 compiles fast validators with `new Function`, which the Content-Security-Policy forbids
// (no 'unsafe-eval'): even its feature check would be reported as a violation. Validate without
// code generation instead. Imported before any schema is created (main.tsx, test setup).
z.config({ jitless: true });
