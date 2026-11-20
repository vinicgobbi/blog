import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PostSummary } from '../../models/blog';
import { PostCard } from './post-card';

registerLocaleData(localePt, 'pt-BR');

const POST: PostSummary = {
  id: 1,
  title: 'Meu primeiro post',
  slug: 'meu-primeiro-post',
  excerpt: 'Um resumo curto',
  cover_image_url: null,
  published_at: '2026-11-20T01:30:00-03:00',
  reading_time: 4,
  author: { name: 'Autora' },
  category: { id: 1, name: 'Laravel', slug: 'laravel', description: null },
  tags: [{ id: 1, name: 'php', slug: 'php' }],
};

function render(post: PostSummary): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '-0300' } },
    ],
  });
  const fixture = TestBed.createComponent(PostCard);
  fixture.componentRef.setInput('post', post);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

describe('PostCard', () => {
  it('links the title to the post page', () => {
    const link = render(POST).querySelector('h2 a');

    expect(link?.textContent?.trim()).toBe('Meu primeiro post');
    expect(link?.getAttribute('href')).toBe('/posts/meu-primeiro-post');
  });

  it('shows the publication date in Brazilian Portuguese and Brasília time', () => {
    const time = render(POST).querySelector('time');

    expect(time?.textContent?.trim()).toBe('20 de novembro de 2026');
    expect(time?.getAttribute('datetime')).toBe(POST.published_at);
  });

  it('shows reading time, excerpt, category and tags', () => {
    const element = render(POST);

    expect(element.querySelector('.meta')?.textContent).toContain('4 min de leitura');
    expect(element.querySelector('.excerpt')?.textContent).toContain('Um resumo curto');
    expect(element.querySelector('a.category')?.getAttribute('href')).toBe('/categorias/laravel');
    expect(element.querySelector('.tags a')?.getAttribute('href')).toBe('/tags/php');
  });

  it('omits cover, category, excerpt and tags when the post has none', () => {
    const element = render({ ...POST, category: null, excerpt: null, tags: [] });

    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('a.category')).toBeNull();
    expect(element.querySelector('.excerpt')).toBeNull();
    expect(element.querySelector('.tags')).toBeNull();
  });

  it('renders the cover as a decorative image linked to the post', () => {
    const element = render({ ...POST, cover_image_url: 'https://cdn.example/capa.jpg' });

    const cover = element.querySelector('a.cover');
    expect(cover?.getAttribute('aria-hidden')).toBe('true');
    expect(cover?.querySelector('img')?.getAttribute('alt')).toBe('');
  });
});
