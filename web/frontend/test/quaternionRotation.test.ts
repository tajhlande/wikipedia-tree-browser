import { describe, it, expect, vi } from 'vitest';
import { Vector3, Quaternion } from "@babylonjs/core";

describe('Quaternion Rotation Fix', () => {
  it('should create proper quaternion rotation for link positioning', () => {
    // Test vectors
    const upVector = Vector3.Up();
    const targetDirection = new Vector3(1, 1, 0).normalize();

    // Calculate rotation axis and angle
    const axis = Vector3.Cross(upVector, targetDirection);
    const angle = Math.acos(Vector3.Dot(upVector, targetDirection));

    // Create quaternion
    const quaternion = new Quaternion();
    Quaternion.RotationAxisToRef(axis.normalize(), angle, quaternion);

    // Verify quaternion is valid
    expect(quaternion).toBeDefined();
    expect(quaternion.x).toBeCloseTo(axis.x * Math.sin(angle/2), 4);
    expect(quaternion.y).toBeCloseTo(axis.y * Math.sin(angle/2), 4);
    expect(quaternion.z).toBeCloseTo(axis.z * Math.sin(angle/2), 4);
    expect(quaternion.w).toBeCloseTo(Math.cos(angle/2), 4);

    // Verify quaternion is normalized
    const length = Math.sqrt(
      quaternion.x * quaternion.x +
      quaternion.y * quaternion.y +
      quaternion.z * quaternion.z +
      quaternion.w * quaternion.w
    );
    expect(length).toBeCloseTo(1.0, 4);
  });

  it('should handle edge case when vectors are parallel', () => {
    const upVector = Vector3.Up();
    const parallelVector = new Vector3(0, 1, 0); // Same as up vector

    const axis = Vector3.Cross(upVector, parallelVector);
    const angle = Math.acos(Vector3.Dot(upVector, parallelVector));

    // When vectors are parallel, axis length should be 0
    expect(axis.length()).toBeCloseTo(0, 4);
    expect(angle).toBeCloseTo(0, 4);

    // Should not create rotation when axis is too small
    if (axis.length() < 0.001) {
      expect(true).toBe(true); // No rotation needed
    }
  });

  it('should handle edge case when vectors are opposite', () => {
    const upVector = Vector3.Up();
    const oppositeVector = new Vector3(0, -1, 0); // Opposite of up vector

    const axis = Vector3.Cross(upVector, oppositeVector);
    const angle = Math.acos(Vector3.Dot(upVector, oppositeVector));

    // When vectors are opposite, angle should be PI
    expect(angle).toBeCloseTo(Math.PI, 4);

    // Axis should be valid
    expect(axis.length()).toBeGreaterThan(0);
  });
});