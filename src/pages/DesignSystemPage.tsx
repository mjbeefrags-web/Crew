import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/Button";
import { SectionLabel } from "../components/SectionLabel";

const newsletterSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type NewsletterFields = z.infer<typeof newsletterSchema>;

export function DesignSystemPage() {
  const [submitted, setSubmitted] = useState(false);
  const [componentFeedback, setComponentFeedback] = useState("");
  const [formFeedback, setFormFeedback] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewsletterFields>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });
  const emailField = register("email");
  const submit = handleSubmit(() => {
    setFormFeedback(
      "Field state confirmed. Newsletter integration is planned for a later milestone.",
    );
    setSubmitted(true);
  });

  return (
    <div className="system-page">
      <section className="system-hero">
        <p className="eyebrow">CREWWW / DESIGN NOTES</p>
        <h1>
          The language
          <br />
          of <em>movement.</em>
        </h1>
        <p>A working foundation — material, type, color, interaction.</p>
      </section>
      <section className="system-section">
        <SectionLabel index="01 / 04">COLOR / NATURAL TENSION</SectionLabel>
        <div className="swatch-grid">
          {[
            ["Field paper", "#F2F1EB", "Background / 01"],
            ["Deep pine", "#263A32", "Brand / 01"],
            ["Graphite", "#151A17", "Ink / 01"],
            ["Lichen", "#C7D978", "Accent / 01"],
            ["Warm stone", "#D9D4C8", "Surface / 02"],
          ].map(([name, value, token]) => (
            <div className="swatch" key={name}>
              <span
                className="swatch-color"
                style={{ backgroundColor: value }}
              />
              <span className="swatch-name">{name}</span>
              <span className="swatch-token">
                {token} / {value}
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="system-section type-specimen">
        <SectionLabel index="02 / 04">
          TYPE / VOICE IN TWO REGISTERS
        </SectionLabel>
        <div className="type-row">
          <span className="specimen-meta">DISPLAY / INSTRUMENT SERIF</span>
          <p>
            Move with <em>intention.</em>
          </p>
        </div>
        <div className="type-row">
          <span className="specimen-meta">INTERFACE / DM SANS</span>
          <p className="sans-sample">Technical layers, made for longer days.</p>
        </div>
        <div className="type-row">
          <span className="specimen-meta">UTILITY / DM MONO</span>
          <p className="mono-sample">FIELD NOTE 01 — 37° 33&apos; N</p>
        </div>
      </section>
      <section className="system-section component-specimen">
        <SectionLabel index="03 / 04">COMPONENTS / QUIET UTILITY</SectionLabel>
        <div className="component-grid">
          <div className="component-card">
            <span className="specimen-meta">A / ACTIONS</span>
            <div className="button-stack">
              <Button
                onClick={() => setComponentFeedback("Primary action selected.")}
              >
                PRIMARY ACTION ↗
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setComponentFeedback("Secondary action selected.")
                }
              >
                SECONDARY ACTION
              </Button>
            </div>
          </div>
          <div className="component-card">
            <span className="specimen-meta">B / FIELD</span>
            <form className="sample-form" onSubmit={submit} noValidate>
              <label htmlFor="sample-email">EMAIL ADDRESS</label>
              <input
                id="sample-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
                {...emailField}
                onChange={(event) => {
                  void emailField.onChange(event);
                  setFormFeedback("");
                  setSubmitted(false);
                }}
              />
              <button type="submit">VALIDATE FIELD ↗</button>
              {errors.email && (
                <span className="form-feedback" role="alert">
                  {errors.email.message}
                </span>
              )}
              {formFeedback && (
                <span
                  className={
                    submitted ? "form-feedback is-success" : "form-feedback"
                  }
                  role="status"
                >
                  {formFeedback}
                </span>
              )}
            </form>
          </div>
          <div className="component-card product-card-sample">
            <span className="specimen-meta">C / PRODUCT SIGNAL</span>
            <div className="sample-product">
              <span className="sample-product-image" aria-hidden="true">
                AF
              </span>
              <div>
                <strong>Interval shell</strong>
                <span>Light layer / $180</span>
              </div>
              <button
                type="button"
                aria-label="Save Interval shell to wishlist"
                onClick={() =>
                  setComponentFeedback("Wishlist control preview selected.")
                }
              >
                ♡
              </button>
            </div>
          </div>
          <div className="component-card state-card">
            <span className="specimen-meta">D / SYSTEM STATES</span>
            <span className="state-line">
              <i className="status-dot" /> IN STOCK / READY TO MOVE
            </span>
            <span className="state-line state-muted">
              <i /> LOADING / FIELD NOTES
            </span>
            <span className="state-line state-error">
              <i /> ERROR / PLEASE TRY AGAIN
            </span>
          </div>
        </div>
        {componentFeedback && (
          <p className="component-feedback" role="status">
            {componentFeedback}
          </p>
        )}
      </section>
      <section className="system-motion-note">
        <SectionLabel index="04 / 04">
          MOTION / EARNED, NEVER DECORATIVE
        </SectionLabel>
        <p>
          Transitions stay direct and tactile. A reveal marks a change of state;
          movement guides attention. When motion is reduced, the system is still
          complete.
        </p>
        <span className="motion-swatch" aria-hidden="true">
          <i />
        </span>
      </section>
    </div>
  );
}
