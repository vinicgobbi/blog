/**
 * Simula uma tela larga (o jsdom não tem matchMedia), onde o menu lateral é uma
 * coluna que pode ser recolhida. Retorna a função que desfaz a simulação.
 */
export function stubWideScreen(matches = true): () => void {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });

  return () => {
    if (original) {
      Object.defineProperty(window, 'matchMedia', original);
    } else {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  };
}
