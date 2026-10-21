import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Wurzel } from './Wurzel';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Wurzel />
  </StrictMode>,
);
