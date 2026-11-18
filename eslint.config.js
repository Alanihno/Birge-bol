import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config({ignores:['dist-demo','деплой версель','dist','node_modules','.preview','.cache','supabase/functions','playwright-report','test-results']},js.configs.recommended,...tseslint.configs.recommended,{files:['**/*.{ts,tsx}'],languageOptions:{globals:{...globals.browser,...globals.node}},plugins:{'react-hooks':hooks},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}],'react-hooks/rules-of-hooks':'error','react-hooks/exhaustive-deps':'warn'}},{files:['**/*.{js,mjs,cjs}'],languageOptions:{globals:{...globals.node,...globals.browser}},rules:{'@typescript-eslint/no-require-imports':'off'}});
