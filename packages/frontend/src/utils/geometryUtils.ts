import Flatten from 'flatten-js';
import {
  GraphAngleLabel,
  GraphLabelOffset,
  GraphPolygonPoint,
  GraphSideLabel,
} from '../types';

const { Point, Vector } = Flatten;

const DEFAULT_RADIAL_OFFSET = 0.08; // Tight placement inside angles

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeVector = (vector: { x: number; y: number }) => {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) {
    return null;
  }
  return { x: vector.x / length, y: vector.y / length };
};

const applyOffset = (point: { x: number; y: number }, offset?: GraphLabelOffset) => {
  if (!offset) {
    return point;
  }
  return {
    x: point.x + (offset.x ?? 0),
    y: point.y + (offset.y ?? 0),
  };
};

export const polygonSizeScale = (points: GraphPolygonPoint[]): number => {
  if (points.length === 0) {
    return 1;
  }
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  points.forEach((pt) => {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  });

  const diag = Math.hypot(maxX - minX, maxY - minY);
  return diag || 1;
};

export const getVertexPoint = (points: GraphPolygonPoint[], label?: string) => {
  if (!label) {
    return null;
  }

  const index = points.findIndex((point) => point.label === label);
  if (index === -1) {
    return null;
  }

  return { index, point: points[index] };
};

export const computePolygonCentroid = (points: GraphPolygonPoint[]) => {
  if (points.length === 0) {
    return null;
  }

  let signedArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    signedArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-6) {
    // Fallback: average of points
    const avgX = points.reduce((sum, pt) => sum + pt.x, 0) / points.length;
    const avgY = points.reduce((sum, pt) => sum + pt.y, 0) / points.length;
    return { x: avgX, y: avgY };
  }

  return {
    x: centroidX / (6 * signedArea),
    y: centroidY / (6 * signedArea),
  };
};

/**
 * Compute the interior angle bisector at a vertex
 * Returns a unit vector pointing INTO the polygon from the vertex
 */
export const computeAngleBisector = (pointIndex: number, points: GraphPolygonPoint[]) => {
  if (!points.length) {
    return null;
  }

  const current = points[pointIndex];
  const prev = points[(pointIndex - 1 + points.length) % points.length];
  const next = points[(pointIndex + 1) % points.length];

  const vertexPoint = new Point(current.x, current.y);
  const prevPoint = new Point(prev.x, prev.y);
  const nextPoint = new Point(next.x, next.y);

  // Vectors pointing FROM adjacent vertices TO current vertex (inward)
  const vectorFromPrev = new Vector(prevPoint, vertexPoint);
  const vectorFromNext = new Vector(nextPoint, vertexPoint);

  const unitPrev = normalizeVector({ x: vectorFromPrev.x, y: vectorFromPrev.y });
  const unitNext = normalizeVector({ x: vectorFromNext.x, y: vectorFromNext.y });

  if (!unitPrev || !unitNext) {
    return null;
  }

  // Bisector is the average of the two inward-pointing unit vectors
  const bisectorVector = normalizeVector({
    x: unitPrev.x + unitNext.x,
    y: unitPrev.y + unitNext.y,
  });

  return bisectorVector ?? unitPrev ?? unitNext;
};

/**
 * Check if a line segment (from point to label position) intersects any polygon edge
 * Used to detect if label placement would cross a side
 */
const labelCrossesEdge = (
  labelPos: { x: number; y: number },
  vertexPos: { x: number; y: number },
  points: GraphPolygonPoint[],
  vertexIndex: number
): boolean => {
  // Check if the line from vertex to label crosses any polygon edge
  // (except the two edges connected to this vertex)
  for (let i = 0; i < points.length; i++) {
    const nextI = (i + 1) % points.length;
    
    // Skip edges connected to current vertex
    if (i === vertexIndex || nextI === vertexIndex) {
      continue;
    }

    const edgeStart = points[i];
    const edgeEnd = points[nextI];

    // Simple line segment intersection test
    if (
      segmentsIntersect(
        vertexPos.x,
        vertexPos.y,
        labelPos.x,
        labelPos.y,
        edgeStart.x,
        edgeStart.y,
        edgeEnd.x,
        edgeEnd.y
      )
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Line segment intersection test
 */
const segmentsIntersect = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean => {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 0.0001) {
    return false; // Parallel
  }

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua > 0.01 && ua < 0.99 && ub > 0.01 && ub < 0.99;
};

export const computeRelativeAngleLabelPosition = (
  label: GraphAngleLabel,
  points: GraphPolygonPoint[],
  scale: number
) => {
  if (!label.atVertex) {
    return null;
  }

  const vertexInfo = getVertexPoint(points, label.atVertex);
  if (!vertexInfo) {
    return null;
  }

  const bisector = computeAngleBisector(vertexInfo.index, points);
  if (!bisector) {
    return null;
  }

  let distanceFactor = clamp(label.radialOffset ?? DEFAULT_RADIAL_OFFSET, 0.05, 0.3);
  let distance = (distanceFactor + (label.bisectorOffset ?? 0)) * scale;

  // Try initial placement
  let coordinates = {
    x: vertexInfo.point.x + bisector.x * distance,
    y: vertexInfo.point.y + bisector.y * distance,
  };

  // If label would cross an edge (diagonal), reduce distance iteratively
  let attempts = 0;
  while (
    attempts < 5 &&
    labelCrossesEdge(coordinates, vertexInfo.point, points, vertexInfo.index)
  ) {
    distanceFactor *= 0.6; // Pull label closer to vertex
    distance = distanceFactor * scale;
    coordinates = {
      x: vertexInfo.point.x + bisector.x * distance,
      y: vertexInfo.point.y + bisector.y * distance,
    };
    attempts++;
  }

  // Apply user offset after collision avoidance
  coordinates = applyOffset(coordinates, label.offset);

  return {
    ...label,
    x: coordinates.x,
    y: coordinates.y,
  };
};

export const computeSideLabelPosition = (
  label: GraphSideLabel,
  points: GraphPolygonPoint[],
  centroid?: { x: number; y: number } | null,
  scale = 1
) => {
  if (!label.onSide) {
    return null;
  }

  const [startLabel, endLabel] = label.onSide;
  const start = getVertexPoint(points, startLabel);
  const end = getVertexPoint(points, endLabel);

  if (!start || !end) {
    return null;
  }

  const t = clamp(label.position ?? 0.5, 0, 1);
  
  // Compute midpoint along edge
  const midpoint = {
    x: start.point.x + (end.point.x - start.point.x) * t,
    y: start.point.y + (end.point.y - start.point.y) * t,
  };

  let coordinates = midpoint;

  // Automatically nudge label toward polygon interior if requested
  if (label.preferInside && centroid) {
    const direction = normalizeVector({
      x: centroid.x - midpoint.x,
      y: centroid.y - midpoint.y,
    });

    if (direction) {
      const defaultOffset = label.insideOffset ?? Math.min(Math.max(scale * 0.06, 4), 12);
      coordinates = {
        x: coordinates.x + direction.x * defaultOffset,
        y: coordinates.y + direction.y * defaultOffset,
      };
    }
  }

  // Apply user offset (which can include perpendicular adjustment)
  coordinates = applyOffset(coordinates, label.offset);

  return {
    ...label,
    x: coordinates.x,
    y: coordinates.y,
  };
};

