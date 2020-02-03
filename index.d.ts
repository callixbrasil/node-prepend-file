declare module 'prepend-file-promise' {
  export function prependFile(filename: string, data: any, options?: any): Promise<void>
}