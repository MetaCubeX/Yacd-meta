/// <reference types="vite/client" />

// for css modules
declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

interface Window {
  i18n: any;
}

// webpack definePlugin replacing variables
declare const __VERSION__: string;
