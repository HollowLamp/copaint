import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/reset.css';
import './styles/fonts.css';
import './styles/index.css';
import App from './App';
import { startCleanupScheduler } from './services/cleanupService';

// 启动优化后的协作记录清理调度器
startCleanupScheduler();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
