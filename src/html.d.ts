// Позволяет импортировать .html как строку (см. правило [[rules]] type="Text" в wrangler.toml)
declare module '*.html' {
  const content: string;
  export default content;
}
