// src/services/youtubeService.ts
//
// Busca pública (funciona sem conectar nada) + playlists/curtidos (exige
// "Conectar YouTube" -- ver /auth/youtube no DataCenter). Popup +
// postMessage, mesmo padrão do Login with Google (ver LoginModal.tsx).
const API_URL = import.meta.env.VITE_API_URL || '';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Falha na requisição (${response.status})`);
  }
  return response.json();
}

export const youtubeService = {
  getStatus: () => request<{ connected: boolean }>('/youtube/status'),
  search: (q: string) => request<YouTubeVideo[]>(`/youtube/search?q=${encodeURIComponent(q)}`),
  getMyPlaylists: () => request<YouTubePlaylist[]>('/youtube/me/playlists'),
  getPlaylistItems: (id: string) => request<YouTubeVideo[]>(`/youtube/playlists/${id}/items`),
  getLiked: () => request<YouTubeVideo[]>('/youtube/me/liked'),

  connect(): Promise<void> {
    const width = 480;
    const height = 640;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    return new Promise((resolve, reject) => {
      function handleMessage(event: MessageEvent) {
        // Mesmo raciocínio do login: tudo passa pelo Nginx, a origem
        // esperada é sempre a origem atual da página.
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          resolve();
        }
      }
      window.addEventListener('message', handleMessage);

      fetch(`${API_URL}/auth/youtube`, { credentials: 'include' })
        .then((r) => r.json())
        .then(({ url }) => {
          window.open(url, 'YouTubeConnect', `width=${width},height=${height},top=${top},left=${left}`);
        })
        .catch((err) => {
          window.removeEventListener('message', handleMessage);
          reject(err);
        });
    });
  },
};
