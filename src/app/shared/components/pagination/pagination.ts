import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type PageItem = number | 'gap';

/**
 * Páginas exibidas: sempre a primeira, a última e as vizinhas da atual;
 * intervalos omitidos viram "gap" (reticências).
 */
export function pageWindow(current: number, last: number): PageItem[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const pages = new Set([1, last, current - 1, current, current + 1]);
  const visible = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);

  return visible.flatMap((page, index) =>
    index > 0 && page - visible[index - 1] > 1 ? ['gap' as const, page] : [page],
  );
}

/**
 * Navegação entre páginas com links reais (`?page=N`), que funcionam com SSR
 * e sem JavaScript. A página 1 não leva o parâmetro, evitando URLs duplicadas.
 */
@Component({
  selector: 'app-pagination',
  imports: [RouterLink],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly currentPage = input.required<number>();
  readonly lastPage = input.required<number>();

  protected readonly items = computed(() => pageWindow(this.currentPage(), this.lastPage()));
  protected readonly hasPrevious = computed(() => this.currentPage() > 1);
  protected readonly hasNext = computed(() => this.currentPage() < this.lastPage());

  protected queryParams(page: number): { page: number | null } {
    return { page: page > 1 ? page : null };
  }
}
