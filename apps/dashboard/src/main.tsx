import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import "./app.css";
import { Shell } from "./components/Shell";
import { startAuth, useAuth, useMe } from "./lib/auth";
import { registerServiceWorker } from "./lib/push";
import { Login } from "./routes/Login";
import { OrderDetail } from "./routes/OrderDetail";
import { Orders } from "./routes/Orders";
import { ProductEditor } from "./routes/ProductEditor";
import { Products } from "./routes/Products";
import { Settings } from "./routes/Settings";
import { Stock } from "./routes/Stock";
import { Today } from "./routes/Today";
import type { ReactNode } from "react";

startAuth();
registerServiceWorker();

/** Products and stock are for owners and managers; packers land on the orders board. */
function NeedsProducts({ children }: { children: ReactNode }) {
  return useMe().can.products ? children : <Navigate to="/orders" replace />;
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Today /> },
      { path: "orders", element: <Orders /> },
      { path: "orders/:id", element: <OrderDetail /> },
      { path: "products", element: <NeedsProducts><Products /></NeedsProducts> },
      { path: "products/new", element: <NeedsProducts><ProductEditor /></NeedsProducts> },
      { path: "products/:id", element: <NeedsProducts><ProductEditor /></NeedsProducts> },
      { path: "stock", element: <NeedsProducts><Stock /></NeedsProducts> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

function App() {
  const auth = useAuth();
  if (auth.status === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted" aria-busy="true">
        Opening the shop…
      </main>
    );
  }
  if (auth.status !== "signed-in") return <Login state={auth} />;
  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
