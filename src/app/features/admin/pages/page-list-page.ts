import { DatePipe } from '@angular/common';
import { Component, DOCUMENT, Injector, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SeoService } from '../../../core/seo/seo.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AdminPage } from '../../../shared/models/admin';
import { AdminApi } from '../admin-api';

/** Direção de um movimento na ordem do menu: -1 sobe, 1 desce. */
export type MoveDirection = -1 | 1;

/** Troca a página de lugar com a vizinha; retorna a mesma lista se não houver para onde mover. */
export function movePage(pages: AdminPage[], id: number, direction: MoveDirection): AdminPage[] {
  const from = pages.findIndex((page) => page.id === id);
  const to = from + direction;

  if (from === -1 || to < 0 || to >= pages.length) {
    return pages;
  }

  const reordered = [...pages];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];

  return reordered;
}

/**
 * Move a página para antes da que hoje está em `targetIndex` (ou para o fim, com
 * `targetIndex` igual ao tamanho da lista); retorna a mesma lista se nada mudar.
 */
export function movePageTo(pages: AdminPage[], id: number, targetIndex: number): AdminPage[] {
  const from = pages.findIndex((page) => page.id === id);

  if (from === -1) {
    return pages;
  }

  const to = Math.min(
    Math.max(from < targetIndex ? targetIndex - 1 : targetIndex, 0),
    pages.length - 1,
  );

  if (to === from) {
    return pages;
  }

  const reordered = pages.filter((page) => page.id !== id);
  reordered.splice(to, 0, pages[from]);

  return reordered;
}

/** Onde a página arrastada vai cair em relação à linha sob o mouse. */
export interface DropTarget {
  id: number;
  placement: 'before' | 'after';
}

/**
 * Lista de páginas estáticas do admin (`/admin/paginas`), como "Sobre", na ordem
 * em que aparecem no menu do blog. A ordem muda arrastando a linha pela alça
 * ou com os botões de subir e descer (teclado e telas de toque).
 */
@Component({
  selector: 'app-page-list-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './page-list-page.html',
  styleUrl: '../admin-list.scss',
})
export class PageListPage {
  private readonly api = inject(AdminApi);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly toast = inject(ToastService);

  protected readonly pages = this.api.pages();
  /** Anúncio para leitores de tela depois de mover uma página. */
  protected readonly orderStatus = signal('');

  /** Página sendo arrastada e linha sobre a qual ela cairia. */
  protected readonly draggedId = signal<number | null>(null);
  protected readonly dropTarget = signal<DropTarget | null>(null);

  /** Última ordem salva na API, para desfazer se o salvamento falhar. */
  private savedOrder: AdminPage[] | null = null;
  /** Só a resposta do último salvamento atualiza a tela (cliques rápidos geram vários). */
  private lastSaveId = 0;

  constructor() {
    inject(SeoService).update({ title: 'Páginas', path: '/admin/paginas', noindex: true });
  }

  protected move(page: AdminPage, direction: MoveDirection): void {
    const current = this.pages.value();

    if (current && this.reorder(current, movePage(current, page.id, direction), page)) {
      this.keepFocus(page, direction);
    }
  }

  protected onDragStart(event: DragEvent, page: AdminPage): void {
    this.draggedId.set(page.id);
    // O Firefox só inicia o arraste com algum dado; a imagem arrastada é a linha inteira.
    event.dataTransfer?.setData('text/plain', String(page.id));

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }

    const row = (event.target as HTMLElement).closest('tr');

    if (row) {
      event.dataTransfer?.setDragImage(row, 16, 16);
    }
  }

  protected onDragOver(event: DragEvent, page: AdminPage): void {
    if (this.draggedId() === null) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const row = event.currentTarget as HTMLElement;
    const { top, height } = row.getBoundingClientRect();
    const placement = event.clientY < top + height / 2 ? 'before' : 'after';
    const target = this.dropTarget();

    if (target?.id !== page.id || target.placement !== placement) {
      this.dropTarget.set({ id: page.id, placement });
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const current = this.pages.value();
    const draggedId = this.draggedId();
    const target = this.dropTarget();
    this.onDragEnd();

    if (!current || draggedId === null || !target) {
      return;
    }

    const targetIndex =
      current.findIndex((page) => page.id === target.id) + (target.placement === 'after' ? 1 : 0);
    const page = current.find(({ id }) => id === draggedId)!;
    this.reorder(current, movePageTo(current, draggedId, targetIndex), page);
  }

  protected onDragEnd(): void {
    this.draggedId.set(null);
    this.dropTarget.set(null);
  }

  /**
   * Mostra a nova ordem na hora e salva na API; se o salvamento falhar, volta para
   * a última ordem salva. Retorna false quando a ordem não mudou.
   */
  private reorder(current: AdminPage[], reordered: AdminPage[], moved: AdminPage): boolean {
    if (reordered === current) {
      return false;
    }

    this.savedOrder ??= current;
    this.pages.set(reordered);
    this.orderStatus.set(
      `${moved.title} movida para a posição ${reordered.indexOf(moved) + 1} de ${reordered.length}.`,
    );
    void this.save(reordered, current);

    return true;
  }

  private async save(reordered: AdminPage[], previous: AdminPage[]): Promise<void> {
    const saveId = ++this.lastSaveId;

    try {
      const saved = await firstValueFrom(this.api.reorderPages(reordered.map(({ id }) => id)));

      if (saveId === this.lastSaveId) {
        this.pages.set(saved);
        this.savedOrder = null;
      } else {
        this.savedOrder = saved;
      }
    } catch {
      if (saveId === this.lastSaveId) {
        this.pages.set(this.savedOrder ?? previous);
        this.savedOrder = null;
        this.orderStatus.set('');
        this.toast.error('Não foi possível salvar a nova ordem. Tente novamente.');
      }
    }
  }

  protected async remove(page: AdminPage): Promise<void> {
    const warning = page.is_published ? ' Ela sai do blog imediatamente.' : '';

    if (!confirm(`Excluir a página "${page.title}"?${warning} Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await firstValueFrom(this.api.deletePage(page.id));
      this.pages.reload();
      this.toast.success(`Página "${page.title}" excluída.`);
    } catch {
      this.toast.error(`Não foi possível excluir "${page.title}". Tente novamente.`);
    }
  }

  /**
   * Mantém o foco no botão usado depois que a linha muda de lugar; se a página
   * chegou à ponta e o botão ficou desabilitado, passa o foco para o oposto.
   */
  private keepFocus(page: AdminPage, direction: MoveDirection): void {
    afterNextRender(
      () => {
        const used = this.document.getElementById(moveButtonId(page.id, direction));
        const opposite = this.document.getElementById(
          moveButtonId(page.id, -direction as MoveDirection),
        );
        const target = used instanceof HTMLButtonElement && !used.disabled ? used : opposite;
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected readonly moveButtonId = moveButtonId;
}

function moveButtonId(id: number, direction: MoveDirection): string {
  return `pagina-${id}-${direction < 0 ? 'subir' : 'descer'}`;
}
