import React from "react";

const BrutalistNode = ({
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
    Food: "#2D5A27",
    Agriculture: "#507D2A",
    "Animal husbandry": "#45632D",
    "Hunting and fishing": "#2D4A27",
    Biology: "#2D5A4F",
    Medicine: "#2D4A4A",
    Sanitation: "#2D5A5A",
    Physics: "#2D2D5A",
    Chemistry: "#3D2D5A",
    Astronomy: "#2D3D5A",
    Meteorology: "#2D4D5A",
    Optics: "#2D3D4A",
    Electricity: "#5A5A2D",
    Electronics: "#5A4D2D",
    Energy: "#5A3D2D",
    Lighting: "#5A5A2D",
    Construction: "#4A3D2D",
    Mining: "#5A3D2D",
    Metallurgy: "#4D3D2D",
    Manufacturing: "#5A3D2D",
    Textiles: "#5A2D3D",
    Hydraulics: "#2D3D4A",
    Transportation: "#2D3D4A",
    Flying: "#2D4D5A",
    Sailing: "#2D3D5A",
    Space: "#2D2D4A",
    Cartography: "#2D3D4A",
    Mathematics: "#2D2D3D",
    Measurement: "#2D2D3D",
    Timekeeping: "#2D2D3D",
    Computing: "#2D2D3D",
    Security: "#5A2D2D",
    Military: "#5A2D2D",
    Finance: "#3D3D3D",
    Law: "#2D2D3D",
    Governance: "#2D2D3D",
    Communication: "#5A2D3D",
    "Visual media": "#5A2D3D",
    Entertainment: "#5A2D3D",
    Music: "#5A2D3D",
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
        <div className="border-b border-black p-0">
          <img
            src={node.image}
            alt={node.title}
            className="w-full h-20 object-cover"
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
            <h3 className="text-sm font-bold uppercase leading-tight">
              {node.title}
            </h3>
            <div className="text-[10px] font-mono text-gray-600 mt-0.5">
              {node.secondaryName || `TYPE-${node.id.slice(0,3)}`}
            </div>
          </div>

          {/* Year */}
          <div className="inline-block border border-black px-2 py-0.5 mb-2">
            <span className="font-mono text-xs">{yearDisplay}</span>
          </div>

          {/* Fields */}
          <div className="flex flex-wrap gap-1">
            {node.fields.map((field) => (
              <span
                key={field}
                className="text-[10px] px-1.5 py-0.5 uppercase font-bold text-white"
                style={{
                  backgroundColor: fieldColors[field] || "#2D2D2D",
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
