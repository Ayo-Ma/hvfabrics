import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { LINES, LINE_LABELS, slugify, type Line, type Product, type ProductImage, type ProductInput, type Unit } from "@hv/core";
import { cx } from "@hv/ui";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ImagePlusIcon, PlusIcon, TrashIcon } from "@hv/ui/icons";
import { Button, ErrorLine, PageHeader, Panel, Skel, showToast } from "../components/ui";
import { Thumb } from "../components/Thumb";
import { ApiError } from "../lib/api";
import { saveProduct, useProduct, type Entry } from "../lib/data";
import { nairaInput, parseNaira } from "../lib/format";
import { addPhoto, type PhotoProgress } from "../lib/images/photos";

/**
 * Add or edit a product from her phone (PLAN.md: under 2 minutes with photos).
 * Order of the form = order of the job: photos, name, how it's sold, price and stock, save.
 * Everything optional sits below the options.
 */

interface OptionRow {
  key: string;
  colour: string;
  size: string;
  unit: Unit;
  price: string;
  stock: string;
  lowStockAt: string;
  sku: string;
  /** Held by shoppers paying right now (read-only). */
  held: number;
}

interface Photo extends Omit<ProductImage, "alt"> {
  alt: string;
}

interface Uploading {
  id: string;
  name: string;
  progress: PhotoProgress;
  error?: string;
}

interface Form {
  title: string;
  slug: string;
  slugTouched: boolean;
  line: Line;
  status: Product["status"];
  description: string;
  fibre: string;
  width: string;
  care: string;
  photos: Photo[];
  options: OptionRow[];
}

const defaultUnit = (line: Line): Unit => (line === "fabric" ? "yard" : "piece");

function blankOption(line: Line, key = "v1"): OptionRow {
  return { key, colour: "", size: "", unit: defaultUnit(line), price: "", stock: "", lowStockAt: "20", sku: "", held: 0 };
}

function toForm(e: Entry | null): Form {
  if (!e) {
    return { title: "", slug: "", slugTouched: false, line: "fabric", status: "live", description: "", fibre: "", width: "", care: "", photos: [], options: [blankOption("fabric")] };
  }
  const p = e.product;
  return {
    title: p.title,
    slug: p.slug,
    slugTouched: true,
    line: p.line,
    status: p.status,
    description: p.description,
    fibre: p.attributes.fibre ?? "",
    width: p.attributes.width ?? "",
    care: p.attributes.care ?? "",
    photos: p.images.map((i) => ({ ...i })),
    options: e.variants.map((v) => ({
      key: v.id.slice(v.id.lastIndexOf("--") + 2),
      colour: v.options.colour ?? "",
      size: v.options.size ?? "",
      unit: v.options.unit,
      price: nairaInput(v.price.amount),
      stock: String(v.stock),
      lowStockAt: String(v.lowStockAt),
      sku: v.sku,
      held: v.reserved,
    })),
  };
}

type Problems = Partial<Record<string, string>>;

function toInput(f: Form): { input: ProductInput } | { problems: Problems } {
  const problems: Problems = {};
  if (!f.title.trim()) problems.title = "Give it a name.";
  const slug = f.slug || slugify(f.title);
  if (f.options.length === 0) problems.options = "Add at least one option.";
  const variants = f.options.map((o, i) => {
    const price = parseNaira(o.price);
    const stock = /^\d+$/.test(o.stock.trim()) ? Number(o.stock) : null;
    const low = /^\d+$/.test(o.lowStockAt.trim()) ? Number(o.lowStockAt) : null;
    if (price === null || price <= 0) problems[`price-${i}`] = "Enter a price, e.g. 12500.";
    if (stock === null) problems[`stock-${i}`] = "Whole number.";
    else if (stock < o.held) problems[`stock-${i}`] = `${o.held} held by shoppers paying now.`;
    if (low === null) problems[`low-${i}`] = "Whole number.";
    return {
      key: o.key,
      sku: o.sku.trim() || `${slug.toUpperCase().replace(/-/g, "").slice(0, 16)}-${o.key.toUpperCase()}`,
      options: { unit: o.unit, ...(o.colour.trim() ? { colour: o.colour.trim() } : {}), ...(o.size.trim() ? { size: o.size.trim() } : {}) },
      price: { amount: price ?? 0, currency: "NGN" as const },
      stock: stock ?? 0,
      lowStockAt: low ?? 0,
    };
  });
  f.photos.forEach((p, i) => {
    if (!p.alt.trim()) problems[`alt-${i}`] = "Describe the photo for people who can't see it.";
  });
  if (Object.keys(problems).length) return { problems };
  return {
    input: {
      slug,
      line: f.line,
      title: f.title.trim(),
      description: f.description,
      // A photo added before the name got a stand-in description; give it the real name now.
      images: f.photos.map((p, i) => ({
        key: p.key,
        alt: /^Product, photo \d+$/.test(p.alt.trim()) ? `${f.title.trim()}, photo ${i + 1}` : p.alt.trim(),
        width: p.width,
        height: p.height,
      })),
      attributes: {
        ...(f.fibre.trim() ? { fibre: f.fibre.trim() } : {}),
        ...(f.width.trim() ? { width: f.width.trim() } : {}),
        ...(f.care.trim() ? { care: f.care.trim() } : {}),
      },
      status: f.status,
      variants,
    },
  };
}

