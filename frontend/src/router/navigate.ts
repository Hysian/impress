import type { NavigateFunction } from "react-router-dom";

let navigateResolver: (navigate: NavigateFunction) => void;

export const navigatePromise = new Promise<NavigateFunction>((resolve) => {
  navigateResolver = resolve;
});

export function resolveNavigate(navigate: NavigateFunction): void {
  navigateResolver(navigate);
}
