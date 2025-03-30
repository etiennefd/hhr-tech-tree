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
  private lastLogTime: number = 0;
  private LOG_INTERVAL = 1000; // Log at most once per second

  constructor(cellSize: number = 1000) {
    this.nodeCells = new Map();
    this.connectionCells = new Map();
    this.nodePositions = new Map();
    this.connectionPositions = new Map();
    this.cellSize = cellSize;
  }

  private logPerformance(operation: string, startTime: number) {
    const now = performance.now();
    if (now - this.lastLogTime > this.LOG_INTERVAL) {
      const duration = now - startTime;
      console.log(`[SpatialIndex] ${operation}: ${duration.toFixed(2)}ms`);
      this.lastLogTime = now;
    }
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
    const start = performance.now();
    
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

    this.logPerformance('addNode', start);
  }

  // Add a connection to the spatial index
  addConnection(connectionIndex: number, start: Point, end: Point) {
    const startTime = performance.now();
    
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

    this.logPerformance(`addConnection (cells: ${cells.length})`, startTime);
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
    const start = performance.now();
    
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
        nodesInCell.forEach(nodeId => result.add(nodeId));
      }
    });

    this.logPerformance(`getNodesInViewport (cells: ${cells.length}, nodes: ${result.size})`, start);
    return result;
  }

  // Get all connections that might be visible in the viewport
  getConnectionsInViewport(viewport: Viewport): Set<number> {
    const start = performance.now();
    
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
        connectionsInCell.forEach(connectionIndex => result.add(connectionIndex));
      }
    });

    this.logPerformance(`getConnectionsInViewport (cells: ${cells.length}, connections: ${result.size})`, start);
    return result;
  }

  // Clear all data from the spatial index
  clear() {
    this.nodeCells.clear();
    this.connectionCells.clear();
    this.nodePositions.clear();
    this.connectionPositions.clear();
  }
} 