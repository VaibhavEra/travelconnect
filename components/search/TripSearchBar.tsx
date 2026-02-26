// components/search/TripSearchBar.tsx
import CitySwapPair from "@/components/forms/CitySwapPair";
import { useSearchStore } from "@/stores/searchStore";

export default function TripSearchBar() {
  const { filters, setFilters } = useSearchStore();

  return (
    <CitySwapPair
      sourceValue={filters.source}
      destinationValue={filters.destination}
      onSourceChange={(city) => setFilters({ source: city })}
      onDestinationChange={(city) => setFilters({ destination: city })}
    />
  );
}
