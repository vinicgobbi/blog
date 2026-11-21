import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';
import { Category, Tag } from '../../../shared/models/blog';
import { BlogApi, TaxonomyKind } from '../blog-api';

interface TaxonomyIndexConfig {
  title: string;
  description: string;
  /** Página do blog, para o SEO; os itens ficam em `${path}/:slug`. */
  path: string;
  empty: string;
}

export const TAXONOMY_INDEX_CONFIG: Record<TaxonomyKind, TaxonomyIndexConfig> = {
  categories: {
    title: 'Categorias',
    description: 'Os assuntos do blog, cada um com os seus posts.',
    path: '/categorias',
    empty: 'Nenhuma categoria com posts publicados ainda.',
  },
  tags: {
    title: 'Tags',
    description: 'Todos os temas marcados nos posts.',
    path: '/tags',
    empty: 'Nenhuma tag com posts publicados ainda.',
  },
};

/** Texto da contagem de posts, ex.: "1 post" ou "12 posts". */
export function postsCountLabel(count: number | undefined): string {
  const total = count ?? 0;

  return `${total} ${total === 1 ? 'post' : 'posts'}`;
}

/**
 * Índice de categorias (`/categorias`) ou de tags (`/tags`): só as que têm
 * posts publicados, com a contagem. O tipo vem do `data.kind` da rota.
 */
@Component({
  selector: 'app-taxonomy-index-page',
  imports: [RouterLink],
  templateUrl: './taxonomy-index-page.html',
  styleUrl: './taxonomy-index-page.scss',
})
export class TaxonomyIndexPage {
  readonly kind = input.required<TaxonomyKind>();

  protected readonly config = computed(() => TAXONOMY_INDEX_CONFIG[this.kind()]);
  protected readonly items = inject(BlogApi).taxonomies(() => this.kind());
  protected readonly categories = computed(() => this.listOf<Category>('categories'));
  protected readonly tags = computed(() => this.listOf<Tag>('tags'));
  protected readonly postsCountLabel = postsCountLabel;

  constructor() {
    const seo = inject(SeoService);

    effect(() => {
      const config = this.config();

      seo.update({ title: config.title, description: config.description, path: config.path });
    });
  }

  /** Itens carregados, se o tipo atual for `kind`; undefined enquanto carrega. */
  private listOf<T extends Category | Tag>(kind: TaxonomyKind): T[] | undefined {
    if (this.kind() !== kind || !this.items.hasValue()) {
      return undefined;
    }

    return this.items.value()?.data as T[] | undefined;
  }
}
