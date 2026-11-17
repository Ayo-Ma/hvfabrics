import { useNonce } from "./lib/nonce";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";
import satoshiBlack from "../../../assets/fonts/satoshi/satoshi-black.woff2?url";
import satoshiRegular from "../../../assets/fonts/satoshi/satoshi-regular.woff2?url";
import satoshiMedium from "../../../assets/fonts/satoshi/satoshi-medium.woff2?url";
import notFoundArt from "@hv/ui/illustrations/404.webp";
import errorArt from "@hv/ui/illustrations/error.svg";
import type { Route } from "./+types/root";
import { BagProvider } from "./lib/bag";
import { getCatalogue } from "./lib/catalogue.server";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { BagDrawer } from "./components/BagDrawer";
import { StateMessage } from "./components/StateMessage";
import { ButtonLink } from "./components/Button";
import { useRise } from "./lib/rise";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preload", href: satoshiBlack, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: satoshiRegular, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: satoshiMedium, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.webmanifest" },
];

export async function loader({ context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  // Show the banner whenever the catalogue holds placeholder products, wherever it came from.
  const catalogue = await getCatalogue(env).catch(() => null);
  return {
    imageBase: env.IMAGE_BASE,
    sampleData: Boolean(catalogue?.products.some((p) => p.placeholder)),
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const nonce = useNonce();
  return (
    <html lang="en-NG">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A0A0A" />
        {/* Lets CSS hide [data-rise] content only when script will reveal it. */}
        <script
          nonce={nonce || undefined}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');setTimeout(function(){if(!window.__hvHydrated)document.documentElement.classList.remove('js')},4000)" }} />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-dvh flex-col bg-paper text-ink antialiased">
        <BagProvider>
          {data?.sampleData && (
            <p className="bg-yellow px-4 py-1.5 text-center text-[13px] font-medium text-ink">
              Development preview: products and prices are placeholders, not real stock.
            </p>
          )}
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <BagDrawer />
        </BagProvider>
        <ScrollRestoration nonce={nonce || undefined} />
        <Scripts nonce={nonce || undefined} />
      </body>
    </html>
  );
}

export default function App() {
  useRise();
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const details = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;
  return (
    <>
      <title>{notFound ? "Page not found · Harries Vogue" : "Something snagged · Harries Vogue"}</title>
      <StateMessage
        illustration={notFound ? notFoundArt : errorArt}
        title={notFound ? "This page has been cut from the collection" : "Something snagged on our side"}
        action={<ButtonLink to="/" variant="ink">Back to the shop</ButtonLink>}
      >
        {notFound
          ? "The link may be old, or the product may have sold out and been removed."
          : "Please try again in a minute. Your bag is saved."}
      </StateMessage>
      {details && <pre className="mx-auto max-w-3xl overflow-x-auto p-4 text-xs">{details}</pre>}
    </>
  );
}
