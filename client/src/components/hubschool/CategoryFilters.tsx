import { Category } from "@/types/hubschool";
import { Button } from "@/components/ui/button";

interface CategoryFiltersProps {
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

const CATEGORIES: Category[] = ["Dublagem", "Locução", "Canção", "Narração"];

export function CategoryFilters({ selectedCategory, onSelectCategory }: CategoryFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        onClick={() => onSelectCategory(null)}
        className="rounded-full px-6"
      >
        All
      </Button>
      {CATEGORIES.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? "default" : "outline"}
          onClick={() => onSelectCategory(category)}
          className="rounded-full px-6"
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
