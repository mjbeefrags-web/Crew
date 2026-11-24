import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="route-fallback">
      <p className="eyebrow">FIELD NOTE / NOT FOUND</p>
      <h1>
        This path
        <br />
        <em>ends here.</em>
      </h1>
      <p>The page you are looking for is not part of this study.</p>
      <Link to="/" className="button button-solid">
        RETURN TO CREWWW <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
