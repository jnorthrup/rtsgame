package com.rtsgame.trikeshed

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Tests for TrikeShed core data structures to verify the architecture conversion
 * from TypeScript to Kotlin maintains functional correctness.
 */
class TrikeShedTest {

    @Test
    fun testJoinBasicOperations() {
        // Test basic Join creation and access
        val gameCoords = 100.0 j 200.0
        assertEquals(100.0, gameCoords.a)
        assertEquals(200.0, gameCoords.b)
        assertEquals(100.0, first(gameCoords))
        assertEquals(200.0, second(gameCoords))
    }

    @Test
    fun testJoinDestructuring() {
        // Test Kotlin destructuring
        val worldSize = 1000.0 j 1000.0
        val (width, height) = worldSize
        assertEquals(1000.0, width)
        assertEquals(1000.0, height)
    }

    @Test
    fun testSeriesOperations() {
        // Test Series creation and indexing
        val unitNames = seriesOf(3) { index -> "Unit-${index + 1}" }
        assertEquals(3, size(unitNames))
        assertEquals("Unit-1", unitNames[0])
        assertEquals("Unit-2", unitNames[1])
        assertEquals("Unit-3", unitNames[2])
    }

    @Test
    fun testSeriesFunctionalOperations() {
        // Test Series mapping and conversion to list
        val numbers = seriesOf(5) { it * 2 }  // [0, 2, 4, 6, 8]
        val doubled = numbers.map { it * 2 }  // [0, 4, 8, 12, 16]
        
        assertEquals(listOf(0, 4, 8, 12, 16), doubled.toList())
    }

    @Test
    fun testTensorCreationAndAccess() {
        // Test 2D tensor creation and coordinate access
        val battlefield = tensorOf(listOf(2, 2)) { coords ->
            "Sector(${coords[0]},${coords[1]})"
        }
        
        assertEquals("Sector(0,0)", battlefield[0, 0])
        assertEquals("Sector(0,1)", battlefield[0, 1])
        assertEquals("Sector(1,0)", battlefield[1, 0])
        assertEquals("Sector(1,1)", battlefield[1, 1])
        assertEquals(4, battlefield.size)
        assertEquals(2, battlefield.rank)
    }

    @Test
    fun testTensorMapping() {
        // Test tensor functional operations
        val numbers = tensorOf(listOf(2, 2), listOf(1, 2, 3, 4))
        val doubled = numbers.map { it * 2 }
        
        assertEquals(2, doubled[0, 0])
        assertEquals(4, doubled[0, 1])
        assertEquals(6, doubled[1, 0])
        assertEquals(8, doubled[1, 1])
    }

    @Test
    fun testGameModelIntegration() {
        // Test that TrikeShed structures work with game model
        val worldSize = 1000.0 j 1000.0
        val position = com.rtsgame.core.Position(worldSize.a / 2, worldSize.b / 2)
        
        assertEquals(500.0, position.x)
        assertEquals(500.0, position.y)
    }

    @Test
    fun testImmutability() {
        // Test that Join creates new instances on modifications
        val original = 10 j 20
        val modified = original.mapFirst { it * 2 }
        
        assertEquals(10, original.a)
        assertEquals(20, modified.a)
        assertEquals(20, original.b)
        assertEquals(20, modified.b)
    }
}