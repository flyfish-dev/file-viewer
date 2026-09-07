declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => {
      exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
      close(): void;
    };
  }

  const initSqlJs: (options?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>;
  export default initSqlJs;
}

declare module '*vendor/avsc.cjs' {
  const avsc: any;
  export = avsc;
}

declare module 'ag-psd/dist/bundle.js' {
  const api: typeof import('ag-psd');
  export = api;
}
