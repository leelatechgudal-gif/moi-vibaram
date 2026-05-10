import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'
import { execSync } from 'child_process'

let commitHash = ''
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) {
    commitHash = 'beta-2.0.3'
}

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(`${version} (${commitHash})`),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['ganesh.png'],
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
