import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      // 後から読み込むファイルの名前から中身が分からないように、ハッシュだけの名前にする
      output: { chunkFileNames: 'assets/[hash].js' },
    },
  },
});
