import { data } from "react-router";
import type { Route } from "./+types/policy";
import { getSettings } from "~/lib/catalogue.server";

const TITLES = { delivery: "Delivery", returns: "Returns", privacy: "Privacy" } as const;
type Name = keyof typeof TITLES;

export async function loader({ params, context }: Route.LoaderArgs) {
  if (!(params.name in TITLES)) throw data(null, { status: 404 });
  const name = params.name as Name;
  const settings = await getSettings(context.cloudflare.env);
  return { title: TITLES[name], body: settings.policies[name] };
}

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data ? `${data.title} · Harries Vogue` : "Harries Vogue" }];
}

export default function Policy({ loaderData }: Route.ComponentProps) {
  return (
    <article className="mx-auto max-w-2xl px-(--spacing-gutter) pb-24 pt-10 md:pt-14">
      <h1 className="text-4xl tracking-(--tracking-display)">{loaderData.title}</h1>
      <div className="mt-8 whitespace-pre-line text-lg leading-relaxed">{loaderData.body}</div>
    </article>
  );
}
