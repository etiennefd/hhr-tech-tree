import React, { useState, useRef, useEffect, useId } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TechNode } from "@/types/tech-node";

export interface SearchResult {
  type: "year" | "node" | "person" | "field" | "organization";
  node?: TechNode;
  text: string;
  subtext?: string;
  matchScore: number;
  year?: number;
}

interface SearchBoxProps {
  onSearch: (query: string) => void;
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
}

export function SearchBox({
  onSearch,
  results,
  onSelectResult,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const listboxId = useId();
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;
  
  // Add debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  // Set when Enter is pressed before the debounced search has run, so the
  // first result of the fresh query is selected once it arrives
  const selectFirstOnResultsRef = useRef(false);

  // Optimized input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set immediate feedback for empty query
    if (!newQuery.trim()) {
      onSearch("");
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    setSelectedIndex(0);

    // Debounce search for non-empty queries
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = undefined;
      onSearch(newQuery);
    }, 150); // 150ms delay
  };

  // Results for a flushed search arrive on the next render (parent state)
  useEffect(() => {
    if (!selectFirstOnResultsRef.current) return;
    selectFirstOnResultsRef.current = false;
    if (results[0]) {
      onSelectResult(results[0]);
      setIsOpen(false);
    }
  }, [results, onSelectResult]);

  // Keep the keyboard-highlighted row visible in the scrollable list
  useEffect(() => {
    if (!isOpen) return;
    document
      .getElementById(`${listboxId}-option-${selectedIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, isOpen, listboxId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Effect to handle wheel and touchmove events on input for preventing page scroll
  useEffect(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;

    const handleInputWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    const handleInputTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    inputElement.addEventListener('wheel', handleInputWheel, { passive: false });
    inputElement.addEventListener('touchmove', handleInputTouchMove, { passive: false });

    return () => {
      inputElement.removeEventListener('wheel', handleInputWheel);
      inputElement.removeEventListener('touchmove', handleInputTouchMove);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Enter before the debounce fires: current results belong to the
    // previous query, so flush the search and select once results update
    if (e.key === "Enter" && debounceTimerRef.current) {
      e.preventDefault();
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
      selectFirstOnResultsRef.current = true;
      onSearch(query);
      return;
    }

    if (!results.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + results.length) % results.length
        );
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectResult(results[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
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

  // Add new function to handle expand/collapse
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Focus the input when expanding
      setTimeout(() => {
        const input = containerRef.current?.querySelector("input");
        input?.focus();
      }, 100);
    }
  };

  const showResults = isOpen && results.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Collapsed state */}
      {!isExpanded && (
        <button
          onClick={toggleExpand}
          aria-label="Open search"
          className="md:hidden flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur border border-black rounded-none shadow-md"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* Expanded state */}
      <div className={`${!isExpanded ? "hidden md:block" : "block"} w-72`}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder="Search techs/years/people"
            aria-label="Search technologies, years, and people"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showResults}
            aria-controls={listboxId}
            aria-activedescendant={
              showResults ? getOptionId(selectedIndex) : undefined
            }
            className="pl-8 pr-4 w-full border-black rounded-none font-mono"
          />
          {/* Add close button on mobile */}
          {isExpanded && (
            <button
              onClick={toggleExpand}
              aria-label="Close search"
              className="md:hidden absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showResults && (
          <div
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="absolute mt-1 w-full bg-white border border-black rounded-none shadow-lg max-h-96 overflow-y-auto z-50 scrollable-results-list"
          >
            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.text}-${index}`}
                id={getOptionId(index)}
                role="option"
                aria-selected={index === selectedIndex}
                className={`p-2 cursor-pointer ${
                  index === selectedIndex
                    ? "bg-yellow-100"
                    : "hover:bg-yellow-50"
                }`}
                onClick={() => {
                  onSelectResult(result);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-start">
                  <span className="w-16 text-xs text-gray-500 mt-1">
                    {result.type === "year" && "Year"}
                    {result.type === "node" && "Tech"}
                    {result.type === "person" && "Person"}
                    {result.type === "organization" && "Org"}
                    {result.type === "field" && "Field"}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{result.text}</div>
                    {result.subtext && (
                      <div className="text-xs text-gray-500">
                        {result.subtext}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isOpen && query && !results.length && (
          <div className="absolute mt-1 w-full bg-white border border-black rounded-none shadow-lg p-2">
            <div className="text-sm text-gray-500">No results found</div>
          </div>
        )}
      </div>
    </div>
  );
}
