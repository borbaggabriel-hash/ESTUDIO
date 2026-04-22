import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeroSearchProps {
  query: string;
  onSearch: (query: string) => void;
}

export function HeroSearch({ query, onSearch }: HeroSearchProps) {
  return (
    <div className="relative max-w-2xl mx-auto w-full">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
        <Search className="h-5 w-5" />
      </div>
      <Input
        type="search"
        placeholder="What do you want to master today?"
        className="pl-12 h-14 text-lg rounded-full border border-border/70 bg-background shadow-lg focus-visible:ring-primary/30 transition-all hover:shadow-xl"
        value={query}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}
