import { useState } from "react";
import type { AdminProduct } from "../../domain/admin";
import { adminService } from "../../app/services";
import { formatMoneyMinor } from "../../utils/formatMoneyMinor";

type Props = {
  products: AdminProduct[];
  currency: string;
  onChanged: () => void;
};

const empty = {
  name: "",
  slug: "",
  category: "hoodies",
  collection: "CREWWW / THE EDIT",
  description: "",
  price: "",
  stock: "12",
};

export function ProductManager({ products, currency, onChanged }: Props) {
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<{ name: string; dataUrl: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const set = (key: keyof typeof empty, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const imageUrl = photo
        ? await adminService.uploadImage(photo.name, photo.dataUrl)
        : "";
      await adminService.createProduct({
        name: form.name,
        slug: form.slug || slugify(form.name),
        category: form.category,
        collection: form.collection,
        description: form.description,
        priceMinor: Math.round(Number(form.price) * 100),
        stockQuantity: Number(form.stock),
        imageUrl,
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [{ name: "Black", value: "#171719" }],
      });
      setForm(empty);
      setPhoto(null);
      setMessage(`${form.name} is live in the shop.`);
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not add the product.",
      );
    } finally {
      setBusy(false);
    }
  };

  const archive = async (product: AdminProduct) => {
    setBusy(true);
    try {
      await adminService.archiveProduct(product.id);
      setMessage(`${product.name} removed from sale.`);
      onChanged();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove the product.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-products" aria-label="Product control">
      <div className="admin-ai-heading">
        <div>
          <p className="store-eyebrow">CATALOGUE CONTROL / FULL ACCESS</p>
          <h2>Ship the next arrival yourself.</h2>
          <p className="admin-ai-intro">
            Add a piece with its story, price, stock and photo. Remove anything
            that should stop selling without losing its order history.
          </p>
        </div>
      </div>

      <div className="admin-product-layout">
        <form className="admin-product-form" onSubmit={submit}>
          <label>
            <span>NAME</span>
            <input
              required
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </label>
          <label>
            <span>SLUG / OPTIONAL</span>
            <input
              value={form.slug}
              onChange={(event) => set("slug", event.target.value)}
              placeholder="auto-from-name"
            />
          </label>
          <div className="admin-product-row">
            <label>
              <span>CATEGORY</span>
              <input
                required
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
              />
            </label>
            <label>
              <span>COLLECTION</span>
              <input
                required
                value={form.collection}
                onChange={(event) => set("collection", event.target.value)}
              />
            </label>
          </div>
          <label>
            <span>STORY</span>
            <textarea
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              rows={3}
            />
          </label>
          <div className="admin-product-row">
            <label>
              <span>PRICE</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => set("price", event.target.value)}
              />
            </label>
            <label>
              <span>STOCK PER VARIANT</span>
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => set("stock", event.target.value)}
              />
            </label>
          </div>
          <label>
            <span>PRODUCT PHOTO</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () =>
                  setPhoto({ name: file.name, dataUrl: String(reader.result) });
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {photo && (
            <img
              className="admin-product-preview"
              src={photo.dataUrl}
              alt="New arrival preview"
            />
          )}
          <button
            className="primary-store-button"
            type="submit"
            disabled={busy}
          >
            {busy ? "PUBLISHING…" : "ADD NEW ARRIVAL ↗"}
          </button>
          {message && (
            <p className="admin-product-message" role="status">
              {message}
            </p>
          )}
        </form>

        <div className="admin-product-list">
          {products.map((product) => (
            <article key={product.id} className="admin-product-item">
              <img src={product.imageUrl} alt="" loading="lazy" />
              <div>
                <span>{product.collection}</span>
                <strong>{product.name}</strong>
                <small>
                  {formatMoneyMinor(product.priceMinor, currency)} ·{" "}
                  {product.variants.reduce(
                    (sum, item) => sum + item.stockQuantity,
                    0,
                  )}{" "}
                  units
                </small>
              </div>
              <button
                type="button"
                onClick={() => void archive(product)}
                disabled={busy}
              >
                REMOVE
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
