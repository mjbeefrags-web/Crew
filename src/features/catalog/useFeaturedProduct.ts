import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../../app/services';

export function useFeaturedProduct() {
  return useQuery({
    queryKey: ['catalog', 'featured-product'],
    queryFn: async () => {
      const products = await catalogService.listFeaturedProducts();
      return products[0] ?? null;
    },
    staleTime: 60_000,
  });
}
