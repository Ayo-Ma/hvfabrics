import { data } from "react-router";

/** Any unknown URL: the root ErrorBoundary renders the 404 page with its illustration. */
export function loader() {
  throw data(null, { status: 404 });
}

export default function NotFound() {
  return null;
}
