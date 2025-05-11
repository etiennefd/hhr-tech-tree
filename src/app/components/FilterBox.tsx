import React, { useState, useRef, useEffect } from "react";
import { Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FilterState } from "@/types/filters";

interface FilterBoxProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableFilters: {
    fields: string[];
    countries: string[];
    cities: string[];
  };
}

interface FilterSuggestion {
  type: keyof FilterState;
  value: string;
}

export const FilterBox: React.FC<FilterBoxProps> = ({
  filters,
  onFilterChange,
  availableFilters,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get suggestions based on query
  const getSuggestions = (searchQuery: string): FilterSuggestion[] => {
    if (!searchQuery.trim()) return [];

    const suggestions: FilterSuggestion[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    // Helper to add matching items
    const addMatches = (type: keyof FilterState, items: string[]) => {
      items
        .filter(
          (item) =>
            item.toLowerCase().includes(lowerQuery) && !filters[type].has(item)
        )
        .forEach((item) => suggestions.push({ type, value: item }));
    };

    // Add matches from each category
    addMatches("fields", availableFilters.fields);
    addMatches("countries", availableFilters.countries);
    addMatches("cities", availableFilters.cities);

    return suggestions;
  };

  const suggestions = getSuggestions(query);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          const suggestion = suggestions[selectedIndex];
          addFilter(suggestion.type, suggestion.value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Add filter
  const addFilter = (type: keyof FilterState, value: string) => {
    const newFilters = { ...filters };
    newFilters[type] = new Set(filters[type]).add(value);
    onFilterChange(newFilters);
    setQuery("");
    setIsOpen(false);
  };

  // Remove filter
  const removeFilter = (type: keyof FilterState, value: string) => {
    const newFilters = { ...filters };
    const set = new Set(filters[type]);
    set.delete(value);
    newFilters[type] = set;
    onFilterChange(newFilters);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Effect to handle wheel and touchmove events on input for preventing page scroll
  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;

    const handleInputWheel = (e: WheelEvent) => {
      console.log('[FilterBox Input Wheel - Manual Listener] Event detected, preventing page default.', e.deltaY);
      e.preventDefault();
    };

    const handleInputTouchMove = (e: TouchEvent) => {
      console.log('[FilterBox Input TouchMove - Manual Listener] Event detected, preventing page default.');
      e.preventDefault();
    };

    inputElement.addEventListener('wheel', handleInputWheel, { passive: false });
    inputElement.addEventListener('touchmove', handleInputTouchMove, { passive: false });

    return () => {
      inputElement.removeEventListener('wheel', handleInputWheel);
      inputElement.removeEventListener('touchmove', handleInputTouchMove);
    };
  }, []);

  // Get type label
  const getTypeLabel = (type: keyof FilterState): string => {
    switch (type) {
      case "fields":
        return "Field";
      case "countries":
        return "Country";
      case "cities":
        return "City";
      default:
        return "Filter";
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setTimeout(() => {
        const input = containerRef.current?.querySelector("input");
        input?.focus();
      }, 100);
    }
  };

  // Count total active filters
  const activeFilterCount = Object.values(filters).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Collapsed state */}
      {!isExpanded && (
        <button
          onClick={toggleExpand}
          className="md:hidden flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur border border-black rounded-none shadow-md"
        >
          <Filter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#91B4C5] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* Expanded state */}
      <div className={`${!isExpanded ? 'hidden md:block' : 'block'} w-72`}>
        <div className="relative">
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder="Filter by field/location"
            className="pl-8 pr-4 w-full border-black rounded-none font-mono"
          />
          {/* Add close button on mobile */}
          {isExpanded && (
            <button
              onClick={toggleExpand}
              className="md:hidden absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Active Filters */}
        {Object.entries(filters).map(([type, set]: [string, Set<string>]) => {
          if (set.size === 0) return null;
          return Array.from(set as Set<string>).map((value: string) => (
            <div
              key={`${type}-${value}`}
              className="inline-flex items-center bg-yellow-100 border border-black rounded-none px-2 py-1 m-1 text-sm"
            >
              <span className="mr-1">{value}</span>
              <button
                onClick={() => removeFilter(type as keyof FilterState, value)}
                className="hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ));
        })}

        {/* Suggestions Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute mt-1 w-full bg-white border border-black rounded-none shadow-lg max-h-96 overflow-y-auto z-50 scrollable-results-list">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.type}-${suggestion.value}`}
                className={`p-2 cursor-pointer ${
                  index === selectedIndex
                    ? "bg-yellow-100"
                    : "hover:bg-yellow-50"
                }`}
                onClick={() => addFilter(suggestion.type, suggestion.value)}
              >
                <div className="flex items-start">
                  <span className="w-16 text-xs text-gray-500 mt-1">
                    {getTypeLabel(suggestion.type)}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {suggestion.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isOpen && query && !suggestions.length && (
          <div className="absolute mt-1 w-full bg-white border border-black rounded-none shadow-lg p-2">
            <div className="text-sm text-gray-500">
              No matching filters found
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
