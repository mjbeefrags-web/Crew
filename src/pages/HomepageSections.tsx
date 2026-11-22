import { useState, type CSSProperties, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { catalogService, commerceService } from '../app/services';
import { ProductCard } from '../components/ProductCard';

const discovery = [
  { label: 'DENIM / FIND YOUR FIT', route: '/denim', image: '/images/editorial/candidate-denim.jpg', tone: 'sand' },
  { label: 'MINI CREW / KIDS', route: '/kids', image: '/images/editorial/kids-story.jpg', tone: 'clay' },
  { label: 'OBJECTS / ACCESSORIES', route: '/accessories', image: '/images/editorial/accessories.jpg', tone: 'plum' },
  { label: 'STEP OUT / SHOES', route: '/shoes', image: '/images/editorial/shoes.jpg', tone: 'amber' },
];

export function HomepageIntroSections() {
  const arrivals = useQuery({ queryKey: ['home-arrivals'], queryFn: () => catalogService.listProducts({ newOnly: true, pageSize: 4 }) });
  return <>
    <section className="home-arrivals" aria-labelledby="home-arrivals-title">
      <div className="home-section-heading"><div><p className="store-eyebrow">JUST LANDED / THE LATEST</p><h2 id="home-arrivals-title">Fresh from<br /><em>the block.</em></h2></div><Link to="/new-arrivals" className="text-link">SHOP NEW ARRIVALS ↗</Link></div>
      {arrivals.data?.items.length ? <div className="store-product-grid home-product-rail">{arrivals.data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="home-loading">{arrivals.isError ? 'THE NEW EDIT IS RESTING. VISIT THE FULL SHOP.' : 'THE NEW EDIT IS LOADING…'}</div>}
    </section>
    <section className="home-category-discovery" aria-label="Discover Crewww categories">
      <div className="home-section-heading compact"><div><p className="store-eyebrow">FOUR WAYS INTO THE WORLD</p><h2>Find your <em>corner.</em></h2></div><Link to="/shop" className="text-link">OPEN THE FULL EDIT ↗</Link></div>
      <div className="home-category-grid">{discovery.map((item, index) => <Link key={item.route} className={`home-category-tile category-tone-${item.tone}`} to={item.route} style={{ '--category-image': `url("${item.image}")` } as CSSProperties}><span>0{index + 1} / CREWWW</span><h3>{item.label.split(' / ')[0]}</h3><i>{item.label.split(' / ')[1]}</i><b>EXPLORE ↗</b></Link>)}</div>
      <p className="demo-data-note">Category imagery outside the supplied hoodie collection is campaign reference material. Sample products and assortment are not approved live inventory.</p>
    </section>
  </>;
}

export function HomepageStorySections() {
  const bestsellers = useQuery({ queryKey: ['home-bestsellers'], queryFn: () => catalogService.listProducts({ bestSeller: true, pageSize: 4, sort: 'popular' }) });
  return <>
    <section className="home-feature home-denim-feature"><div className="home-feature-image"><img src="/images/editorial/denim-story.jpg" alt="Denim styling study for the Crewww fit preview" loading="lazy"/><span>THE DENIM STUDY / SAMPLE VISUAL</span></div><div className="home-feature-copy"><p className="store-eyebrow">DENIM / FIVE CANDIDATE SHAPES</p><h2>A fit for<br /><em>your own line.</em></h2><p>Compare straight, slim, relaxed, wide-leg and baggy fit ideas. All fit language and measurements are provisional samples.</p><Link className="text-link" to="/denim/fits">FIND YOUR DENIM FIT ↗</Link></div></section>
    <section className="home-feature home-kids-feature"><div className="home-feature-copy"><p className="store-eyebrow">A LITTLE ROOM / KIDS PREVIEW</p><h2>For the ones<br /><em>in your orbit.</em></h2><p>A separate kidswear pathway, with sample age and size filters. The displayed assortment is development content.</p><Link className="text-link" to="/kids">MEET MINI CREW ↗</Link></div><div className="home-feature-image"><img src="/images/editorial/candidate-kids2.jpg" alt="Kidswear category visual study" loading="lazy"/><span>CAMPAIGN REFERENCE / NOT PRODUCT ART</span></div></section>
    <section className="home-drop-feature" style={{ backgroundImage: 'linear-gradient(90deg,rgba(14,17,14,.91),rgba(14,17,14,.28)),url(/images/editorial/drop-story.jpg)' }}><div><p className="store-eyebrow">DROP 01 / DEVELOPMENT CAMPAIGN</p><h2>After hours,<br /><em>on your terms.</em></h2><p>The First Run collection world: graphic fleece, city notes and layers for staying out a little longer.</p><Link className="text-link" to="/drops/first-run">EXPLORE THE FIRST RUN ↗</Link></div><span>CAMPAIGN CONCEPT / SAMPLE CONTENT</span></section>
    <section className="home-bestsellers"><div className="home-section-heading"><div><p className="store-eyebrow">A SAMPLE RANKING / BEST SELLERS</p><h2>Most <em>loved.</em></h2></div><Link className="text-link" to="/best-sellers">VIEW THE RANKING ↗</Link></div>{bestsellers.data?.items.length ? <div className="store-product-grid">{bestsellers.data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="home-loading">LOADING THE PREVIEW RANKING…</div>}<p className="demo-data-note">Popularity order is a deterministic development fixture, not sales data.</p></section>
    <section className="home-object-feature"><div className="home-object-copy"><p className="store-eyebrow">THE FINISHING PIECES / SAMPLE RANGE</p><h2>Carry it.<br /><em>Step into it.</em></h2><p>Accessory and footwear pages are ready for confirmed Crewww products. The current records and visual references are placeholders for the frontend review.</p><div><Link className="text-link" to="/accessories">EXPLORE OBJECTS ↗</Link><Link className="text-link" to="/shoes">SEE FOOTWEAR ↗</Link></div></div><Link to="/accessories" className="home-object-image"><img src="/images/editorial/accessories.jpg" alt="Accessory campaign reference image, sample visual only" loading="lazy"/><span>VISUAL REFERENCE / SAMPLE ONLY</span></Link><Link to="/shoes" className="home-object-image secondary"><img src="/images/editorial/shoes.jpg" alt="Footwear campaign reference image, sample visual only" loading="lazy"/><span>VISUAL REFERENCE / SAMPLE ONLY</span></Link></section>
    <section className="home-lookbook"><div className="home-section-heading"><div><p className="store-eyebrow">CREWWW / PICTURE NOTES</p><h2>Somewhere in<br /><em>the in-between.</em></h2></div><Link className="text-link" to="/lookbook">OPEN THE LOOKBOOK ↗</Link></div><div className="home-lookbook-grid">{['lookbook-01.jpg', 'lookbook-02.jpg', 'lookbook-03.jpg'].map((image, index) => <Link key={image} to={`/lookbook/notes-${index + 1}`}><img src={`/images/editorial/${image}`} alt={`Crewww lookbook preview ${index + 1}`} loading="lazy"/><span>LOOK 0{index + 1} / OPEN STORY ↗</span></Link>)}</div></section>
    <section className="home-brand-story"><div><p className="store-eyebrow">WHO WE ARE / WORKING STORY</p><h2>Find your people.<br /><em>Keep your own style.</em></h2></div><div><p>Crewww is a place for graphic layers, everyday shape and finding your own frequency. This working story is a creative direction for review, not approved company history or a claim about production.</p><Link className="text-link" to="/about">READ OUR STORY ↗</Link></div><span className="brand-story-mark" aria-hidden="true">C</span></section>
    <section className="home-stores"><div><p className="store-eyebrow">OFF SCREEN / FIND A PLACE</p><h2>Meet us <em>out there.</em></h2><p>Store locations and operating details are not confirmed yet. Browse the locator preview or send a place enquiry.</p><Link className="text-link" to="/find-stores">OPEN STORE DISCOVERY ↗</Link></div><div className="home-store-map" aria-hidden="true"><span>CREWWW</span><i/><b>01 / LOCATION DATA PENDING</b></div></section>
    <NewsletterSection />
  </>;
}

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMessage('Enter a valid email address.'); return; }
    setBusy(true);
    await commerceService.submitNewsletter(email);
    setBusy(false);
    setMessage('Saved in this browser preview. No email service is connected.');
    setEmail('');
  };
  return <section id="newsletter" className="newsletter-section"><div><p className="store-eyebrow">CREWWW / NOTES FROM THE BLOCK</p><h2>When it moves,<br /><em>you’ll know.</em></h2><p>New pieces, picture notes and future drops. A quiet inbox, by design.</p></div><form onSubmit={submit} noValidate><label htmlFor="newsletter-email">YOUR EMAIL</label><div><input id="newsletter-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/><button type="submit" disabled={busy}>{busy ? 'SAVING…' : 'JOIN THE LIST ↗'}</button></div><p className="newsletter-disclaimer">Development preview: address is stored locally in this browser only.</p>{message && <p className="form-message" role={message.startsWith('Enter') ? 'alert' : 'status'}>{message}</p>}</form></section>;
}
