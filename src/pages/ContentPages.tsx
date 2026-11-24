import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  catalogService,
  commerceService,
  contentService,
} from "../app/services";
import { API_MODE } from "../config/runtime";
import { ProductCard } from "../components/ProductCard";
import { fits } from "../data/mock/storefront";

export function DenimFitsPage({ detail = false }: { detail?: boolean }) {
  const { fitSlug = "" } = useParams();
  const selectedFit = detail
    ? fits.find((item) => item.slug === fitSlug)
    : null;
  const products = useQuery({
    queryKey: ["denim-fits", selectedFit?.title],
    queryFn: () =>
      catalogService.listProducts({
        category: "denim",
        fit: selectedFit?.title,
        pageSize: 12,
      }),
  });
  if (detail && !selectedFit)
    return (
      <div className="storefront-page route-fallback">
        <p className="store-eyebrow">CREWWW / FIT NOT FOUND</p>
        <h1>
          That shape
          <br />
          <em>is not here.</em>
        </h1>
        <Link className="text-link" to="/denim/fits">
          COMPARE ALL FITS ↗
        </Link>
      </div>
    );
  return (
    <div className="storefront-page denim-fits-page">
      <section className="simple-page-hero">
        <p className="store-eyebrow">DENIM / FIT NOTES / DEVELOPMENT DATA</p>
        <h1>
          {selectedFit ? (
            <>
              The {selectedFit.title.toLowerCase()} <em>fit.</em>
            </>
          ) : (
            <>
              Every fit has
              <br />
              <em>a feeling.</em>
            </>
          )}
        </h1>
        <p className="page-hero-copy">
          {selectedFit?.description ??
            "Compare five candidate silhouettes. Names, measurements and guidance are demonstration content, not approved garment specs."}
        </p>
      </section>
      {detail ? (
        <>
          <section className="fit-detail-visual">
            <img
              src={selectedFit!.image}
              alt={`${selectedFit!.title} candidate denim fit reference`}
            />
            <div>
              <p className="store-eyebrow">
                FIT 0{fits.findIndex((fit) => fit.slug === fitSlug) + 1} /
                CANDIDATE
              </p>
              <h2>{selectedFit!.title}</h2>
              <p>
                This visual is a campaign reference and does not guarantee a
                specific garment measurement. Final waist, rise, inseam and leg
                opening are not supplied.
              </p>
              <Link className="text-link" to="/denim">
                SHOP THE DENIM PREVIEW ↗
              </Link>
            </div>
          </section>
          <section className="fit-products">
            <div className="catalog-route-heading">
              <p className="store-eyebrow">MATCHING SAMPLE PIECES</p>
              <Link to="/denim/fits">COMPARE ANOTHER FIT ↗</Link>
            </div>
            {products.data?.items.length ? (
              <div className="store-product-grid">
                {products.data.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="catalog-empty">
                No product records currently use this candidate fit.
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="fit-comparison-grid">
          {fits.map((fit, index) => (
            <article
              key={fit.slug}
              style={{
                backgroundImage: `linear-gradient(0deg,rgba(14,17,14,.94),transparent 70%),url(${fit.image})`,
              }}
            >
              <span>0{index + 1} / DENIM STUDY</span>
              <h2>{fit.title}</h2>
              <p>{fit.description}</p>
              <Link to={`/denim/fits/${fit.slug}`}>OPEN FIT NOTE ↗</Link>
            </article>
          ))}
        </section>
      )}
      <p className="demo-data-note">
        Denim imagery is illustrative; fit descriptions and measurement
        information require product-owner approval.
      </p>
    </div>
  );
}

export function LookbookIndexPage({
  type = "lookbook",
}: {
  type?: "lookbook" | "drop";
}) {
  const storiesQuery = useQuery({
    queryKey: ["stories", type],
    queryFn: () => contentService.listStories(type),
  });
  const isDrop = type === "drop";
  return (
    <div className="storefront-page stories-index-page">
      <section
        className="story-index-hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(15,18,15,.9),rgba(15,18,15,.2)),url(${isDrop ? "/images/editorial/drop-story.jpg" : "/images/editorial/lookbook-03.jpg"})`,
        }}
      >
        <p className="store-eyebrow">
          CREWWW / {isDrop ? "THE DROP FILES" : "PICTURE NOTES"}
        </p>
        <h1>
          {isDrop ? (
            <>
              A story in
              <br />
              <em>the making.</em>
            </>
          ) : (
            <>
              See you
              <br />
              <em>out there.</em>
            </>
          )}
        </h1>
        <p>
          {isDrop
            ? "Campaign worlds and collection ideas, clearly marked as preview content."
            : "Lookbook studies, styling notes and shoppable campaign references."}
        </p>
      </section>
      <section className="story-card-grid">
        {storiesQuery.data?.map((story) => (
          <article key={story.slug} className="story-index-card">
            <Link
              to={isDrop ? `/drops/${story.slug}` : `/lookbook/${story.slug}`}
            >
              <img src={story.image} alt="" loading="lazy" />
              <span>{story.eyebrow} · PREVIEW</span>
              <h2>{story.title}</h2>
              <p>{story.description}</p>
              <b>OPEN THE STORY ↗</b>
            </Link>
          </article>
        ))}
      </section>
      <p className="demo-data-note">
        All current stories and imagery are campaign-development previews.
        Product and brand copy require owner review.
      </p>
    </div>
  );
}

export function EditorialDetailPage({
  type = "lookbook",
  shoppable = false,
}: {
  type?: "lookbook" | "drop";
  shoppable?: boolean;
}) {
  const { slug = "" } = useParams();
  const storyQuery = useQuery({
    queryKey: ["story", type, slug],
    queryFn: () => contentService.getStory(slug),
  });
  const productsQuery = useQuery({
    queryKey: ["story-products", slug],
    queryFn: () => catalogService.listProducts({ pageSize: 4 }),
    enabled: shoppable || type === "drop",
  });
  const story = storyQuery.data;
  if (storyQuery.isPending)
    return (
      <div className="catalog-skeleton" role="status">
        OPENING THE STORY…
      </div>
    );
  if (!story || story.type !== type)
    return (
      <div className="storefront-page route-fallback">
        <p className="store-eyebrow">CREWWW / STORY NOT FOUND</p>
        <h1>
          Not in
          <br />
          <em>this frame.</em>
        </h1>
        <Link
          className="text-link"
          to={type === "drop" ? "/drops" : "/lookbook"}
        >
          BACK TO STORIES ↗
        </Link>
      </div>
    );
  return (
    <article className="storefront-page editorial-detail-page">
      <section
        className="editorial-detail-hero"
        style={{
          backgroundImage: `linear-gradient(0deg,rgba(12,14,12,.85),rgba(12,14,12,.1) 65%),url(${story.image})`,
        }}
      >
        <p className="store-eyebrow">{story.eyebrow} / DEVELOPMENT STORY</p>
        <h1>{story.title}</h1>
        <p>{story.description}</p>
      </section>
      <section className="editorial-detail-body">
        <div>
          <p className="store-eyebrow">
            THE NOTE / {shoppable ? "SHOP THE LOOK" : "CREWWW STORY"}
          </p>
          <h2>
            Pieces move
            <br />
            <em>with the moment.</em>
          </h2>
        </div>
        <div>
          <p>
            This editorial page is an interactive layout preview. Image, story
            and product context can be replaced with approved campaign material
            before launch.
          </p>
          <p>
            We keep the shopping route visible: visit product details, review
            options and save a piece to your preview bag. Prices and
            availability are not live.
          </p>
        </div>
      </section>
      {(shoppable || type === "drop") && (
        <section className="editorial-products">
          <div className="catalog-route-heading">
            <p className="store-eyebrow">THE PIECES / SAMPLE LINKS</p>
            <Link to="/shop">OPEN THE FULL EDIT ↗</Link>
          </div>
          <div className="store-product-grid">
            {productsQuery.data?.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
      <Link
        className="text-link editorial-back-link"
        to={type === "drop" ? "/drops" : "/lookbook"}
      >
        BACK TO {type === "drop" ? "DROPS" : "LOOKBOOK"} ↗
      </Link>
    </article>
  );
}

export function AboutPage() {
  return (
    <div className="storefront-page about-page">
      <section
        className="about-hero"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(13,16,13,.86),rgba(13,16,13,.17)),url(/images/editorial/hero-campaign.jpg)",
        }}
      >
        <p className="store-eyebrow">CREWWW / WORKING STORY</p>
        <h1>
          Make your
          <br />
          <em>own frequency.</em>
        </h1>
        <p>
          A brand story draft, shaped around everyday dress, graphic layers and
          finding your people.
        </p>
      </section>
      <section className="about-story-copy">
        <p className="store-eyebrow">A NOTE FROM THE BLOCK / 01</p>
        <h2>
          Clothes for the
          <br />
          <em>way you move.</em>
        </h2>
        <div>
          <p>
            Crewww is a working fashion-world concept: pieces with character,
            useful layers and the confidence to style things your own way.
          </p>
          <p>
            This draft intentionally avoids unverified claims about the
            business, its history, production, sustainability, people or
            location. Those facts should come from the owner before publication.
          </p>
          <Link className="text-link" to="/lookbook">
            SEE THE PICTURE NOTES ↗
          </Link>
        </div>
      </section>
      <section className="about-values-grid">
        {[
          ["01 / MAKE ROOM", "Shape a wardrobe around your own pace."],
          ["02 / STAY CURIOUS", "Follow a color, an artwork or a new corner."],
          ["03 / FIND YOUR PEOPLE", "Make style a shared language."],
        ].map(([label, body]) => (
          <article key={label}>
            <p className="store-eyebrow">{label}</p>
            <p>{body}</p>
            <span>WORKING BRAND PILLAR / OWNER REVIEW</span>
          </article>
        ))}
      </section>
      <Link className="text-link about-shop-link" to="/shop">
        SHOP THE CURRENT PREVIEW ↗
      </Link>
    </div>
  );
}

export function StoreFinderPage({ detail = false }: { detail?: boolean }) {
  const { storeSlug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(params.get("q") ?? "");
  const storesQuery = useQuery({
    queryKey: ["store-previews", params.get("q")],
    queryFn: () => contentService.findStores(params.get("q") ?? ""),
  });
  const selectedQuery = useQuery({
    queryKey: ["store-preview", storeSlug],
    queryFn: () => contentService.getStore(storeSlug),
    enabled: detail,
  });
  if (detail) {
    const store = selectedQuery.data;
    return store ? (
      <div className="storefront-page store-detail-page">
        <section className="simple-page-hero">
          <p className="store-eyebrow">
            CREWWW / LOCATION PREVIEW / NOT A LIVE BRANCH
          </p>
          <h1>{store.name}</h1>
          <p className="page-hero-copy">
            This record is a navigation and detail-page placeholder. No
            confirmed address, hours or phone number were supplied.
          </p>
        </section>
        <section className="store-detail-grid">
          <div>
            <p className="store-eyebrow">AREA</p>
            <h2>{store.area}</h2>
            <p>{store.address}</p>
          </div>
          <div>
            <p className="store-eyebrow">OPENING HOURS</p>
            {store.hours.map((hour) => (
              <p key={hour}>{hour}</p>
            ))}
          </div>
          <div>
            <p className="store-eyebrow">CONTACT</p>
            <p>{store.phone}</p>
            <p>DIRECTIONS ARE NOT AVAILABLE FOR SAMPLE LOCATIONS.</p>
          </div>
        </section>
        <Link className="text-link" to="/find-stores">
          BACK TO STORE DISCOVERY ↗
        </Link>
      </div>
    ) : (
      <div className="catalog-skeleton" role="status">
        LOADING STORE PREVIEW…
      </div>
    );
  }
  return (
    <div className="storefront-page store-finder-page">
      <section className="store-finder-hero">
        <p className="store-eyebrow">CREWWW / OFF SCREEN</p>
        <h1>
          Find a place
          <br />
          <em>to meet.</em>
        </h1>
        <p>
          Search sample location cards. No live branches, hours, phone numbers
          or directions have been confirmed.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setParams(term.trim() ? { q: term.trim() } : {});
          }}
        >
          <label htmlFor="store-finder-search">AREA OR PLACE</label>
          <div>
            <input
              id="store-finder-search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Try “Sample district”"
            />
            <button type="submit">SEARCH ↗</button>
          </div>
        </form>
      </section>
      <section className="store-preview-list">
        <div className="catalog-route-heading">
          <p className="store-eyebrow">
            {storesQuery.data?.length ?? 0} PREVIEW LOCATIONS
          </p>
          <span>NOT VERIFIED STORE DATA</span>
        </div>
        {storesQuery.data?.length ? (
          storesQuery.data.map((store, index) => (
            <article key={store.slug}>
              <span>0{index + 1} / PREVIEW</span>
              <div>
                <h2>{store.name}</h2>
                <p>
                  {store.area} · {store.address}
                </p>
              </div>
              <Link to={`/find-stores/${store.slug}`}>OPEN DETAILS ↗</Link>
            </article>
          ))
        ) : (
          <div className="catalog-empty">
            <span>NO SAMPLE LOCATIONS MATCH</span>
            <p>Try a different area or clear your search.</p>
            <button
              type="button"
              onClick={() => {
                setTerm("");
                setParams({});
              }}
            >
              CLEAR SEARCH ↗
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function ContactPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setBusy(true);
    const data = new FormData(form);
    try {
      await commerceService.submitContact({
        name: String(data.get("name")),
        email: String(data.get("email")),
        topic: String(data.get("topic")),
        message: String(data.get("message")),
      });
      setMessage(
        API_MODE
          ? "Your message was stored by the local API. No team email was sent."
          : "Saved to this browser preview. The Crewww team was not contacted.",
      );
      form.reset();
    } catch {
      setMessage("The message could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="storefront-page contact-page">
      <section className="simple-page-hero">
        <p className="store-eyebrow">CREWWW / OPEN LINE</p>
        <h1>
          Say <em>hello.</em>
        </h1>
        <p className="page-hero-copy">
          Send a sample enquiry. It will be stored locally in this preview and
          will not reach a team inbox.
        </p>
      </section>
      <div className="contact-layout">
        <div>
          <p className="store-eyebrow">NEED A HAND?</p>
          <h2>
            We're listening
            <br />
            <em>in preview mode.</em>
          </h2>
          <Link to="/support" className="text-link">
            OPEN CUSTOMER SUPPORT ↗
          </Link>
        </div>
        <form onSubmit={submit}>
          <label>
            YOUR NAME
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            EMAIL
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            WHAT'S THIS ABOUT?
            <select name="topic" defaultValue="general">
              <option value="general">General enquiry</option>
              <option value="product">Product question</option>
              <option value="stores">Store discovery</option>
              <option value="press">Press / collaboration</option>
            </select>
          </label>
          <label>
            MESSAGE
            <textarea
              name="message"
              minLength={10}
              maxLength={1200}
              rows={5}
              required
            />
          </label>
          <button className="primary-store-button" disabled={busy}>
            {busy ? "SAVING PREVIEW…" : "SEND PREVIEW ENQUIRY ↗"}
          </button>
          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
          <small>Local-only form prototype · no email delivery.</small>
        </form>
      </div>
    </div>
  );
}

const helpTopics = [
  [
    "Products and fit",
    "Product names, sizes, fit notes and materials in this preview are sample data. Confirm every detail against the final product.",
  ],
  [
    "Orders and payment",
    "Checkout creates a local demonstration receipt only. No payment is captured and no inventory is reserved.",
  ],
  [
    "Shipping",
    "Regions, costs and delivery estimates are placeholders that need owner and carrier confirmation.",
  ],
  [
    "Returns",
    "Return and exchange terms must be supplied and approved before a live store opens.",
  ],
  [
    "Stores",
    "The locator currently contains sample cards, not verified branches or directions.",
  ],
];

export function SupportPage() {
  return (
    <div className="storefront-page support-page">
      <section className="simple-page-hero">
        <p className="store-eyebrow">CREWWW / HELP DESK PREVIEW</p>
        <h1>
          Here when
          <br />
          <em>you need us.</em>
        </h1>
        <p className="page-hero-copy">
          Helpful routes are here; policy and contact details remain provisional
          until confirmed.
        </p>
      </section>
      <div className="support-links-grid">
        {[
          ["FAQ", "/faq"],
          ["Shipping", "/shipping"],
          ["Returns", "/returns"],
          ["Contact", "/contact"],
          ["Find stores", "/find-stores"],
        ].map(([title, path]) => (
          <Link key={path} to={path}>
            <span>HELP / CREWWW</span>
            <strong>{title}</strong>
            <i>↗</i>
          </Link>
        ))}
      </div>
      <p className="demo-data-note">
        Customer service is not connected to a live inbox.
      </p>
    </div>
  );
}

export function FAQPage() {
  const [open, setOpen] = useState("Products and fit");
  return (
    <div className="storefront-page faq-page">
      <section className="simple-page-hero">
        <p className="store-eyebrow">CREWWW / ANSWERS</p>
        <h1>
          The <em>FAQ.</em>
        </h1>
        <p className="page-hero-copy">
          Answers in this experience are preview copy and need business review.
        </p>
      </section>
      <section className="faq-list">
        {helpTopics.map(([topic, body]) => (
          <article key={topic}>
            <button
              type="button"
              aria-expanded={open === topic}
              onClick={() => setOpen(open === topic ? "" : topic)}
            >
              {topic}
              <span>{open === topic ? "−" : "+"}</span>
            </button>
            {open === topic && <p>{body}</p>}
          </article>
        ))}
      </section>
      <Link className="text-link" to="/contact">
        STILL NEED HELP? CONTACT PREVIEW ↗
      </Link>
    </div>
  );
}

export function PolicyPage({
  kind,
}: {
  kind: "shipping" | "returns" | "privacy" | "terms";
}) {
  const content = {
    shipping: [
      "Shipping notes",
      "Delivery regions, timing and charges will be added after market, carrier and fulfillment details are confirmed. The values shown in checkout are sample estimates only.",
    ],
    returns: [
      "Returns & exchanges",
      "Eligibility windows, item condition, shipping responsibility and refund timing need owner and legal review. No live returns workflow is connected.",
    ],
    privacy: [
      "Privacy, in draft",
      "This frontend preview stores demo bag, saved pieces, sample form submissions and simulated account data in local browser storage. No production analytics or backend account service is part of M3.",
    ],
    terms: [
      "Terms, in draft",
      "This page is a placeholder for owner and legal counsel review. Sample prices, products, checkout, account and store information are not offers or services.",
    ],
  }[kind];
  return (
    <article className="storefront-page policy-page">
      <section className="simple-page-hero">
        <p className="store-eyebrow">
          CREWWW / {kind.toUpperCase()} / PREVIEW DRAFT
        </p>
        <h1>{content[0]}</h1>
        <p className="page-hero-copy">
          The approved live policy has not been supplied.
        </p>
      </section>
      <section className="policy-body">
        <p>{content[1]}</p>
        <p>
          Do not use this demonstration content as final customer policy. Add
          verified business details, jurisdiction, contact route and effective
          date before launch.
        </p>
        <Link to="/contact" className="text-link">
          ASK A PREVIEW QUESTION ↗
        </Link>
      </section>
    </article>
  );
}
