import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TechNode } from '@/types/tech-node';

export interface SearchResult {
  type: 'year' | 'node' | 'person' | 'field' | 'organization';
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

export function SearchBox({ onSearch, results, onSelectResult }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
    setIsOpen(true);
    setSelectedIndex(0);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectResult(results[selectedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="Search or enter year..."
          className="pl-8 pr-4 w-full border-black rounded-none font-mono"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute mt-1 w-full bg-white border border-black rounded-none shadow-lg max-h-96 overflow-y-auto z-50">
          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.text}-${index}`}
              className={`p-2 cursor-pointer ${
                index === selectedIndex ? 'bg-yellow-100' : 'hover:bg-yellow-50'
              }`}
              onClick={() => {
                onSelectResult(result);
                setIsOpen(false);
              }}
            >
              <div className="flex items-start">
                <span className="w-16 text-xs text-gray-500 mt-1">
                  {result.type === 'year' && 'Year'}
                  {result.type === 'node' && 'Tech'}
                  {result.type === 'person' && 'Person'}
                  {result.type === 'organization' && 'Org'}
                  {result.type === 'field' && 'Field'}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{result.text}</div>
                  {result.subtext && (
                    <div className="text-xs text-gray-500">{result.subtext}</div>
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
  );
} 