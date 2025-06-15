import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  
  const env = loadEnv(mode, process.cwd(), '')
  console.log('env:', env);
  console.log('API URL:', env.API_URL);
  return {

    base: '/',
    plugins: [react()],
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': [
              'react',
              'react-dom',
              'react-router-dom',
              '@tanstack/react-query',
              '@atlaskit/button',
              '@atlaskit/textfield',
              '@atlaskit/spinner',
              '@atlaskit/page',
              '@atlaskit/select',
              '@atlaskit/section-message',
              'react-markdown',
              'remark-gfm'
            ],
            'ui': [
              './src/components/PageHeader.tsx',
              './src/components/UserIcon.tsx',
              './src/components/PrivateRoute.tsx',
              './src/components/chat/CreateSessionModal.tsx',
              './src/components/chat/SessionList.tsx'
            ],
            'pages': [
              './src/pages/History.tsx',
              './src/pages/StreamPage.tsx',
              './src/pages/StreamFreePage.tsx',
              './src/pages/ModelComparison.tsx',
              './src/pages/Performance.tsx',
              './src/pages/ChatSessions.tsx',
              './src/pages/Login.tsx'
            ],
            'services': [
              './src/services/api.ts',
              './src/services/chatService.ts'
            ]
          }
        }
      }
    },
    define: {
      'import.meta.env.API_URL': JSON.stringify(env.API_URL),
    },
  }
}) 