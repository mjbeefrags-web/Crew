import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { SectionLabel } from "../components/SectionLabel";
import { useFeaturedProduct } from "../features/catalog/useFeaturedProduct";
import { useUiStore } from "../state/uiStore";
import { formatCurrency } from "../utils/formatCurrency";

export function FoundationPage() {
  const [selectedSize, setSelectedSize] = useState("M");
  const showNotice = useUiStore((state) => state.showNotice);
  const { data: product, isError, isPending, refetch } = useFeaturedProduct();

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> MOVEMENT, CONSIDERED / ISSUE 01
          </p>
          <h1 id="hero-title">
            A quieter
            <br />
            kind of <em>strong.</em>
          </h1>
          <div className="hero-meta">
            <p>
              Technical pieces for the days
              <br />
              that ask more of you.
            </p>
            <Button
              onClick={() =>
                document
                  .getElementById("collection")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              EXPLORE THE STUDY <span aria-hidden="true">↗</span>
            </Button>
          </div>
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Abstract sculptural study of movement in moss and stone"
        >
          <div className="art-sun" />
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sculpture">
            <div className="sculpture-fold fold-one" />
            <div className="sculpture-fold fold-two" />
            <div className="sculpture-fold fold-three" />
            <div className="sculpture-highlight" />
          </div>
          <span className="art-index">STUDY 01 — FORM / 04</span>
          <span className="art-caption">THE BODY IN ITS ELEMENT</span>
        </div>
        <div className="hero-bottom">
          <span>FIELD NOTE / IN MOTION</span>
          <span>
            SCROLL TO EXPLORE <span aria-hidden="true">↓</span>
          </span>
        </div>
      </section>

      <section className="collection-section" id="collection">
        <div className="section-heading">
          <SectionLabel index="01 / 04">THE OPEN-AIR STUDY</SectionLabel>
          <p className="section-intro">
            A considered uniform for
            <br />
            <em>unconsidered moments.</em>
          </p>
        </div>
        {isPending && (
          <p className="catalog-state" role="status" aria-busy="true">
            Loading the field study…
          </p>
        )}
        {isError && (
          <div className="catalog-state" role="alert">
            <p>The field study could not be loaded.</p>
            <Button variant="outline" onClick={() => void refetch()}>
              TRY AGAIN
            </Button>
          </div>
        )}
        {!isPending && !isError && !product && (
          <p className="catalog-state" role="status">
            No field study is available yet.
          </p>
        )}
        {product && (
          <div className="product-preview">
            <div className="product-image">
              <img
                src={product.imageUrl}
                alt="Original illustration of a moss-green technical shell jacket"
                loading="lazy"
              />
              <span className="product-stamp">
                FIELD
                <br />
                TESTED
              </span>
            </div>
            <div className="product-details">
              <div className="product-kicker">
                01 — LIGHT LAYER / NEW ARRIVAL
              </div>
              <h2>
                {product.name}
                <br />
                <em>for the in-between.</em>
              </h2>
              <p className="product-description">
                A light, weather-ready layer built for the long way round.
                Quietly technical. Ready for everywhere.
              </p>
              <div className="product-color">
                <span className="color-dot" /> {product.color}
              </div>
              <div
                className="size-picker"
                role="group"
                aria-label="Choose a size"
              >
                {product.sizes.map((size) => (
                  <button
                    type="button"
                    className={
                      selectedSize === size
                        ? "size-option is-selected"
                        : "size-option"
                    }
                    key={size}
                    aria-pressed={selectedSize === size}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <Button
                onClick={() =>
                  showNotice(
                    `${product.name} / ${selectedSize} added to your bag preview.`,
                  )
                }
              >
                ADD TO BAG — {formatCurrency(product.price, product.currency)}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="approach-section" id="approach">
        <SectionLabel index="02 / 04">
          A DIFFERENT KIND OF PERFORMANCE
        </SectionLabel>
        <div className="approach-content">
          <p className="approach-number">01—03</p>
          <h2>
            Built for effort.
            <br />
            <em>Made for living.</em>
          </h2>
          <p className="approach-note">
            We make thoughtful equipment for movement, with an eye on how it
            feels long after you leave the trail, studio or city block.
          </p>
          <Link to="/design-system" className="text-link">
            EXPLORE THE DESIGN SYSTEM <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="approach-aside" aria-hidden="true">
          <span className="aside-ring ring-a" />
          <span className="aside-ring ring-b" />
          <span className="aside-ring ring-c" />
          <span>FORM / FUNCTION / FEELING</span>
        </div>
      </section>

      <section className="foundation-note">
        <span className="note-marker">FOUNDATION / M1</span>
        <p>
          THE FIRST STUDY.
          <br />
          <em>THE SYSTEM BEHIND THE FEELING.</em>
        </p>
        <Link to="/design-system" aria-label="Open design system preview">
          ↗
        </Link>
      </section>
    </>
  );
}
