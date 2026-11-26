import { redirect } from "react-router";

/** /lingerie → /ankara, permanently (the line was renamed on 2026-11-26). */
export function loader() {
  return redirect("/ankara", 301);
}

export default function Moved() {
  return null;
}
