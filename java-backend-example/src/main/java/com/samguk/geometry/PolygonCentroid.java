package com.samguk.geometry;

import java.util.List;

public final class PolygonCentroid {
    private static final double EPSILON = 1e-9;

    private PolygonCentroid() {}

    /**
     * Shoelace formula based geometric/mass centroid of a simple polygon.
     * Clockwise and counter-clockwise vertex order are both supported.
     */
    public static Point calculate(List<Point> points) {
        if (points == null || points.isEmpty()) {
            return new Point(0.0, 0.0);
        }
        if (points.size() < 3) {
            return average(points);
        }

        double signedArea2 = 0.0;
        double cxNumerator = 0.0;
        double cyNumerator = 0.0;

        for (int i = 0; i < points.size(); i++) {
            Point a = points.get(i);
            Point b = points.get((i + 1) % points.size());
            double cross = a.x() * b.y() - b.x() * a.y();
            signedArea2 += cross;
            cxNumerator += (a.x() + b.x()) * cross;
            cyNumerator += (a.y() + b.y()) * cross;
        }

        if (Math.abs(signedArea2) < EPSILON) {
            return average(points);
        }

        return new Point(
            cxNumerator / (3.0 * signedArea2),
            cyNumerator / (3.0 * signedArea2)
        );
    }

    private static Point average(List<Point> points) {
        double x = 0.0;
        double y = 0.0;
        for (Point point : points) {
            x += point.x();
            y += point.y();
        }
        return new Point(x / points.size(), y / points.size());
    }
}
