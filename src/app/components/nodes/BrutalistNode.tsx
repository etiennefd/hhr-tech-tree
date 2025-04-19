import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Node {
  year: number;
  title: string;
  subtitle?: string;
  image?: string;
  fields: string[];
  wikipedia?: string;
}

interface BrutalistNodeProps {
  node: Node;
  isSelected: boolean;
  isAdjacent: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  width: number;
  style?: React.CSSProperties;
}

const formatTitle = (title: string) => {
  // Special cases
  const specialCases: { [key: string]: string } = {
    'mRNA': 'mRNA',
    'p–n': 'p–n',
    // Add more special cases as needed
  };

  // Check if the entire title is a special case
  if (specialCases[title]) {
    return specialCases[title];
  }

  // Check for special cases within the title
  return title.split(' ').map(word => {
    return specialCases[word] || word.toUpperCase();
  }).join(' ');
};

// Helper function to validate image URLs
const validateImage = (url?: string): string | undefined => {
  if (!url) return undefined;

  // Basic URL validation
  if (typeof url !== 'string' || url.length < 5) {
    return undefined;
  }
  
  // Check if image URL is valid (must start with / or http:// or https://)
  if (!url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
    return undefined;
  }

  return url;
};

const BrutalistNode: React.FC<BrutalistNodeProps> = ({
  node,
  isSelected,
  isAdjacent,
  onClick,
  onMouseEnter,
  onMouseLeave,
  width,
  style,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(() => validateImage(node.image));
  const hasLoadedRef = useRef(false);
  const initialLoadRef = useRef(true);
  const retryCountRef = useRef(0);
  const originalUrlRef = useRef(validateImage(node.image));

  // Map for special node titles and their dedicated images
  const specialNodeImages: { [key: string]: string } = {
    "Stone tool": "/tool-in-situ-being-unearthed-at-excavation_3_edit.jpg",
    "Oldowan stone tool": "/Pierre_taillée_Melka_Kunture_Éthiopie.jpg",
    "Acheulean stone tool": "/Bifaz_cordiforme.jpg",
  };

  // Check if the current node has a special image
  const specialImage = specialNodeImages[node.title];

  // Reset loading state when image URL changes
  useEffect(() => {
    if (imageUrl) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [imageUrl]);

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Once visible, we can disconnect the observer
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading images earlier before they come into view
        threshold: 0.1,
      }
    );

    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Set initial load flag to false after the first render cycle
  useEffect(() => {
    initialLoadRef.current = false;
  }, []);

  // Stable effect for handling image URL changes from parent
  useEffect(() => {
    // Only update the image URL if we haven't already successfully loaded one
    // and if the original URL changes
    const newValidUrl = validateImage(node.image);
    
    if (!hasLoadedRef.current && originalUrlRef.current !== newValidUrl) {
      originalUrlRef.current = newValidUrl;
      setImageUrl(newValidUrl);
      retryCountRef.current = 0;
    }
  }, [node.image]);

  const year = Math.abs(node.year);
  const yearDisplay = node.year < 0 ? `${year} BCE` : `${year}`;

  // Bold, industrial colors for fields
  const fieldColors = {
    // Food & Agriculture (Vibrant Greens)
    Food: "#277d1e", // deep green
    Agriculture: "#359c2c", // Fresh leaf green

    // Life Sciences (Teals and Aquas)
    Biology: "#2cbd00",
    Medicine: "#00A5B3", // Medical blue
    Sanitation: "#00bdcf",

    // Physical Sciences (Deep Purples)
    Physics: "#6b3ba1",
    Chemistry: "#8E4BC9", // Bright purple
    Astronomy: "#371c91",
    Meteorology: "#3c9cbf",
    Optics: "#5C6BC0", // Bright indigo

    // Energy & Electronics (Circuit Boards and Energy)
    Electricity: "#0099FF", // Electric blue
    Electronics: "#33a371",
    Energy: "#FFB627", // Energy yellow
    Lighting: "#ffdc2b", // Bright amber

    // Construction/Materials (Metallics and Earth)
    Construction: "#c14d17", // brick
    Mining: "#B87D3D", // Copper brown
    Metallurgy: "#8C8C8C", // Brushed steel
    Manufacturing: "#a36018",
    Textiles: "#b58c55",
    Hydraulics: "#4A90B6", // Industrial blue

    // Transportation/Movement
    Transportation: "#de6f00",
    Flying: "#87cfeb", // sky blue
    Sailing: "#1C7CD5", // Ocean blue
    Space: "#2C1654", // Deep space purple
    Geography: "#5ed5ff", // map ocean blue

    // Computing/Math (Modern Grays and Blues)
    Mathematics: "#6B7B8C", // Slate blue
    Measurement: "#607D8B", // Steel blue
    Timekeeping: "#546E7A", // Clock gray
    Computing: "#435863", // Tech gray

    // Safety/Protection/Governance
    Security: "#E94F37", // Alert red
    Weaponry: "#d63333",
    Finance: "#2f6333",
    Governance: "#536B78", // Authority gray

    // Culture & Communication (Distinct Pinks)
    Communication: "#c97fa7",
    "Visual media": "#DA70D6", // Orchid
    Recreation: "#FF69B4", // Hot pink
    Music: "#C71585", // Medium violet red

    Misc: "#919191",
  };

  // Move addSoftHyphens inside useMemo to handle dependencies properly
  const formattedTitle = React.useMemo(() => {
    const addSoftHyphens = (text: string) => {
      // Make the line width more conservative to prevent awkward breaks
      const charsPerLine = Math.floor((width - 40) / 8); // Increased padding from 32 to 40

      return text
        .split(" ")
        .map((word) => {
          if (word.includes("-") || word.includes("–") || word.includes("—")) {
            return word;
          }
          if (word.length > charsPerLine) {
            const chars = word.split("");
            return chars.slice(0, -2).join("\u00AD") + chars.slice(-2).join("");
          }
          return word;
        })
        .join(" ");
    };

    return addSoftHyphens(node.title);
  }, [node.title, width]);

  // Memoize the dynamic font size calculation
  const titleFontSize = React.useMemo(
    () =>
      node.title.split(" ").some((word) => word.length > 13)
        ? "0.79rem"
        : undefined,
    [node.title]
  );

  // Error handler for image loading
  const handleImageError = () => {
    if (retryCountRef.current < 1 && imageUrl !== undefined) {
      // Try once more with the original source after a delay
      retryCountRef.current++;
      setTimeout(() => {
        if (originalUrlRef.current !== undefined) {
          setImageUrl(originalUrlRef.current);
        }
      }, 1000);
    } else {
      // Give up and use placeholder
      if (imageUrl !== undefined) {
        setImageUrl(undefined);
      }
      setImageError(true);
    }
  };

  // Success handler for image loading
  const handleImageLoad = () => {
    if (imageUrl !== undefined) {
      hasLoadedRef.current = true;
      setImageLoaded(true);
      // Log when an actual image (not a placeholder) is loaded
      console.log(`Node image loaded: ${node.title} - ${imageUrl}`);
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`
        relative 
        cursor-pointer 
        tech-node
        ${isSelected ? "z-20" : isAdjacent ? "z-15" : "z-10"}
      `}
      lang="en"
      style={{
        ...style,
        width: `${width}px`,
        transform: `translate(-${width / 2}px, -75px)`,
        opacity: style?.opacity,
      }}
      onClick={() => {
        onClick();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`
        border border-black
        bg-white
        ${isSelected ? "ring-2 ring-black" : ""}
        relative
      `}
      >
        {/* Add X button for selected state */}
        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering node click
              onClick(); // Use the same onClick handler which will deselect when already selected
            }}
            className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-black z-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Deselect node"
          >
            <span className="text-xs font-bold">×</span>
          </button>
        )}
        {/* Image section with improved loading states */}
        <div className="border-b border-black p-0 relative h-20">
          {specialImage ? (
            // Special case: render the dedicated image directly
            <Image
              src={specialImage}
              alt={node.title}
              fill
              sizes="160px"
              loading="eager" // Load eagerly as it's a special case
              quality={75}
              className="object-cover"
              style={{
                filter: "grayscale(20%) contrast(110%)",
                mixBlendMode: "multiply",
              }}
              priority={isSelected || isAdjacent} // Still prioritize if selected/adjacent
            />
          ) : (
            // Original logic for all other nodes
            <>
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt={node.title}
                  fill
                  sizes="160px"
                  loading="eager"
                  quality={75}
                  className={`object-cover transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{
                    filter: "grayscale(20%) contrast(110%)",
                    mixBlendMode: "multiply",
                  }}
                  priority={isSelected || isAdjacent}
                />
              )}
              {/* Show loading state while image is loading */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-gray-100 animate-pulse" />
              )}
              {/* Only show placeholder if we've tried loading and failed */}
              {imageError && (
                <Image
                  src="/placeholder-invention.png"
                  alt="Placeholder"
                  fill
                  sizes="160px"
                  className="object-cover"
                  style={{
                    filter: "grayscale(20%) contrast(110%)",
                    mixBlendMode: "multiply",
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Content section */}
        <div className="px-3 py-2">
          <div className="mb-2">
            <h3
              className="text-sm font-bold leading-tight"
              style={{
                wordBreak: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%",
                fontSize: titleFontSize,
              }}
            >
              {formatTitle(formattedTitle)}
            </h3>
            {node.subtitle && (
              <div className="text-[10px] font-mono text-gray-600 mt-0.5">
                {node.subtitle}
              </div>
            )}
          </div>

          {/* Year */}
          <div className="inline-block border border-black px-2 py-0.5 mb-2">
            <span className="font-mono text-xs">{yearDisplay}</span>
          </div>

          {/* Fields */}
          <div className="flex flex-wrap gap-1">
            {node.fields.map((field: string) => (
              <span
                key={field}
                className="text-[10px] px-1.5 py-0.5 uppercase font-bold text-white"
                style={{
                  backgroundColor:
                    fieldColors[field as keyof typeof fieldColors] || "#2D2D2D",
                }}
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders
export default React.memo(BrutalistNode, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isAdjacent === nextProps.isAdjacent &&
    prevProps.node.title === nextProps.node.title &&
    prevProps.node.year === nextProps.node.year &&
    prevProps.width === nextProps.width &&
    prevProps.style?.opacity === nextProps.style?.opacity
  );
});
