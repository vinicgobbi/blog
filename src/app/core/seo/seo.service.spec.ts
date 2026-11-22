import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { DEFAULT_SHARE_IMAGE, SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let meta: Meta;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
  });

  it('sets title, description, canonical and Open Graph tags for an article', () => {
    seo.update({
      title: 'Meu post',
      description: 'Resumo do post',
      image: 'https://cdn.example/capa.jpg',
      path: '/posts/meu-post',
      type: 'article',
    });

    const expectedTitle = `Meu post | ${environment.siteName}`;
    const expectedUrl = `${environment.siteUrl}/posts/meu-post`;

    expect(TestBed.inject(Title).getTitle()).toBe(expectedTitle);
    expect(meta.getTag('name="description"')?.content).toBe('Resumo do post');
    expect(meta.getTag('property="og:title"')?.content).toBe(expectedTitle);
    expect(meta.getTag('property="og:type"')?.content).toBe('article');
    expect(meta.getTag('property="og:url"')?.content).toBe(expectedUrl);
    expect(meta.getTag('property="og:image"')?.content).toBe('https://cdn.example/capa.jpg');
    expect(meta.getTag('name="twitter:card"')?.content).toBe('summary_large_image');
    expect(
      TestBed.inject(DOCUMENT).querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(expectedUrl);
  });

  it('uses only the site name as title on pages without their own title', () => {
    seo.update({});

    expect(TestBed.inject(Title).getTitle()).toBe(environment.siteName);
    expect(meta.getTag('property="og:type"')?.content).toBe('website');
  });

  it('removes tags left by the previous page when the new page has no value for them', () => {
    seo.update({
      title: 'Post com capa',
      description: 'Resumo',
      image: 'https://cdn.example/capa.jpg',
    });

    seo.update({ title: 'Página sem capa' });

    expect(meta.getTag('property="og:image"')?.content).toBe(DEFAULT_SHARE_IMAGE.url);
    expect(meta.getTag('property="og:description"')?.content).toBe(
      environment.siteDescription.trim(),
    );
  });

  it('keeps a single canonical link across updates', () => {
    seo.update({ path: '/a' });
    seo.update({ path: '/b' });

    const links = TestBed.inject(DOCUMENT).querySelectorAll('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(`${environment.siteUrl}/b`);
  });

  it('announces the site RSS feed by default and a specific feed when given', () => {
    const alternate = () =>
      TestBed.inject(DOCUMENT).querySelectorAll(
        'link[rel="alternate"][type="application/rss+xml"]',
      );

    seo.update({});
    expect(alternate()).toHaveLength(1);
    expect(alternate()[0].getAttribute('href')).toBe(environment.feedUrl);

    seo.update({ feed: { url: 'http://api.test/feed/tags/php', title: 'Blog — #php' } });
    expect(alternate()).toHaveLength(1);
    expect(alternate()[0].getAttribute('href')).toBe('http://api.test/feed/tags/php');
    expect(alternate()[0].getAttribute('title')).toBe('Blog — #php');
  });

  it('marks pages as noindex only when requested', () => {
    seo.update({ noindex: true });
    expect(meta.getTag('name="robots"')?.content).toBe('noindex, follow');

    seo.update({});
    expect(meta.getTag('name="robots"')).toBeNull();
  });
});
