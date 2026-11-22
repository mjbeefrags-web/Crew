import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { mockCatalogService } from '../services/mockCatalogService';

function renderApp(path: string) {
  window.localStorage.clear();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('foundation routes', () => {
  it('renders the Crewww hoodie showroom and discovery tools', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { name: /the block is yours/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /find your crew/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search pieces/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /explore crewww collections/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main-content');
  });

  it('filters products and opens a clearly labeled static inspection fallback', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.type(screen.getByRole('textbox', { name: /search pieces/i }), 'Cherry');
    expect(screen.getByText('Cherry Blossom Hoodie')).toBeInTheDocument();
    expect(screen.queryByText('Vivre La Vie Hoodie')).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: /search pieces/i }));
    await user.click(screen.getByRole('button', { name: /inspect joy of outdoors hoodie/i }));
    expect(screen.getByRole('dialog', { name: /joy of outdoors hoodie inspection studio/i })).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: /joy of outdoors hoodie 3d product viewer/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select Mocha' }));
    await user.click(screen.getByRole('button', { name: /^L$/ }));
    await user.click(screen.getByRole('button', { name: /add to bag/i }));
    await user.click(screen.getByRole('button', { name: /back to collection/i }));
    await user.click(screen.getByRole('button', { name: /^Shopping bag, 1 items$/i }));
    expect(screen.getByRole('dialog', { name: /shopping bag/i })).toHaveTextContent('Mocha / L / QTY 1');
    expect(window.localStorage.getItem('arcfield-bag')).toContain('product-03');
  });

  it('renders the design-system preview', () => {
    renderApp('/design-system');

    expect(screen.getByRole('heading', { name: /language/i })).toBeInTheDocument();
    expect(screen.getByText(/color \/ natural tension/i)).toBeInTheDocument();
  });

  it('shows a real not-found state for unmatched routes', () => {
    renderApp('/unplanned-route');
    expect(screen.getByRole('heading', { name: /this path/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to crewww/i })).toHaveAttribute('href', '/');
  });

  it('validates the preview form and confirms a valid address', async () => {
    const user = userEvent.setup();
    renderApp('/design-system');

    await user.type(screen.getByRole('textbox', { name: /email address/i }), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /validate field/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');

    const input = screen.getByRole('textbox', { name: /email address/i });
    await user.clear(input);
    await user.type(input, 'field@example.com');
    await user.click(screen.getByRole('button', { name: /validate field/i }));
    expect(await screen.findByText(/field state confirmed/i)).toBeInTheDocument();
  });

  it('provides the expanded typed mock catalog', async () => {
    await expect(mockCatalogService.listFeaturedProducts()).resolves.toHaveLength(8);
    await expect(mockCatalogService.getProduct('missing-product')).resolves.toBeNull();
  });
});