export function ProductEditor() {
  const { id } = useParams();
  const q = useProduct(id ?? null);
  const back = (
    <Link to="/products" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
      <ChevronLeftIcon size={16} /> Products
    </Link>
  );
  if (id && q.error && !q.data) {
    return (
      <>
        {back}
        <ErrorLine error={q.error} retry={() => void q.refresh()} />
      </>
    );
  }
  if (id && !q.data) {
    return (
      <>
        {back}
        <Skel w={240} h={30} />
        <Skel h={180} className="mt-8" />
        <Skel h={260} className="mt-4" />
      </>
    );
  }
  return (
    <>
      {back}
      <Editor key={id ?? "new"} id={id ?? null} initial={toForm(q.data ?? null)} />
    </>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-[var(--radius-control)] border border-control bg-surface p-0.5 sm:w-auto">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx("h-9 flex-1 rounded-[5px] px-3 text-sm whitespace-nowrap sm:flex-none", value === o.id ? "bg-text font-medium text-paper" : "text-muted hover:text-text")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string | undefined; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-neg">{error}</span> : hint ? <span className="hint block">{hint}</span> : null}
    </label>
  );
}

function Editor({ id, initial }: { id: string | null; initial: Form }) {
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(initial);
  const [problems, setProblems] = useState<Problems>({});
  const [uploads, setUploads] = useState<Uploading[]>([]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setOption = (i: number, patch: Partial<OptionRow>) => setF((x) => ({ ...x, options: x.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));

  const onPick = (files: FileList | null) => {
    if (!files) return;
    for (const file of [...files]) {
      const uid = crypto.randomUUID();
      setUploads((u) => [...u, { id: uid, name: file.name, progress: { stage: "reading", share: 0 } }]);
      addPhoto(file, (progress) => setUploads((u) => u.map((x) => (x.id === uid ? { ...x, progress } : x))))
        .then((img) => {
          setF((x) => ({ ...x, photos: [...x.photos, { ...img, alt: `${x.title.trim() || "Product"}, photo ${x.photos.length + 1}` }] }));
          setUploads((u) => u.filter((x) => x.id !== uid));
        })
        .catch((e: unknown) => setUploads((u) => u.map((x) => (x.id === uid ? { ...x, error: e instanceof Error ? e.message : String(e) } : x))));
    }
  };

  const movePhoto = (i: number, by: -1 | 1) =>
    setF((x) => {
      const photos = [...x.photos];
      const [p] = photos.splice(i, 1);
      photos.splice(i + by, 0, p!);
      return { ...x, photos };
    });

  const addOption = () =>
    setF((x) => {
      const used = new Set(x.options.map((o) => o.key));
      let n = x.options.length + 1;
      while (used.has(`v${n}`)) n++;
      const last = x.options[x.options.length - 1];
      return { ...x, options: [...x.options, { ...blankOption(x.line, `v${n}`), ...(last ? { unit: last.unit, price: last.price, lowStockAt: last.lowStockAt } : {}) }] };
    });

  const save = async () => {
    setServerError(null);
    const r = toInput(f);
    if ("problems" in r) {
      setProblems(r.problems);
      return;
    }
    setProblems({});
    setSaving(true);
    try {
      const entry = await saveProduct(id, r.input);
      showToast(r.input.status === "live" ? "Saved. It's in the shop." : "Saved.");
      if (!id) navigate(`/products/${entry.product.id}`, { replace: true });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const busyUploading = uploads.some((u) => !u.error);
  const optionLabel = f.line === "fabric" ? "Colour" : "Colour (optional)";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      noValidate
    >
      <PageHeader title={id ? f.title || "Product" : "Add product"} sub={id ? `${LINE_LABELS[f.line]} · ${f.status === "live" ? "in the shop" : f.status}` : "Photos, name, price and stock. The rest can wait."} />

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="grid gap-4 lg:col-span-8">
          <Panel title="Photos" meta={f.photos.length ? `${f.photos.length} · first one is the cover` : "4:5, at least 2000 px, off-white backdrop"}>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {f.photos.map((p, i) => (
                <li key={p.key} className="min-w-0">
                  <div className="relative">
                    <Thumb image={{ ...p, alt: p.alt || "photo" }} size={160} className="!h-auto aspect-[4/5] !w-full" />
                    <div className="absolute inset-x-1 bottom-1 flex justify-between">
                      <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => movePhoto(i, -1)} className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface/95 disabled:opacity-0">
                        <ChevronLeftIcon size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setF((x) => ({ ...x, photos: x.photos.filter((_, j) => j !== i) }))}
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface/95"
                      >
                        <CloseIcon size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move later"
                        disabled={i === f.photos.length - 1}
                        onClick={() => movePhoto(i, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-surface/95 disabled:opacity-0"
                      >
                        <ChevronRightIcon size={16} />
                      </button>
                    </div>
                  </div>
                  <input
                    aria-label={`Description of photo ${i + 1}`}
                    value={p.alt}
                    onChange={(e) => setF((x) => ({ ...x, photos: x.photos.map((y, j) => (j === i ? { ...y, alt: e.target.value } : y)) }))}
                    className={cx("field mt-2 h-8 px-2 text-xs", problems[`alt-${i}`] && "border-neg")}
                  />
                </li>
              ))}
              {uploads.map((u) => (
                <li key={u.id} className="flex aspect-[4/5] flex-col justify-end rounded-[6px] border border-dashed border-control bg-raised p-2 text-xs">
                  {u.error ? (
                    <>
                      <span className="text-neg">{u.error}</span>
                      <button type="button" className="mt-1 text-left font-medium underline" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-muted">{u.progress.stage === "uploading" ? "Uploading" : u.progress.stage === "resizing" ? "Resizing" : "Opening"}</span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-control">
                        <span className="block h-full bg-text transition-[width]" style={{ width: `${Math.round(u.progress.share * 100)}%` }} />
                      </span>
                    </>
                  )}
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-control text-sm font-medium hover:border-text"
                >
                  <ImagePlusIcon size={22} />
                  Add photos
                </button>
                <input ref={fileInput} type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif" multiple hidden onChange={(e) => (onPick(e.target.files), (e.target.value = ""))} />
              </li>
            </ul>
          </Panel>

          <Panel title="Details">
            <div className="grid gap-4">
              <Field label="Name" error={problems.title}>
                <input
                  className={cx("field", problems.title && "border-neg")}
                  value={f.title}
                  onChange={(e) => setF((x) => ({ ...x, title: e.target.value, ...(x.slugTouched ? {} : { slug: slugify(e.target.value) }) }))}
                  autoComplete="off"
                />
              </Field>
              <div>
                <span className="label">Line</span>
                <Segmented
                  label="Line"
                  value={f.line}
                  options={LINES.map((l) => ({ id: l, label: LINE_LABELS[l] }))}
                  onChange={(line) => setF((x) => ({ ...x, line, options: x.options.map((o) => (o.price || o.stock ? o : { ...o, unit: defaultUnit(line) })) }))}
                />
              </div>
              <Field label="Description" hint="Shown on the product page. Leave empty until it's written.">
                <textarea className="field" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel title="Options, price and stock" meta={f.line === "fabric" ? "One row per colour" : "One row per size or colour"} flush>
            <ul>
              {f.options.map((o, i) => (
                <li key={o.key} className="grid grid-cols-2 gap-3 border-t border-rule px-5 py-4 first:border-t-0 sm:grid-cols-3 sm:items-start">
                  <Field label={optionLabel} className="col-span-2 sm:col-span-1">
                    <input className="field" value={o.colour} onChange={(e) => setOption(i, { colour: e.target.value })} />
                  </Field>
                  <Field label="Size">
                    <input className="field" value={o.size} onChange={(e) => setOption(i, { size: e.target.value })} />
                  </Field>
                  <Field label="Sold by">
                    <select className="field" value={o.unit} onChange={(e) => setOption(i, { unit: e.target.value as Unit })}>
                      <option value="yard">Yard</option>
                      <option value="bundle">Bundle</option>
                      <option value="piece">Piece</option>
                    </select>
                  </Field>
                  <Field label={`Price per ${o.unit} (₦)`} error={problems[`price-${i}`]}>
                    <input className={cx("field num", problems[`price-${i}`] && "border-neg")} inputMode="decimal" value={o.price} onChange={(e) => setOption(i, { price: e.target.value })} />
                  </Field>
                  <Field label="In stock" error={problems[`stock-${i}`]} hint={o.held ? `${o.held} held now` : undefined}>
                    <input className={cx("field num", problems[`stock-${i}`] && "border-neg")} inputMode="numeric" value={o.stock} onChange={(e) => setOption(i, { stock: e.target.value })} />
                  </Field>
                  <Field label="Low at" error={problems[`low-${i}`]}>
                    <input className={cx("field num", problems[`low-${i}`] && "border-neg")} inputMode="numeric" value={o.lowStockAt} onChange={(e) => setOption(i, { lowStockAt: e.target.value })} />
                  </Field>
                  <div className="col-span-2 -mt-1 flex justify-end sm:col-span-3">
                    <Button
                      tone="text"
                      disabled={f.options.length === 1 || o.held > 0}
                      title={o.held > 0 ? "Shoppers are paying for this right now" : undefined}
                      onClick={() => setF((x) => ({ ...x, options: x.options.filter((_, j) => j !== i) }))}
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <TrashIcon size={16} /> Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-rule px-5 py-3">
              <Button tone="text" onClick={addOption}>
                <PlusIcon size={16} /> Add another {f.line === "fabric" ? "colour" : "option"}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:sticky lg:top-6 lg:col-span-4">
          <Panel title="In the shop">
            <Segmented
              label="Status"
              value={f.status}
              options={[
                { id: "live", label: "Live" },
                { id: "draft", label: "Draft" },
                { id: "archived", label: "Archived" },
              ]}
              onChange={(s) => set("status", s)}
            />
            <p className="hint mt-2">{f.status === "live" ? "Shoppers can see and buy it." : f.status === "draft" ? "Hidden until you set it live." : "Hidden, kept for old orders."}</p>
            <Field label="Web address" hint={`/p/${f.slug || slugify(f.title || "product")}`} className="mt-4">
              <input className="field" value={f.slug} onChange={(e) => setF((x) => ({ ...x, slug: slugify(e.target.value), slugTouched: true }))} placeholder={slugify(f.title || "product")} />
            </Field>
          </Panel>
          {f.line === "fabric" ? (
            <Panel title="Fabric details" meta="Optional">
              <div className="grid gap-4">
                <Field label="Fibre">
                  <input className="field" value={f.fibre} onChange={(e) => set("fibre", e.target.value)} />
                </Field>
                <Field label="Width">
                  <input className="field" value={f.width} onChange={(e) => set("width", e.target.value)} />
                </Field>
                <Field label="Care">
                  <textarea className="field" rows={2} value={f.care} onChange={(e) => set("care", e.target.value)} />
                </Field>
              </div>
            </Panel>
          ) : (
            <Panel title="Care" meta="Optional">
              <textarea aria-label="Care" className="field" rows={3} value={f.care} onChange={(e) => set("care", e.target.value)} />
            </Panel>
          )}
        </div>
      </div>

      {/* Save bar: above the phone's bottom nav, in the page flow on desktop. */}
      <div className="sticky bottom-[calc(65px+env(safe-area-inset-bottom))] z-20 md:bottom-0 -mx-4 mt-6 border-t border-line bg-ground/95 px-4 py-3 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0">
        {serverError ? <p role="alert" className="mb-2 text-sm text-neg">{serverError}</p> : null}
        {Object.keys(problems).length ? <p role="alert" className="mb-2 text-sm text-neg">Check the fields marked in red.</p> : null}
        <div className="flex items-center justify-end gap-3">
          {busyUploading ? <span className="text-sm text-muted">Waiting for photos…</span> : null}
          <Button type="submit" tone="primary" size="lg" disabled={saving || busyUploading} className="min-w-[140px] flex-1 sm:flex-none">
            {saving ? "Saving…" : id ? "Save changes" : f.status === "live" ? "Save and publish" : "Save draft"}
          </Button>
        </div>
      </div>
    </form>
  );
}
