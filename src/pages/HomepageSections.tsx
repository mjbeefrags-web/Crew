import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { catalogService, commerceService } from "../app/services";
import { ProductCard } from "../components/ProductCard";
import { API_MODE } from "../config/runtime";
import { FEATURES } from "../config/features";
import type { Product } from "../domain/product";

const RECENT_KEY = "crewww-recently-viewed";

const discovery = [
  {
    label: "DENIM / FIND YOUR FIT",
    route: "/denim",
    image: "/images/editorial/candidate-denim.webp",
    tone: "sand",
  },
  {
    label: "MINI CREW / KIDS",
    route: "/kids",
    image: "/images/editorial/kids-story.webp",
    tone: "clay",
  },
  {
    label: "OBJECTS / ACCESSORIES",
    route: "/accessories",
    image: "/images/editorial/accessories.webp",
    tone: "plum",
  },
  {
    label: "STEP OUT / SHOES",
    route: "/shoes",
    image: "/images/editorial/shoes.webp",
    tone: "amber",
  },
];

export function HomepageIntroSections() {
  const arrivals = useQuery({
    queryKey: ["home-arrivals"],
    queryFn: () => catalogService.listProducts({ newOnly: true, pageSize: 4 }),
  });
  const [recent, setRecent] = useState<Product[]>([]);
  useEffect(() => {
    if (!FEATURES.recentlyViewed) return;
    try {
      const ids = JSON.parse(
        window.localStorage.getItem(RECENT_KEY) ?? "[]",
      ) as string[];
      if (!ids.length) return;
      catalogService
        .listProducts({ pageSize: 24 })
        .then((page) => {
          const byId = new Map(page.items.map((p) => [p.id, p]));
          setRecent(ids.map((id) => byId.get(id)).filter(Boolean) as Product[]);
        })
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <>
      {FEATURES.recentlyViewed && recent.length > 0 && (
        <section
          className="home-arrivals recently-viewed-home"
          data-reveal
          aria-labelledby="recently-viewed-title"
        >
          <div className="home-section-heading">
            <div>
              <p className="store-eyebrow">CONTINUE / WHERE YOU LEFT OFF</p>
              <h2 id="recently-viewed-title">
                Recently <em>viewed.</em>
              </h2>
            </div>
            <Link to="/shop" className="text-link">
              BACK TO THE EDIT ↗
            </Link>
          </div>
          <div className="store-product-grid home-product-rail">
            {recent.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
      <section
        className="home-arrivals"
        data-reveal
        aria-labelledby="home-arrivals-title"
      >
        <div className="home-section-heading">
          <div>
            <p className="store-eyebrow">JUST LANDED / THE LATEST</p>
            <h2 id="home-arrivals-title">
              Fresh from
              <br />
              <em>the block.</em>
            </h2>
          </div>
          <Link to="/new-arrivals" className="text-link">
            SHOP NEW ARRIVALS ↗
          </Link>
        </div>
        {arrivals.data?.items.length ? (
          <div className="store-product-grid home-product-rail">
            {arrivals.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="home-loading">
            {arrivals.isError
              ? "THE NEW EDIT IS RESTING. VISIT THE FULL SHOP."
              : "THE NEW EDIT IS LOADING…"}
          </div>
        )}
      </section>
      <section
        className="home-category-discovery"
        data-reveal
        aria-label="Discover Crewww categories"
      >
        <div className="home-section-heading compact">
          <div>
            <p className="store-eyebrow">FOUR WAYS INTO THE WORLD</p>
            <h2>
              Find your <em>corner.</em>
            </h2>
          </div>
          <Link to="/shop" className="text-link">
            OPEN THE FULL EDIT ↗
          </Link>
        </div>
        <div className="home-category-grid">
          {discovery.map((item, index) => (
            <Link
              key={item.route}
              className={`home-category-tile category-tone-${item.tone}`}
              to={item.route}
              style={
                { "--category-image": `url("${item.image}")` } as CSSProperties
              }
            >
              <span>0{index + 1} / CREWWW</span>
              <h3>{item.label.split(" / ")[0]}</h3>
              <i>{item.label.split(" / ")[1]}</i>
              <b>EXPLORE ↗</b>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function HomepageStorySections() {
  const bestsellers = useQuery({
    queryKey: ["home-bestsellers"],
    queryFn: () =>
      catalogService.listProducts({
        bestSeller: true,
        pageSize: 4,
        sort: "popular",
      }),
  });
  return (
    <>
      <section className="home-feature home-denim-feature" data-reveal>
        <div className="home-feature-image">
          <img
            src="/images/editorial/denim-story.webp"
            alt="Denim styling study for the Crewww fit preview"
            loading="lazy"
          />
          <span>THE DENIM STUDY / FIT NOTES</span>
        </div>
        <div className="home-feature-copy">
          <p className="store-eyebrow">DENIM / FIVE CANDIDATE SHAPES</p>
          <h2>
            A fit for
            <br />
            <em>your own line.</em>
          </h2>
          <p>
            Compare straight, slim, relaxed, wide-leg and baggy shapes. Find the
            one that moves the way you do.
          </p>
          <Link className="text-link" to="/denim/fits">
            FIND YOUR DENIM FIT ↗
          </Link>
        </div>
      </section>
      <section className="home-feature home-kids-feature" data-reveal>
        <div className="home-feature-copy">
          <p className="store-eyebrow">A LITTLE ROOM / MINI CREW</p>
          <h2>
            For the ones
            <br />
            <em>in your orbit.</em>
          </h2>
          <p>
            Small shapes, same point of view. A first look at the younger side
            of the Crewww world.
          </p>
          <Link className="text-link" to="/kids">
            MEET MINI CREW ↗
          </Link>
        </div>
        <div className="home-feature-image">
          <img
            src="/images/editorial/candidate-kids2.webp"
            alt="Kidswear campaign study"
            loading="lazy"
          />
          <span>MINI CREW / FIRST LOOK</span>
        </div>
      </section>
      <section
        className="home-drop-feature"
        data-reveal
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(14,17,14,.91),rgba(14,17,14,.28)),url(/images/editorial/drop-story.webp)",
        }}
      >
        <div>
          <p className="store-eyebrow">DROP 01 / THE FIRST RUN</p>
          <h2>
            After hours,
            <br />
            <em>on your terms.</em>
          </h2>
          <p>
            The First Run collection world: graphic fleece, city notes and
            layers for staying out a little longer.
          </p>
          <Link className="text-link" to="/drops/first-run">
            EXPLORE THE FIRST RUN ↗
          </Link>
        </div>
        <span>THE FIRST RUN / CAMPAIGN NOTES</span>
      </section>
      <section className="home-bestsellers" data-reveal>
        <div className="home-section-heading">
          <div>
            <p className="store-eyebrow">THE EDIT / MOST LOVED</p>
            <h2>
              Most <em>loved.</em>
            </h2>
          </div>
          <Link className="text-link" to="/best-sellers">
            VIEW THE RANKING ↗
          </Link>
        </div>
        {bestsellers.data?.items.length ? (
          <div className="store-product-grid">
            {bestsellers.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="home-loading">LOADING THE PREVIEW RANKING…</div>
        )}
      </section>
      <section className="home-object-feature" data-reveal>
        <div className="home-object-copy">
          <p className="store-eyebrow">THE FINISHING PIECES / OBJECTS</p>
          <h2>
            Carry it.
            <br />
            <em>Step into it.</em>
          </h2>
          <p>
            Accessories and footwear extend the world beyond fleece. Explore the
            categories as the range takes shape.
          </p>
          <div>
            <Link className="text-link" to="/accessories">
              EXPLORE OBJECTS ↗
            </Link>
            <Link className="text-link" to="/shoes">
              SEE FOOTWEAR ↗
            </Link>
          </div>
        </div>
        <Link to="/accessories" className="home-object-image">
          <img
            src="/images/editorial/accessories.webp"
            alt="Crewww accessory campaign study"
            loading="lazy"
          />
          <span>OBJECTS / CAMPAIGN STUDY</span>
        </Link>
        <Link to="/shoes" className="home-object-image secondary">
          <img
            src="/images/editorial/shoes.webp"
            alt="Crewww footwear campaign study"
            loading="lazy"
          />
          <span>FOOTWEAR / CAMPAIGN STUDY</span>
        </Link>
      </section>
      <section className="home-lookbook" data-reveal>
        <div className="home-section-heading">
          <div>
            <p className="store-eyebrow">CREWWW / PICTURE NOTES</p>
            <h2>
              Somewhere in
              <br />
              <em>the in-between.</em>
            </h2>
          </div>
          <Link className="text-link" to="/lookbook">
            OPEN THE LOOKBOOK ↗
          </Link>
        </div>
        <div className="home-lookbook-grid">
          {["lookbook-01.jpg", "lookbook-02.jpg", "lookbook-03.jpg"].map(
            (image, index) => (
              <Link key={image} to={`/lookbook/notes-${index + 1}`}>
                <img
                  src={`/images/editorial/${image}`}
                  alt={`Crewww lookbook preview ${index + 1}`}
                  loading="lazy"
                />
                <span>LOOK 0{index + 1} / OPEN STORY ↗</span>
              </Link>
            ),
          )}
        </div>
      </section>
      <section className="home-brand-story" data-reveal>
        <div>
          <p className="store-eyebrow">WHO WE ARE / CREWWW</p>
          <h2>
            Find your people.
            <br />
            <em>Keep your own style.</em>
          </h2>
        </div>
        <div>
          <p>
            Crewww is a place for graphic layers, everyday shape and finding
            your own frequency. One block, five worlds, and room to make it
            yours.
          </p>
          <Link className="text-link" to="/about">
            READ OUR STORY ↗
          </Link>
        </div>
        <span className="brand-story-mark" aria-hidden="true">
          C
        </span>
      </section>
      <section className="home-stores" data-reveal>
        <div>
          <p className="store-eyebrow">OFF SCREEN / FIND A PLACE</p>
          <h2>
            Meet us <em>out there.</em>
          </h2>
          <p>
            Store details are being confirmed. Explore the locator preview or
            send us a place you want to see Crewww.
          </p>
          <Link className="text-link" to="/find-stores">
            OPEN STORE DISCOVERY ↗
          </Link>
        </div>
        <div className="home-store-map" aria-hidden="true">
          <span>CREWWW</span>
          <i />
          <b>01 / FIND A PLACE</b>
        </div>
      </section>
      <details className="prototype-notes">
        <summary>PROTOTYPE NOTES</summary>
        <p>
          This storefront is a design preview. Prices, stock, rankings, category
          imagery and checkout are demonstration data unless connected to the
          local store API; no payment or email service is configured.
        </p>
        <p>
          Psychedelic Minds artwork, garment photography and alternate views
          come from the supplied concept material. Approved product photography
          is labelled separately from concept garment studies.
        </p>
      </details>
      <NewsletterSection />
    </>
  );
}

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await commerceService.submitNewsletter(email);
      setMessage(
        API_MODE
          ? "Your address was saved by the local store API. Email delivery is not configured."
          : "Saved in this browser preview. No email service is connected.",
      );
      setEmail("");
    } catch {
      setMessage("The list could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section id="newsletter" className="newsletter-section" data-reveal>
      <div>
        <p className="store-eyebrow">CREWWW / NOTES FROM THE BLOCK</p>
        <h2>
          When it moves,
          <br />
          <em>you’ll know.</em>
        </h2>
        <p>
          New pieces, picture notes and future drops. A quiet inbox, by design.
        </p>
      </div>
      <form onSubmit={submit} noValidate>
        <label htmlFor="newsletter-email">YOUR EMAIL</label>
        <div>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={message.startsWith("Enter")}
            aria-describedby="newsletter-message newsletter-disclaimer"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <button type="submit" disabled={busy}>
            {busy ? "SAVING…" : "JOIN THE LIST ↗"}
          </button>
        </div>
        <p id="newsletter-disclaimer" className="newsletter-disclaimer">
          {API_MODE
            ? "Development API: address saved locally; no email is sent."
            : "Development preview: address is stored locally in this browser only."}
        </p>
        {message && (
          <p
            id="newsletter-message"
            className="form-message"
            role={
              message.startsWith("Enter") || message.startsWith("The list")
                ? "alert"
                : "status"
            }
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
