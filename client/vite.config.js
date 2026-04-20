import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://host.docker.internal:5001',  //use localhost if not using docker 
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://host.docker.internal:5001', //use localhost if not using docker
                changeOrigin: true,
            },
        },
    },
})
