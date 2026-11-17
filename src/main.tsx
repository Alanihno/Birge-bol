import {installModuleRecovery,setPendingMutations} from './lib/update-safety';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { AppProvider } from './lib/app-context';
import App from './App';
import { PwaProvider } from './lib/pwa-context';
import './styles.css';
import './readability.css';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false,staleTime:30000},mutations:{retry:0}}});
installModuleRecovery();
setPendingMutations(()=>queryClient.isMutating()>0);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><PwaProvider><AppProvider><App/></AppProvider></PwaProvider></QueryClientProvider></React.StrictMode>);

import './journey.css';

import './polish.css';

import './pro-reference.css';
import './care.css';
import './landing.css';
import './auth.css';
import './data-map.css';

import './update.css';

import './design-tokens.css';
import './components/mascot/mascot.css';
import './prompt5.css';

import './brand.css';
