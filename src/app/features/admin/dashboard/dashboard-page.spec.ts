import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { postsPage } from '../../../../testing/blog-fixtures';
import { API_URL } from '../../../core/api';
import { DashboardPage } from './dashboard-page';

const API = 'http://api.test/api';

describe('DashboardPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('shows posts per state and pending comments', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: API },
      ],
    });
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http
      .expectOne(`${API}/admin/posts?state=published&per_page=1`)
      .flush(postsPage([], { total: 15 }));
    http
      .expectOne(`${API}/admin/posts?state=scheduled&per_page=1`)
      .flush(postsPage([], { total: 1 }));
    http
      .expectOne(`${API}/admin/posts?state=draft&per_page=1`)
      .flush(null, { status: 500, statusText: 'Erro' });
    http
      .expectOne(`${API}/admin/comments/counts`)
      .flush({ data: { pending: 3, approved: 10, rejected: 0, spam: 1 } });
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const stats = [...element.querySelectorAll('.stat')].map((stat) => [
      stat.querySelector('.stat__label')?.textContent?.trim(),
      stat.querySelector('.stat__value')?.textContent?.trim(),
    ]);
    expect(stats).toEqual([
      ['Publicados', '15'],
      ['Agendados', '1'],
      ['Rascunhos', '—'],
      ['Comentários pendentes', '3'],
    ]);
    expect(element.querySelector('.stat--alert .stat__label')?.textContent).toContain(
      'Comentários pendentes',
    );
  });
});
