type NavigateFn = (path: string) => void;

const registry = new Map<string, NavigateFn>();

export function registerTabNav(tabName: string, fn: NavigateFn): void {
  registry.set(tabName, fn);
}

export function unregisterTabNav(tabName: string): void {
  registry.delete(tabName);
}

export function navigateTabWebView(tabName: string, path: string): void {
  registry.get(tabName)?.(path);
}
