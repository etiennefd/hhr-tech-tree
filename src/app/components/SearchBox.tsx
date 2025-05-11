import React, { useState, useRef, useEffect } from "react";
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
  
  // Add debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout>();

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
      onSearch(newQuery);
    }, 150); // 150ms delay
  };

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
      console.log('[SearchBox Input Wheel - Manual Listener] Event detected, preventing page default.', e.deltaY);
      e.preventDefault();
    };

    const handleInputTouchMove = (e: TouchEvent) => {
      console.log('[SearchBox Input TouchMove - Manual Listener] Event detected, preventing page default.');
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

  return (
    <div ref={containerRef} className="relative">
      {/* Collapsed state */}
      {!isExpanded && (
        <button
          onClick={toggleExpand}
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

        {isOpen && results.length > 0 && (
          <div className="absolute mt-1 w-full bg-white border border-black rounded-none shadow-lg max-h-96 overflow-y-auto z-50 scrollable-results-list">
            {results.map((result, index) => (
              <div
                key={`${result.type}-${result.text}-${index}`}
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
