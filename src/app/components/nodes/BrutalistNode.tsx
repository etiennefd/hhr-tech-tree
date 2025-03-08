import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import placeholderImage from "@/assets/placeholder-invention.png";

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
        rootMargin: "50px", // Start loading images slightly before they come into view
        threshold: 0.1,
      }
    );

    if (nodeRef.current) {
      observer.observe(nodeRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const year = Math.abs(node.year);
  const yearDisplay = node.year < 0 ? `${year} BCE` : `${year}`;

  // Bold, industrial colors for fields
  const fieldColors = {
    // Food & Agriculture (Vibrant Greens)
    Food: "#2AAE4A", // Bright grass green
    Agriculture: "#34B441", // Fresh leaf green

    // Life Sciences (Teals and Aquas)
    Biology: "#00A499", // Rich teal
    Medicine: "#00A5B3", // Medical blue
    Sanitation: "#0098A6", // Clean aqua

    // Physical Sciences (Deep Purples)
    Physics: "#7B44BC", // Rich purple
    Chemistry: "#8E4BC9", // Bright purple
    Astronomy: "#6B3AAD", // Deep purple
    Meteorology: "#3C7EBF", // Sky blue
    Optics: "#5C6BC0", // Bright indigo

    // Energy & Electronics (Circuit Boards and Energy)
    Electricity: "#0099FF", // Electric blue
    Electronics: "#29A69B", // Circuit board teal
    Energy: "#FFB627", // Energy yellow
    Lighting: "#FFB01F", // Bright amber

    // Construction/Materials (Metallics and Earth)
    Construction: "#C17817", // Rust orange
    Mining: "#B87D3D", // Copper brown
    Metallurgy: "#8C8C8C", // Brushed steel
    Manufacturing: "#D3791E", // Machine orange
    Textiles: "#D67242", // Terracotta
    Hydraulics: "#4A90B6", // Industrial blue

    // Transportation/Movement
    Transportation: "#D35400", // Transportation orange
    Flying: "#4BA3E3", // Sky blue
    Sailing: "#1C7CD5", // Ocean blue
    Space: "#2C1654", // Deep space purple
    Cartography: "#3A75C5", // Map blue

    // Computing/Math (Modern Grays and Blues)
    Mathematics: "#6B7B8C", // Slate blue
    Measurement: "#607D8B", // Steel blue
    Timekeeping: "#546E7A", // Clock gray
    Computing: "#435863", // Tech gray

    // Safety/Protection/Governance
    Security: "#E94F37", // Alert red
    Weaponry: "#D64933", // Signal red
    Finance: "#2F4F4F", // Dark sage green
    Governance: "#536B78", // Authority gray

    // Culture & Communication (Distinct Pinks)
    Communication: "#B07996", // Greyish pink
    "Visual media": "#DA70D6", // Orchid
    Recreation: "#FF69B4", // Hot pink
    Music: "#C71585", // Medium violet red

    Misc: "#555555", // Medium gray
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

  return (
    <div
      ref={nodeRef}
      className={`
        relative 
        transition-all
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
        transition-all
      `}
      >
        {/* Image section with visibility-based loading */}
        <div className="border-b border-black p-0 relative h-20">
          {(isVisible || isSelected || isAdjacent) && (
            <Image
              src={node.image || placeholderImage}
              alt={node.title}
              fill
              sizes="160px"
              loading={isSelected || isAdjacent ? "eager" : "lazy"}
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx4eHRoaHSQtJiEyNS0tLzIvNz1AQFNAU0BGTUVHS2ZXV2uDg4T/2wBDARUXFyQdJB0kTkNMTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk7/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              className={`object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onError={(e) => {
                const imgElement = e.target as HTMLImageElement;
                imgElement.src = placeholderImage.src;
              }}
              onLoad={() => setImageLoaded(true)}
              style={{
                filter: "grayscale(20%) contrast(110%)",
                mixBlendMode: "multiply",
              }}
              priority={isSelected || isAdjacent}
            />
          )}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse" />
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
    prevProps.node === nextProps.node &&
    prevProps.width === nextProps.width &&
    prevProps.style?.opacity === nextProps.style?.opacity
  );
});
