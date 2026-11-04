import { describe, expect, it } from 'vitest';
import { idDoYoutube } from './VideoDesafio';

describe('idDoYoutube', () => {
  it('reconhece os formatos de link do YouTube', () => {
    expect(idDoYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('https://youtu.be/dQw4w9WgXcQ?si=abc')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('https://youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ');
    expect(idDoYoutube('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('devolve null para arquivo de vídeo, outro site ou id inválido', () => {
    expect(idDoYoutube('/video/desafio.mp4')).toBeNull();
    expect(idDoYoutube('https://everestt.app.br/video/desafio.mp4')).toBeNull();
    expect(idDoYoutube('https://www.instagram.com/reel/abc123/')).toBeNull();
    expect(idDoYoutube('https://www.youtube.com/watch?v=<script>')).toBeNull();
  });
});
