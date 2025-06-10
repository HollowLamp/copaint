import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    proxy: {
      // 代理阿里云AI API
      '/api/dashscope': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dashscope/, ''),
        headers: {
          'Origin': 'https://dashscope.aliyuncs.com'
        }
      },
      // 代理Picsum Photos API解决CORS问题
      '/api/picsum': {
        target: 'https://picsum.photos',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/picsum/, ''),
        headers: {
          'Origin': 'https://picsum.photos'
        }
      },
      // 代理Fastly CDN (Picsum的CDN)
      '/api/fastly-picsum': {
        target: 'https://fastly.picsum.photos',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fastly-picsum/, ''),
        headers: {
          'Origin': 'https://fastly.picsum.photos'
        }
      }
    }
  }
});
