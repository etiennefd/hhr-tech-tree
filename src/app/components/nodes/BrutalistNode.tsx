import React, { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getFieldColor } from "@/constants/fieldColors";

// Nodes unmount when they scroll out of the viewport, so without a module-level
// memory of what already resolved, every scroll-back restarts the fade-in and
// re-runs the retry for images we already know the outcome of.
const loadedImageUrls = new Set<string>();
const failedImageUrls = new Set<string>();

// Nodes whose dedicated image is shipped with the app rather than coming from
// the data set.
const SPECIAL_NODE_IMAGES: { [key: string]: string } = {
  "Stone tool": "/tool-in-situ-being-unearthed-at-excavation_3_edit.jpg",
  "Oldowan stone tool": "/Pierre_taillée_Melka_Kunture_Éthiopie.jpg",
  "Acheulean stone tool": "/Bifaz_cordiforme.jpg",
};

type ImageStatus = "loading" | "loaded" | "error";

interface Node {
  year: number;
  title: string;
  subtitle?: string;
  image?: string;
  localImage?: string;
  imagePosition?: string;
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
  showImages?: boolean;
}

const formatTitle = (title: string) => {
  // Special cases
  const specialCases: { [key: string]: string } = {
    'mRNA': 'mRNA',
    'p–n': 'p–n',
    'Technetium-99m': 'TECHNETIUM-99m',
    'pH': 'pH',
    'YInMn': 'YInMn',
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
const validateImage = (url?: string | null): string | undefined => {
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
  showImages = true,
}) => {
  // Check if the current node has a special image
  const specialImage = SPECIAL_NODE_IMAGES[node.title];

  const imageUrl = useMemo(
    () => (showImages ? validateImage(node.localImage || node.image) : undefined),
    [showImages, node.localImage, node.image]
  );

  // A node with no usable URL goes straight to the placeholder; a URL we've
  // already resolved this session skips the skeleton and the fade entirely.
  const initialStatus = (url: string | undefined): ImageStatus => {
    if (!url) return "error";
    if (loadedImageUrls.has(url)) return "loaded";
    if (failedImageUrls.has(url)) return "error";
    return "loading";
  };

  // `attempt` is part of the <Image> key: bumping it remounts the element,
  // which is what actually re-issues the request on retry.
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ImageStatus>(() => initialStatus(imageUrl));

  // Reset during render when the URL changes (including the images toggle),
  // rather than in an effect that would paint a stale frame first.
  const lastImageUrlRef = useRef(imageUrl);
  if (lastImageUrlRef.current !== imageUrl) {
    lastImageUrlRef.current = imageUrl;
    setAttempt(0);
    setStatus(initialStatus(imageUrl));
  }

  const handleImageError = useCallback(() => {
    if (!imageUrl) return;
    // One retry, then fall back to the placeholder for good.
    if (attempt === 0) {
      setAttempt(1);
      return;
    }
    failedImageUrls.add(imageUrl);
    setStatus("error");
  }, [attempt, imageUrl]);

  const handleImageLoad = useCallback(() => {
    if (!imageUrl) return;
    loadedImageUrls.add(imageUrl);
    setStatus("loaded");
  }, [imageUrl]);

  const year = Math.abs(node.year);
  const yearDisplay = node.year < 0 ? `${year} BCE` : `${year}`;

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

  const imageSizes = `${Math.round(width)}px`;
  const isLocalImage = imageUrl?.startsWith("/") ?? false;

  return (
    <div
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
        {showImages && (
          <div className="border-b border-black p-0 relative h-20">
            {specialImage ? (
              // Special case: render the dedicated image directly
              <Image
                src={specialImage}
                alt={node.title}
                fill
                sizes={imageSizes}
                unoptimized
                className="object-cover"
                style={{
                  filter: "grayscale(20%) contrast(110%)",
                  mixBlendMode: "multiply",
                  objectPosition: node.imagePosition || 'center',
                }}
              />
            ) : (
              // Original logic for all other nodes
              <>
                {imageUrl && status !== "error" && (
                  <Image
                    key={`${imageUrl}#${attempt}`}
                    src={imageUrl}
                    alt={node.title}
                    fill
                    sizes={imageSizes}
                    className={`object-cover transition-opacity duration-300 ${
                      status === "loaded" ? "opacity-100" : "opacity-0"
                    }`}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    style={{
                      filter: "grayscale(20%) contrast(110%)",
                      mixBlendMode: "multiply",
                      objectPosition: node.imagePosition || 'center',
                    }}
                    unoptimized={isLocalImage}
                  />
                )}
                {/* Show loading state while image is loading */}
                {status === "loading" && (
                  <div className="absolute inset-0 bg-gray-100 animate-pulse" />
                )}
                {/* Only show placeholder if we've tried loading and failed */}
                {status === "error" && (
                  <Image
                    src="/placeholder-invention.jpg"
                    alt="Placeholder"
                    fill
                    sizes={imageSizes}
                    unoptimized
                    className="object-cover"
                    style={{
                      filter: "grayscale(20%) contrast(110%)",
                      mixBlendMode: "multiply",
                      objectPosition: node.imagePosition || 'center',
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}

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
                  backgroundColor: getFieldColor(field),
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
    prevProps.node.subtitle === nextProps.node.subtitle &&
    prevProps.node.year === nextProps.node.year &&
    prevProps.node.image === nextProps.node.image &&
    // localImage is the primary source (localImage || image), so it has to be
    // compared here or a changed local image would never repaint.
    prevProps.node.localImage === nextProps.node.localImage &&
    prevProps.node.imagePosition === nextProps.node.imagePosition &&
    prevProps.width === nextProps.width &&
    prevProps.style?.opacity === nextProps.style?.opacity &&
    prevProps.showImages === nextProps.showImages
  );
});
