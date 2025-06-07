import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import './styles/fonts.css';
import './styles/index.css';
import App from './App';
import { startCleanupService } from './services/cleanupService';

// 启动协作记录清理服务
startCleanupService();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
