import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Necessário para o container aceitar conexões externas
    allowedHosts: ['kombi-web-appliance']
  },
  // [AJUSTE] O worker interno do MapLibre GL usa sintaxe de ES module. Sem
  // isso, o Vite bundla workers como 'iife' por padrão -- o worker sai
  // malformado no build de produção e o carregamento dele fica pendurado
  // pra sempre (era por isso que maplibre-gl-worker.mjs nunca completava
  // e nenhum tile .pbf chegava a ser pedido).
  worker: {
    format: 'es',
  },
})