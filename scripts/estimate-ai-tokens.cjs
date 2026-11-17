const fs = require('fs');
const source = fs.readFileSync('supabase/functions/explain/index.ts', 'utf8');
const system = source.match(/systemInstruction:\{parts:\[\{text:'([^']+)'/)[1];
const terms = JSON.parse(fs.readFileSync('supabase/functions/_shared/terms.json', 'utf8'));
const lengths = terms.map(term => system.length + term.meaning.length);
const averageChars = lengths.reduce((a, n) => a + n, 0) / lengths.length;
const result = { basis: 'Approximation from actual prompt characters, 2–4 characters/token; not a tokenizer or measured API average. Protocol overhead is excluded.', roles: { parent: { normal_workflow: 0 }, specialist: { normal_workflow: 0 }, clinic: { normal_workflow: 0 } }, explanation: { terms: terms.length, average_input_characters: Math.round(averageChars), estimated_average_input_tokens: [Math.ceil(averageChars / 4), Math.ceil(averageChars / 2)], output_token_limit: 350, thinking_budget: 0, repeated_cached_term: 0, measured_average_total_tokens: null } };
fs.writeFileSync('AI_TOKEN_ESTIMATE.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
