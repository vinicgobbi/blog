import {
  HttpEvent,
  HttpEventType,
  HttpProgressEvent,
  HttpResponse,
  HttpSentEvent,
} from '@angular/common/http';
import { firstValueFrom, from, toArray } from 'rxjs';
import { ResourceResponse } from '../../../shared/models/api';
import { Media } from '../../../shared/models/admin';
import { altFromFileName, formatBytes, toUploadEvents, validateImage } from './image-upload';

function file(name: string, type: string, size = 1000): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('validateImage', () => {
  it('accepts JPG, PNG, WebP and GIF up to 5 MB', () => {
    expect(validateImage(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(validateImage(file('a.gif', 'image/gif', 5 * 1024 * 1024))).toBeNull();
  });

  it('rejects other types such as SVG and PDF', () => {
    expect(validateImage(file('logo.svg', 'image/svg+xml'))).toContain(
      'não é uma imagem JPG, PNG, WebP ou GIF',
    );
    expect(validateImage(file('doc.pdf', 'application/pdf'))).toContain('doc.pdf');
  });

  it('rejects files over 5 MB', () => {
    expect(validateImage(file('grande.png', 'image/png', 5 * 1024 * 1024 + 1))).toBe(
      '"grande.png" tem mais de 5 MB.',
    );
  });
});

describe('altFromFileName', () => {
  it('turns the file name into a readable alt text', () => {
    expect(altFromFileName('pôr-do-sol_na_praia.jpg')).toBe('pôr do sol na praia');
  });
});

describe('formatBytes', () => {
  it('formats sizes in Brazilian Portuguese', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('toUploadEvents', () => {
  it('maps HTTP events to progress and the uploaded media', async () => {
    const media = { id: 1, url: 'http://x/y.png' } as Media;

    const events = await firstValueFrom(
      toUploadEvents(
        from<HttpEvent<ResourceResponse<Media>>[]>([
          { type: HttpEventType.Sent } as HttpSentEvent,
          { type: HttpEventType.UploadProgress, loaded: 50, total: 200 } as HttpProgressEvent,
          new HttpResponse({ body: { data: media } }),
        ]),
      ).pipe(toArray()),
    );

    expect(events).toEqual([
      { kind: 'progress', percent: 25 },
      { kind: 'done', media },
    ]);
  });
});
