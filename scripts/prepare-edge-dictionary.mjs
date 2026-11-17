import fs from 'node:fs';
import { terms } from '../src/domain/data.ts';
fs.writeFileSync('supabase/functions/_shared/terms.json',JSON.stringify(terms,null,2)+'\n');
