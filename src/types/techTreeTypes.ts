import { ConnectionType } from "../app/components/connections/CurvedConnections";
import { TechNode } from "./tech-node";

export interface TechTreeLink {
  source: string;
  target: string;
  type: ConnectionType;
  details?: string;
}

export interface TechTreeNodePosition {
  y: number;
  height: number;
}

export interface TechTreeMinimapNode {
  id: string;
  x: number;
  y: number;
  year: number;
}

export interface TechTreeVisibleElements {
  visibleNodes: TechNode[];
  visibleConnections: TechTreeLink[];
  nodeVisibleConnections: number;
  stickyVisibleConnections: number;
  invisibleViewportConnections: number;
} 