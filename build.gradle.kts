plugins {
    kotlin("multiplatform") version "1.9.22"
    kotlin("plugin.serialization") version "1.9.22"
}

group = "com.rtsgame"
version = "1.0.0"

repositories {
    mavenCentral()
    google()
}

kotlin {
    jvm {
        compilations.all {
            kotlinOptions.jvmTarget = "17"
        }
        withJava()
    }
    
    js(IR) {
        browser {
            testTask {
                // If CHROME_BIN isn't set (no Chrome on CI/local), disable browser tests and rely on nodejs runner
                val chromeBin = System.getenv("CHROME_BIN")
                if (chromeBin == null) {
                    enabled = false
                } else {
                    useKarma {
                        useChromeHeadless()
                    }
                }
            }
        }
        nodejs()
    }
    
    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")
                implementation("org.jetbrains.kotlin:kotlin-reflect:1.9.22")
                
            }
        }
        
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
            }
        }
        
        val jvmMain by getting {
            dependencies {
                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.7.3")
            }
        }
        
        val jvmTest by getting
        
        val jsMain by getting
    }
}

// JVM target version
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

// Main application task
tasks.register<JavaExec>("runJvm") {
    group = "application"
    description = "Run the RTS game on JVM"
    classpath = kotlin.jvm().compilations.getByName("main").output.allOutputs +
                kotlin.jvm().compilations.getByName("main").runtimeDependencyFiles
    mainClass.set("rtsgame.RTSGameLauncherKt")
}