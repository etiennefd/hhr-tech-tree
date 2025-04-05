interface Viewport {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Point {
  x: number;
  y: number;
}

interface Line {
  start: Point;
  end: Point;
}

export class SpatialIndex {
  private nodeCells: Map<string, Set<string>>;
  private connectionCells: Map<string, Set<number>>;
  private cellSize: number;
  private nodePositions: Map<string, Point>;
  private connectionPositions: Map<number, Line>;

  constructor(cellSize: number = 1000) {
    this.nodeCells = new Map();
    this.connectionCells = new Map();
    this.nodePositions = new Map();
    this.connectionPositions = new Map();
    this.cellSize = cellSize;
  }

  private getCellsForBoundingBox(left: number, right: number, top: number, bottom: number): string[] {
    const startCellX = Math.floor(left / this.cellSize);
    const endCellX = Math.floor(right / this.cellSize);
    const startCellY = Math.floor(top / this.cellSize);
    const endCellY = Math.floor(bottom / this.cellSize);

    const cells: string[] = [];
    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }

  private getCellsForLine(start: Point, end: Point): string[] {
    // Get bounding box of the line
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);

    // Add some padding to ensure we catch cells the curve might pass through
    const padding = this.cellSize / 2;
    return this.getCellsForBoundingBox(
      left - padding,
      right + padding,
      top - padding,
      bottom + padding
    );
  }

  // Add a node to the spatial index
  addNode(nodeId: string, position: Point) {
    // Remove old position if it exists
    if (this.nodePositions.has(nodeId)) {
      this.removeNode(nodeId);
    }

    this.nodePositions.set(nodeId, position);
    const cellId = `${Math.floor(position.x / this.cellSize)},${Math.floor(position.y / this.cellSize)}`;
    
    if (!this.nodeCells.has(cellId)) {
      this.nodeCells.set(cellId, new Set());
    }
    this.nodeCells.get(cellId)!.add(nodeId);
  }

  // Add a connection to the spatial index
  addConnection(connectionIndex: number, start: Point, end: Point) {
    // Remove old connection if it exists
    if (this.connectionPositions.has(connectionIndex)) {
      this.removeConnection(connectionIndex);
    }

    this.connectionPositions.set(connectionIndex, { start, end });
    const cells = this.getCellsForLine(start, end);
    
    cells.forEach(cellId => {
      if (!this.connectionCells.has(cellId)) {
        this.connectionCells.set(cellId, new Set());
      }
      this.connectionCells.get(cellId)!.add(connectionIndex);
    });
  }

  // Remove a node from the spatial index
  removeNode(nodeId: string) {
    const position = this.nodePositions.get(nodeId);
    if (!position) return;

    const cellId = `${Math.floor(position.x / this.cellSize)},${Math.floor(position.y / this.cellSize)}`;
    this.nodeCells.get(cellId)?.delete(nodeId);
    this.nodePositions.delete(nodeId);
  }

  // Remove a connection from the spatial index
  removeConnection(connectionIndex: number) {
    const line = this.connectionPositions.get(connectionIndex);
    if (!line) return;

    const cells = this.getCellsForLine(line.start, line.end);
    cells.forEach(cellId => {
      this.connectionCells.get(cellId)?.delete(connectionIndex);
    });
    this.connectionPositions.delete(connectionIndex);
  }

  // Get all nodes that might be visible in the viewport
  getNodesInViewport(viewport: Viewport): Set<string> {
    const cells = this.getCellsForBoundingBox(
      viewport.left,
      viewport.right,
      viewport.top,
      viewport.bottom
    );

    const result = new Set<string>();
    cells.forEach(cellId => {
      const nodesInCell = this.nodeCells.get(cellId);
      if (nodesInCell) {
        nodesInCell.forEach(nodeId => {
          // Do precise point-in-viewport check
          const pos = this.nodePositions.get(nodeId);
          if (pos && 
              pos.x >= viewport.left && 
              pos.x <= viewport.right && 
              pos.y >= viewport.top && 
              pos.y <= viewport.bottom) {
            result.add(nodeId);
          }
        });
      }
    });
    
    return result;
  }

  // Get all connections that might be visible in the viewport
  getConnectionsInViewport(viewport: Viewport): Set<number> {
    const cells = this.getCellsForBoundingBox(
      viewport.left,
      viewport.right,
      viewport.top,
      viewport.bottom
    );

    const result = new Set<number>();
    cells.forEach(cellId => {
      const connectionsInCell = this.connectionCells.get(cellId);
      if (connectionsInCell) {
        connectionsInCell.forEach(connectionIndex => {
          // Do precise line segment intersection check
          const line = this.connectionPositions.get(connectionIndex);
          if (line && this.isLineInViewport(line, viewport)) {
            result.add(connectionIndex);
          }
        });
      }
    });

    return result;
  }

  // Helper to check if a line segment intersects with the viewport
  private isLineInViewport(line: Line, viewport: Viewport): boolean {
    // Check if either endpoint is in viewport
    const isStartInside = 
      line.start.x >= viewport.left && 
      line.start.x <= viewport.right && 
      line.start.y >= viewport.top && 
      line.start.y <= viewport.bottom;
    
    const isEndInside = 
      line.end.x >= viewport.left && 
      line.end.x <= viewport.right && 
      line.end.y >= viewport.top && 
      line.end.y <= viewport.bottom;

    if (isStartInside || isEndInside) return true;

    // Check if line intersects any viewport edge
    const edges = [
      {start: {x: viewport.left, y: viewport.top}, end: {x: viewport.right, y: viewport.top}},
      {start: {x: viewport.right, y: viewport.top}, end: {x: viewport.right, y: viewport.bottom}},
      {start: {x: viewport.right, y: viewport.bottom}, end: {x: viewport.left, y: viewport.bottom}},
      {start: {x: viewport.left, y: viewport.bottom}, end: {x: viewport.left, y: viewport.top}}
    ];

    return edges.some(edge => this.doLinesIntersect(line, edge));
  }

  // Helper to check if two line segments intersect
  private doLinesIntersect(line1: Line, line2: Line): boolean {
    const x1 = line1.start.x;
    const y1 = line1.start.y;
    const x2 = line1.end.x;
    const y2 = line1.end.y;
    const x3 = line2.start.x;
    const y3 = line2.start.y;
    const x4 = line2.end.x;
    const y4 = line2.end.y;

    const denominator = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
    if (denominator === 0) return false;

    const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
    const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  // Clear all data from the spatial index
  clear() {
    this.nodeCells.clear();
    this.connectionCells.clear();
    this.nodePositions.clear();
    this.connectionPositions.clear();
  }
} 