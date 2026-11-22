import {
  Component,
  DOCUMENT,
  DestroyRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
  signal,
} from '@angular/core';
import { ArticleSection } from '../article-html';

/** Um título conta como "sendo lido" quando passa desta distância do topo da tela. */
export const ACTIVE_SECTION_OFFSET = 120;

/**
 * Sumário do post ("Nesta página") com as seções `##` a `####`, recuadas por nível. Em telas largas fica numa
 * coluna fixa ao lado do texto (ver post-page.scss); no celular, é um bloco
 * recolhível no topo do artigo. Destaca a seção que está sendo lida.
 *
 * Os links usam âncoras (#secao-...), tratadas por handleInPageLinkClick: rolam
 * até o título e movem o foco para ele.
 */
@Component({
  selector: 'app-table-of-contents',
  templateUrl: './table-of-contents.html',
  styleUrl: './table-of-contents.scss',
})
export class TableOfContents {
  readonly sections = input.required<ArticleSection[]>();

  /** Lista aberta no celular; em telas largas ela fica sempre visível. */
  protected readonly open = signal(false);
  protected readonly activeId = signal<string | null>(null);

  private readonly document = inject(DOCUMENT);
  private frame: number | null = null;
  /** Já há uma atualização agendada; marcado antes da chamada, pois o callback pode rodar na hora. */
  private updateScheduled = false;

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const view = this.document.defaultView;

      if (!view) {
        return;
      }

      const schedule = () => this.scheduleUpdate();
      view.addEventListener('scroll', schedule, { passive: true });
      view.addEventListener('resize', schedule, { passive: true });
      destroyRef.onDestroy(() => {
        view.removeEventListener('scroll', schedule);
        view.removeEventListener('resize', schedule);

        if (this.frame !== null) {
          view.cancelAnimationFrame(this.frame);
        }
      });
    });

    // Recalcula quando as seções mudam (ex.: outro post) e os títulos já estão no DOM.
    afterRenderEffect(() => {
      this.sections();
      this.updateActiveSection();
    });
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  /** Agrupa as atualizações da rolagem num quadro de animação. */
  private scheduleUpdate(): void {
    const view = this.document.defaultView;

    if (!view || this.updateScheduled) {
      return;
    }

    this.updateScheduled = true;
    this.frame = view.requestAnimationFrame(() => {
      this.updateScheduled = false;
      this.frame = null;
      this.updateActiveSection();
    });
  }

  /**
   * A seção ativa é a do último título que já passou do topo da tela. Antes do
   * primeiro título nenhuma fica ativa; no fim da página, a última.
   */
  private updateActiveSection(): void {
    const view = this.document.defaultView;
    const sections = this.sections();
    let active: string | null = null;

    for (const { id } of sections) {
      const heading = this.document.getElementById(id);

      if (heading && heading.getBoundingClientRect().top <= ACTIVE_SECTION_OFFSET) {
        active = id;
      }
    }

    const root = this.document.documentElement;
    const atBottom =
      view !== null && view.innerHeight + view.scrollY >= root.scrollHeight - 2 && view.scrollY > 0;

    if (atBottom && sections.length) {
      active = sections[sections.length - 1].id;
    }

    this.activeId.set(active);
  }
}
