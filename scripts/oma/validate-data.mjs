// Thin wrapper: the tie-out checks live in scripts/airports/validate.mjs (shared by ASUR and OMA).
process.argv.push('--company=oma');
await import('../airports/validate.mjs');
