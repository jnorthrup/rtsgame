package rtsgame

import kotlinx.coroutines.*
import javax.swing.*
import java.awt.*
import java.awt.event.*
import rtsgame.core.*

actual fun platformMain() {
    println("🚀 Starting RTS Game on JVM")
    
    runBlocking {
        // Create and launch the game
        val launcher = RTSGameLauncher()
        
        // Create Swing window for the game
        SwingUtilities.invokeLater {
            createGameWindow(launcher)
        }
        
        // Keep running
        while (true) {
            delay(1000)
        }
    }
}

internal fun createGameWindow(launcher: RTSGameLauncher) {
    val frame = JFrame("RTS Game - JVM")
    frame.defaultCloseOperation = JFrame.EXIT_ON_CLOSE
    frame.setSize(1024, 768)
    frame.setLocationRelativeTo(null)
    
    val canvas = object : JPanel() {
        init {
            background = Color.BLACK
            preferredSize = Dimension(1024, 768)
            
            // Add mouse handling
            addMouseListener(object : MouseAdapter() {
                override fun mousePressed(e: MouseEvent) {
                    handleMouseClick(e.x.toFloat(), e.y.toFloat(), launcher)
                    repaint()
                }
                
                override fun mouseReleased(e: MouseEvent) {
                    handleMouseRelease(e.x.toFloat(), e.y.toFloat(), launcher)
                }
            })
            
            addMouseMotionListener(object : MouseMotionAdapter() {
                override fun mouseMoved(e: MouseEvent) {
                    handleMouseMove(e.x.toFloat(), e.y.toFloat(), launcher)
                }
            })
        }
        
        override fun paintComponent(g: Graphics) {
            super.paintComponent(g)
            val g2d = g as Graphics2D
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            
            // Render the game state
            renderGameState(g2d, launcher)
        }
    }
    
    frame.add(canvas)
    frame.isVisible = true
    
    // Start the game loop
    Timer(16) { // ~60 FPS
        canvas.repaint()
    }.start()
}

private fun handleMouseClick(x: Float, y: Float, launcher: RTSGameLauncher) {
    // Convert screen coordinates to world coordinates
    val worldX = x * 2f // Simple scaling
    val worldY = y * 2f

    // Issue move command to selected units (fire-and-forget coroutine)
    val selectedUnits = listOf(0) // TODO: Implement unit selection; EntityId is Int
    GlobalScope.launch {
        selectedUnits.forEach { id ->
            launcher.executeCommand(Cmd.Move(id, Vec3(worldX, worldY, 0f)))
        }
    }
}

private fun handleMouseRelease(x: Float, y: Float, launcher: RTSGameLauncher) {
    // Handle mouse release events
}

private fun handleMouseMove(x: Float, y: Float, launcher: RTSGameLauncher) {
    // Handle mouse movement events
}

private fun renderGameState(g2d: Graphics2D, launcher: RTSGameLauncher) {
    // Clear background
    g2d.color = Color(20, 20, 40)
    g2d.fillRect(0, 0, 1024, 768)

    // Render entities from the common World's structure
    val worldMap = launcher.world.value

    worldMap.forEach { (entityId, entity) ->
        val pos = entity["pos"] as? Pos
        val team = entity["team"] as? Team
        val type = entity["type"] as? String

        if (pos != null && team != null && type != null) {
            val screenX = (pos.vec.first / 2f).toInt()
            val screenY = (pos.vec.second / 2f).toInt()

            g2d.color = when (team.id) {
                1 -> Color.BLUE
                2 -> Color.RED
                else -> Color.GRAY
            }

            when (type) {
                "unit" -> g2d.fillOval(screenX - 5, screenY - 5, 10, 10)
                "building" -> g2d.fillRect(screenX - 8, screenY - 8, 16, 16)
                else -> g2d.fillOval(screenX - 3, screenY - 3, 6, 6)
            }

            g2d.color = Color.WHITE
            g2d.font = Font("Arial", Font.PLAIN, 10)
            g2d.drawString(type, screenX + 8, screenY)
        }
    }

    // Draw UI
    drawUI(g2d, launcher)
}

private fun drawUI(g2d: Graphics2D, launcher: RTSGameLauncher) {
    g2d.color = Color.WHITE
    g2d.font = Font("Arial", Font.BOLD, 14)
    
    val worldMap = launcher.world.value
    val stats = """
        Entities: ${worldMap.size}
        Tick: 0
        Update Time: 0ms
    """.trimIndent()
    
    val lines = stats.split("\n")
    lines.forEachIndexed { index, line ->
        g2d.drawString(line, 10, 20 + index * 20)
    }
}