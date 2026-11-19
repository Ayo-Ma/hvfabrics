import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { minQty, formatMoney, multiply, unitLabel } from "@hv/core";
import { CloseIcon, MinusIcon, PlusIcon } from "@hv/ui";
import emptyBag from "@hv/ui/illustrations/empty-bag.webp";
import { useBag } from "~/lib/bag";
import { ButtonLink } from "./Button";
import { ProductImage } from "./ProductImage";
import { StateMessage } from "./StateMessage";

/** Bag drawer: a native modal <dialog> (focus trap, Esc to close) sliding in from the right. */
export function BagDrawer() {
  const bag = useBag();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (bag.isOpen && !d.open) d.showModal();
    if (!bag.isOpen && d.open) d.close();
  }, [bag.isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="bag-title"
      onClose={bag.close}
      onClick={(e) => e.target === ref.current && bag.close()}
      className="bag-drawer m-0 ml-auto h-dvh max-h-none w-full max-w-md bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <h2 id="bag-title" className="text-2xl">
            Your bag
          </h2>
          <button type="button" onClick={bag.close} className="grid size-11 place-items-center hover:bg-grey-100">
            <CloseIcon title="Close bag" />
          </button>
        </div>

        {bag.items.length === 0 ? (
          <StateMessage
            illustration={emptyBag}
            title="Your bag is empty"
            headingLevel={2}
            action={
              <ButtonLink to="/fabrics" variant="ink" onClick={bag.close}>
                Shop fabrics
              </ButtonLink>
            }
          >
            Let's find something beautiful.
          </StateMessage>
        ) : (
          <>
            <ul className="flex-1 space-y-6 overflow-y-auto px-6 py-2">
              {bag.items.map((item) => (
                <li key={item.variantId} className="grid grid-cols-[88px_1fr] gap-4">
                  <Link to={`/p/${item.slug}`} onClick={bag.close} className="block bg-grey-100">
                    {item.image && (
                      <ProductImage image={item.image} sizes="88px" className="aspect-[4/5] w-full object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0">
                    <div className="flex justify-between gap-3">
                      <Link to={`/p/${item.slug}`} onClick={bag.close} className="font-medium leading-snug hover:underline">
                        {item.title}
                      </Link>
                      <p className="tabular shrink-0 font-semibold">{formatMoney(multiply(item.unitPrice, item.qty))}</p>
                    </div>
                    <p className="mt-1 text-[15px] text-grey-600">
                      {item.variantLabel} · {formatMoney(item.unitPrice)} per {unitLabel(item.unit, 1)}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center bg-grey-100">
                        <button
                          type="button"
                          className="grid size-10 place-items-center hover:bg-grey-200 disabled:text-grey-300"
                          onClick={() => bag.setQty(item.variantId, item.qty - 1)}
                          disabled={item.qty <= minQty(item.unit)}
                          aria-label={`Remove one ${unitLabel(item.unit, 1)} of ${item.title}`}
                        >
                          <MinusIcon size={20} />
                        </button>
                        <span className="tabular min-w-16 text-center text-[15px]" aria-live="polite">
                          {item.qty} {unitLabel(item.unit, item.qty)}
                        </span>
                        <button
                          type="button"
                          className="grid size-10 place-items-center hover:bg-grey-200 disabled:text-grey-300"
                          onClick={() => bag.setQty(item.variantId, item.qty + 1)}
                          disabled={item.qty >= item.max}
                          aria-label={`Add one ${unitLabel(item.unit, 1)} of ${item.title}`}
                        >
                          <PlusIcon size={20} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-[15px] text-grey-600 underline underline-offset-4 hover:text-ink"
                        onClick={() => bag.remove(item.variantId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="bg-grey-50 px-6 pb-6 pt-5">
              <div className="flex items-baseline justify-between">
                <p className="font-medium">Subtotal</p>
                <p className="tabular text-xl font-semibold">{formatMoney(bag.subtotal)}</p>
              </div>
              <p className="mt-1 text-[15px] text-grey-600">Delivery is calculated at checkout.</p>
              <ButtonLink to="/checkout" onClick={bag.close} className="mt-5 w-full">
                Checkout
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
