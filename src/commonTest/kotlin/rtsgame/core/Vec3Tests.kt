package rtsgame.core

import kotlin.test.*
import kotlin.math.sqrt

class Vec3Tests {
    @Test fun plusAndTimesAndDist() {
        val a: Vec3 = Triple(1f, 2f, 3f)
        val b: Vec3 = Triple(4f, -1f, 0f)
        val sum = a + b
        assertEquals(5f, sum.first)
        assertEquals(1f, sum.second)
        assertEquals(3f, sum.third)

        val scaled = a * 2f
        assertEquals(2f, scaled.first)
        assertEquals(4f, scaled.second)
        assertEquals(6f, scaled.third)

        val dist = a.dist(b)
        assertTrue(dist > 0f)
    }

    @Test fun vec3_minus_operation() {
        val a: Vec3 = Triple(5f, 10f, 15f)
        val b: Vec3 = Triple(3f, 4f, 7f)
        val diff = a - b

        assertEquals(2f, diff.first)
        assertEquals(6f, diff.second)
        assertEquals(8f, diff.third)
    }

    @Test fun vec3_zero_vector_operations() {
        val zero: Vec3 = Triple(0f, 0f, 0f)
        val vec: Vec3 = Triple(1f, 2f, 3f)

        // Adding zero should not change vector
        val sum = vec + zero
        assertEquals(vec, sum)

        // Subtracting zero should not change vector
        val diff = vec - zero
        assertEquals(vec, diff)

        // Multiplying by zero should give zero
        val scaled = vec * 0f
        assertEquals(zero, scaled)

        // Distance from zero to zero should be zero
        val dist = zero.dist(zero)
        assertEquals(0f, dist)

        // Distance from vector to itself should be zero
        val selfDist = vec.dist(vec)
        assertEquals(0f, selfDist)
    }

    @Test fun vec3_negative_values() {
        val negVec: Vec3 = Triple(-1f, -2f, -3f)
        val posVec: Vec3 = Triple(1f, 2f, 3f)

        // Adding negative and positive should give zero
        val sum = negVec + posVec
        assertEquals(Triple(0f, 0f, 0f), sum)

        // Multiplying negative vector by -1 should make it positive
        val scaled = negVec * -1f
        assertEquals(posVec, scaled)

        // Distance should be same regardless of sign
        val dist1 = negVec.dist(Triple(0f, 0f, 0f))
        val dist2 = posVec.dist(Triple(0f, 0f, 0f))
        assertEquals(dist1, dist2)
    }

    @Test fun vec3_identity_operations() {
        val vec: Vec3 = Triple(3f, 4f, 5f)

        // Multiplying by 1 should not change vector
        val scaled = vec * 1f
        assertEquals(vec, scaled)

        // Adding zero vector should not change vector
        val zero: Vec3 = Triple(0f, 0f, 0f)
        val sum = vec + zero
        assertEquals(vec, sum)
    }

    @Test fun vec3_normalization() {
        val vec: Vec3 = Triple(3f, 4f, 0f)
        val normalized = vec.normalize()

        // Length of normalized vector should be 1 (or very close)
        val length = sqrt(normalized.first * normalized.first +
                         normalized.second * normalized.second +
                         normalized.third * normalized.third)
        assertTrue(kotlin.math.abs(length - 1f) < 0.0001f, "Normalized vector should have length 1")

        // Direction should be preserved
        val originalLength = sqrt(vec.first * vec.first + vec.second * vec.second + vec.third * vec.third)
        val expectedX = vec.first / originalLength
        val expectedY = vec.second / originalLength
        val expectedZ = vec.third / originalLength

        assertTrue(kotlin.math.abs(normalized.first - expectedX) < 0.0001f)
        assertTrue(kotlin.math.abs(normalized.second - expectedY) < 0.0001f)
        assertTrue(kotlin.math.abs(normalized.third - expectedZ) < 0.0001f)
    }

    @Test fun vec3_normalize_zero_vector() {
        val zero: Vec3 = Triple(0f, 0f, 0f)
        val normalized = zero.normalize()

        // Normalizing zero vector should return zero vector
        assertEquals(zero, normalized)
    }

    @Test fun vec3_normalize_unit_vector() {
        val unit: Vec3 = Triple(1f, 0f, 0f)
        val normalized = unit.normalize()

        // Normalizing unit vector should return same vector
        assertEquals(unit, normalized)
    }

    @Test fun vec3_large_values() {
        val largeVec: Vec3 = Triple(1e10f, -1e10f, 1e10f)
        val smallVec: Vec3 = Triple(1e-10f, -1e-10f, 1e-10f)

        // Operations should still work with large values
        val sum = largeVec + smallVec
        assertTrue(sum.first > 0f)
        assertTrue(sum.second < 0f)

        // Distance calculation should handle large values
        val dist = largeVec.dist(smallVec)
        assertTrue(dist > 0f)
    }

    @Test fun vec3_commutative_operations() {
        val a: Vec3 = Triple(1f, 2f, 3f)
        val b: Vec3 = Triple(4f, 5f, 6f)

        // Addition should be commutative
        val sum1 = a + b
        val sum2 = b + a
        assertEquals(sum1, sum2)

        // Distance should be symmetric
        val dist1 = a.dist(b)
        val dist2 = b.dist(a)
        assertEquals(dist1, dist2)
    }

    @Test fun vec3_associative_operations() {
        val a: Vec3 = Triple(1f, 2f, 3f)
        val b: Vec3 = Triple(4f, 5f, 6f)
        val c: Vec3 = Triple(7f, 8f, 9f)

        // Addition should be associative
        val sum1 = (a + b) + c
        val sum2 = a + (b + c)
        assertEquals(sum1, sum2)
    }

    @Test fun vec3_scalar_multiplication_distributive() {
        val vec: Vec3 = Triple(1f, 2f, 3f)
        val scalar1 = 2f
        val scalar2 = 3f

        // Scalar multiplication should be distributive over addition
        val result1 = vec * (scalar1 + scalar2)
        val result2 = (vec * scalar1) + (vec * scalar2)
        assertEquals(result1, result2)
    }
}
