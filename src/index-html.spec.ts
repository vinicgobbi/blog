import { hasSidebarInitScript } from '@vinicgobbi/ui/sidebar';
import { hasThemeInitScript } from '@vinicgobbi/ui/theme';
import indexHtml from './index.html' with { loader: 'text' };

/** Os scripts anti-flash são copiados da biblioteca; uma versão nova pode mudá-los. */
describe('index.html', () => {
  it('traz o script anti-flash do tema da versão instalada de @vinicgobbi/ui', () => {
    expect(hasThemeInitScript(indexHtml)).toBe(true);
  });

  it('traz o script anti-flash do menu lateral da versão instalada de @vinicgobbi/ui', () => {
    expect(hasSidebarInitScript(indexHtml)).toBe(true);
  });
});
