// Thin wrapper: the tie-out checks live in scripts/airports/validate.mjs (shared by ASUR and OMA).
process.argv.push('--company=asur');
await import('../airports/validate.mjs');
