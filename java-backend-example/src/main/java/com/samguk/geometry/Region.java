package com.samguk.geometry;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Backend/data authoring example for a province polygon.
 * The center is recalculated only when geometry changes, not every render frame.
 */
public final class Region {
    private final String id;
    private final String name;
    private List<Point> vertices = List.of();
    private Point center = new Point(0.0, 0.0);

    public Region(String id, String name, List<Point> vertices) {
        this.id = Objects.requireNonNull(id, "id");
        this.name = Objects.requireNonNull(name, "name");
        setVertices(vertices);
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<Point> getVertices() {
        return Collections.unmodifiableList(vertices);
    }

    public Point getCenter() {
        return center;
    }

    /**
     * Replaces polygon geometry and immediately stores its new mass centroid.
     */
    public void setVertices(List<Point> vertices) {
        Objects.requireNonNull(vertices, "vertices");
        this.vertices = new ArrayList<>(vertices);
        this.center = PolygonCentroid.calculate(this.vertices);
    }
}
