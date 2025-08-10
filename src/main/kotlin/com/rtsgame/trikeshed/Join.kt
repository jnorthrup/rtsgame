package com.rtsgame.trikeshed

/**
 * Creates a Join instance using infix notation.
 * Kotlin's infix fun provides similar convenience to TypeScript's functional syntax.
 */
infix fun <A, B> A.j(b: B): Join<A, B> = Join(this, b)

/**
 * Creates a Join instance using regular function call syntax.
 */
fun <A, B> join(firstParam: A, secondParam: B): Join<A, B> = Join(firstParam, secondParam)

/**
 * Accessor for the first element of a Join.
 */
fun <A, B> first(join: Join<A, B>): A = join.a

/**
 * Accessor for the second element of a Join.
 */
fun <A, B> second(join: Join<A, B>): B = join.b

/**
 * Factory function to create a Twin from a single value.
 */
fun <T> twin(value: T): Twin<T> = join(value, value)

/**
 * Creates a lazy supplier (a lambda with no arguments) that returns `this` value.
 */
fun <T> leftIdentity(value: T): () -> T = { value }

/**
 * Syntactic sugar for leftIdentity.
 */
fun <T> circularRef(value: T): () -> T = leftIdentity(value)

/**
 * Extension function to get the first element directly from a Join.
 */
val <A, B> Join<A, B>.first: A get() = a

/**
 * Extension function to get the second element directly from a Join.
 */
val <A, B> Join<A, B>.second: B get() = b

/**
 * Destructuring component functions for Join (enables destructuring assignment).
 */
operator fun <A, B> Join<A, B>.component1(): A = a
operator fun <A, B> Join<A, B>.component2(): B = b

/**
 * Map function for transforming the first element of a Join.
 */
fun <A, B, C> Join<A, B>.mapFirst(transform: (A) -> C): Join<C, B> = 
    Join(transform(a), b)

/**
 * Map function for transforming the second element of a Join.
 */
fun <A, B, C> Join<A, B>.mapSecond(transform: (B) -> C): Join<A, C> = 
    Join(a, transform(b))

/**
 * Map function for transforming both elements of a Join.
 */
fun <A, B, C, D> Join<A, B>.map(
    transformFirst: (A) -> C,
    transformSecond: (B) -> D
): Join<C, D> = Join(transformFirst(a), transformSecond(b))