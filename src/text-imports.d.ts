/** Arquivos importados como texto nos testes: `import html from './x.html' with { loader: 'text' }`. */
declare module '*.html' {
  const content: string;
  export default content;
}
