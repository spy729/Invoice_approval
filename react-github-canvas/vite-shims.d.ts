declare module "vite" {
  export function defineConfig(config: any): any;
  const _default: any;
  export default _default;
}

declare module "@vitejs/plugin-react-swc" {
  const plugin: any;
  export default plugin;
}

declare module "lovable-tagger" {
  export function componentTagger(): any;
}

declare module "path" {
  const path: any;
  export default path;
}

declare module "url" {
  export function fileURLToPath(url: string): string;
}

interface ImportMeta {
  url: string;
}
