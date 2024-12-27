import React from "react";
import Image from "next/image";

interface Node {
  year: number;
  title: string;
  subtitle?: string;
  image: string;
  fields: string[];
}

interface BrutalistNodeProps {
  node: Node;
  isSelected: boolean;
  isAdjacent: boolean;
  formatYear?: (year: number) => string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  width: number;
  style?: React.CSSProperties;
}

const BrutalistNode: React.FC<BrutalistNodeProps> = ({
  node,
  isSelected,
  isAdjacent,
  formatYear,
  onClick,
  onMouseEnter,
  onMouseLeave,
  width,
  style,
}) => {
  const year = Math.abs(node.year);
  const yearDisplay = node.year < 0 ? `${year} BCE` : `${year}`;

  // Bold, industrial colors for fields
  const fieldColors = {
    // Food & Agriculture (Vibrant Greens)
    Food: "#2AAE4A", // Bright grass green
    Agriculture: "#34B441", // Fresh leaf green
    "Animal husbandry": "#43A838", // Apple green
    "Hunting and fishing": "#3EAF49", // Forest green

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
    Electricity: "#FF9F1C", // Electric orange
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
    Military: "#D64933", // Signal red
    Finance: "#2F4F4F", // Dark sage green
    Law: "#5C7080", // Justice gray
    Governance: "#536B78", // Authority gray

    // Culture & Communication (Distinct Pinks)
    Communication: "#B07996", // Greyish pink
    "Visual media": "#DA70D6", // Orchid
    Entertainment: "#FF69B4", // Hot pink
    Music: "#C71585", // Medium violet red

    Misc: "#555555", // Medium gray
  };

  return (
    <div
      className={`
        relative 
        transition-transform 
        cursor-pointer 
        tech-node
        ${isSelected ? "z-20" : "z-10"}
      `}
      lang="en"
      style={{
        ...style,
        width: `${width}px`,
        transform: `translate(-${width / 2}px, -75px)`,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Main container */}
      <div
        className={`
        border border-black
        bg-white
        ${isSelected ? "ring-2 ring-black" : ""}
        transition-all
      `}
      >
        {/* Image section */}
        <div className="border-b border-black p-0 relative h-20">
          <Image
            src={node.image}
            alt={node.title}
            fill
            className="object-cover"
            style={{
              filter: "grayscale(20%) contrast(110%)",
              mixBlendMode: "multiply",
            }}
          />
        </div>

        {/* Content section */}
        <div className="px-3 py-2">
          {/* Title and code */}
          <div className="mb-2">
            <h3
              className="text-sm font-bold uppercase leading-tight"
              style={{
                wordBreak: "break-word",
                hyphens: "auto",
                WebkitHyphens: "auto",
                msHyphens: "auto",
                hyphenateCharacter: "-",
              }}
            >
              {node.title}
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
                  backgroundColor: fieldColors[field as keyof typeof fieldColors] || "#2D2D2D",
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

export default BrutalistNode;
