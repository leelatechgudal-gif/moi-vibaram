import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Moi Vibaram',
                short_name: 'MoiVibaram',
                description: 'Digital Ledger for tracking traditional Moi transactions',
                theme_color: '#5c67f2',
                icons: [
                    {
                        src: 'ganesh.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'ganesh.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'ganesh.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
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
