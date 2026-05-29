# Extensions & Helpers

## Overview

Utility classes, extension methods, enums, data structures, and support types. These provide common functionality used throughout The Escapists 2 codebase.

---

## Extension Methods

Namespace: `ExtensionMethods`

16 static extension classes providing convenience methods on core Unity and .NET types.

### ListExtensions.cs

`Assembly-CSharp/ExtensionMethods/ListExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static bool IsValidIndex<T>(this List<T> list, int index)` | Returns true if index is within bounds |

---

### Matrix4x4Extensions.cs

`Assembly-CSharp/ExtensionMethods/Matrix4x4Extensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Vector3 GetPosition(this Matrix4x4 matrix)` | Extracts translation component |
| `static Quaternion GetRotation(this Matrix4x4 matrix)` | Extracts rotation component |
| `static Vector3 GetScale(this Matrix4x4 matrix)` | Extracts scale component |

---

### Vector4Extensions.cs

`Assembly-CSharp/ExtensionMethods/Vector4Extensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Vector2 ToVector2(this Vector4 v)` | Converts to Vector2 (x, y) |
| `static Vector3 ToVector3(this Vector4 v)` | Converts to Vector3 (x, y, z) |

---

### FloatExtensions.cs

`Assembly-CSharp/ExtensionMethods/FloatExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static float Remap(this float value, float from1, float to1, float from2, float to2)` | Maps value from one range to another |
| `static float Clamp(this float value, float min, float max)` | Clamps value |
| `static bool Approximately(this float a, float b, float tolerance = 0.0001f)` | Approximate equality check |

---

### RectExtensions.cs

`Assembly-CSharp/ExtensionMethods/RectExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Vector2 GetRandomPoint(this Rect rect)` | Returns random point within rect |
| `static Rect Inflate(this Rect rect, float amount)` | Expands rect by amount on all sides |

---

### TypeExtensions.cs

`Assembly-CSharp/ExtensionMethods/TypeExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static bool ImplementsInterface<T>(this Type type)` | Checks if type implements interface T |
| `static bool IsSubclassOfGeneric(this Type type, Type genericType)` | Checks for generic subclass |

---

### MonoBehaviorExtensions.cs

`Assembly-CSharp/ExtensionMethods/MonoBehaviorExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static T GetOrAddComponent<T>(this MonoBehaviour mb)` where T : Component | Gets or adds component of type T |
| `static Coroutine Invoke(this MonoBehaviour mb, Action action, float delay)` | Invokes action after delay |

---

### PhotonViewExtensions.cs

`Assembly-CSharp/ExtensionMethods/PhotonViewExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static bool IsMine(this PhotonView view)` | Checks if view is owned by local player |

---

### Vector3Extensions.cs

`Assembly-CSharp/ExtensionMethods/Vector3Extensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Vector2 ToVector2(this Vector3 v)` | Converts to Vector2 (x, y) |
| `static Vector3 WithX(this Vector3 v, float x)` | Returns copy with new x |
| `static Vector3 WithY(this Vector3 v, float y)` | Returns copy with new y |
| `static Vector3 WithZ(this Vector3 v, float z)` | Returns copy with new z |
| `static Vector3 AddX(this Vector3 v, float x)` | Returns copy with x added |
| `static Vector3 AddY(this Vector3 v, float y)` | Returns copy with y added |
| `static Vector3 AddZ(this Vector3 v, float z)` | Returns copy with z added |
| `static float Distance2D(this Vector3 a, Vector3 b)` | XY plane distance ignoring Z |
| `static float SqrDistance2D(this Vector3 a, Vector3 b)` | Squared XY distance |
| `static float DistanceXZ(this Vector3 a, Vector3 b)` | XZ plane distance ignoring Y |
| `static float SqrDistanceXZ(this Vector3 a, Vector3 b)` | Squared XZ distance |
| `static Vector3 DirectionTo(this Vector3 from, Vector3 to)` | Normalised direction vector |
| `static float AngleDeg2D(this Vector3 from, Vector3 to)` | Angle in degrees on XY plane |
| `static Vector3 Rotate2D(this Vector3 v, float angleDeg)` | Rotates vector by angle on XY plane |
| `static Vector3 ClampMagnitude(this Vector3 v, float maxLength)` | Clamps magnitude |
| `static Vector3 Clamp(this Vector3 v, Vector3 min, Vector3 max)` | Per-component clamp |
| `static Vector3 RoundToInt(this Vector3 v)` | Rounds each component to int |
| `static Vector3 FloorToInt(this Vector3 v)` | Floors each component to int |
| `static Vector3 CeilToInt(this Vector3 v)` | Ceils each component to int |
| `static bool IsWithinDistance(this Vector3 a, Vector3 b, float distance)` | Distance check |
| `static Vector3 InverseDirection(this Vector3 v)` | Negates the vector |
| `static Vector3 MidPoint(this Vector3 a, Vector3 b)` | Returns midpoint |
| `static Vector3 RandomDirection()` | Returns random unit vector |
| `static Vector3 SmoothDamp(this Vector3 current, Vector3 target, ref Vector3 velocity, float smoothTime, float maxSpeed, float deltaTime)` | Smooth damp |

---

### ColorExtensions.cs

`Assembly-CSharp/ExtensionMethods/ColorExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Color WithR(this Color c, float r)` | Returns copy with new r |
| `static Color WithG(this Color c, float g)` | Returns copy with new g |
| `static Color WithB(this Color c, float b)` | Returns copy with new b |
| `static Color WithA(this Color c, float a)` | Returns copy with new a |
| `static Color FromHex(string hex)` | Parses hex colour string |

---

### ComponentExtensions.cs

`Assembly-CSharp/ExtensionMethods/ComponentExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static T GetOrAddComponent<T>(this Component comp)` where T : Component | Gets or adds component |

---

### GameObjectExtensions.cs

`Assembly-CSharp/ExtensionMethods/GameObjectExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static T GetOrAddComponent<T>(this GameObject go)` where T : Component | Gets or adds component |
| `static void SetLayerRecursively(this GameObject go, int layer)` | Sets layer on self and children |
| `static void DestroyChildren(this GameObject go)` | Destroys all child GameObjects |
| `static T GetComponentInParentExcluding<T>(this GameObject go, GameObject exclude)` where T : Component | Finds component in parent chain excluding a specific object |
| `static T GetComponentInChildrenIncludeInactive<T>(this GameObject go) where T : Component` | Finds component including inactive children |

---

### EnumExtensions.cs

`Assembly-CSharp/ExtensionMethods/EnumExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static bool HasFlag<T>(this T enumValue, T flag) where T : Enum` | Checks if flag is set |
| `static T[] GetFlags<T>(this T enumValue) where T : Enum` | Returns array of set flags |
| `static string ToStringCached<T>(this T enumValue) where T : Enum` | Cached string representation |

---

### TriangleMeshNodeExtensions.cs

`Assembly-CSharp/ExtensionMethods/TriangleMeshNodeExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Vector3 GetVertex(this TriangleMeshNode node, int index)` | Gets vertex position |
| `static int[] GetTriangles(this TriangleMeshNode node)` | Gets triangle indices |

---

### TransformExtensions.cs

`Assembly-CSharp/ExtensionMethods/TransformExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static void Reset(this Transform t)` | Resets position, rotation, scale to identity |
| `static void SetX(this Transform t, float x)` | Sets localPosition.x |
| `static void SetY(this Transform t, float y)` | Sets localPosition.y |
| `static void SetZ(this Transform t, float z)` | Sets localPosition.z |
| `static Transform FindChildByName(this Transform t, string name)` | Finds child by name (recursive) |
| `static Transform[] GetChildren(this Transform t)` | Returns all direct children |
| `static void DestroyAllChildren(this Transform t)` | Destroys all child GameObjects |
| `static void LookAt2D(this Transform t, Vector2 target)` | Rotates to face target on XY plane |

---

### ConstantsExtensions.cs

`Assembly-CSharp/ExtensionMethods/ConstantsExtensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static string GetStringValue(this Enum value)` | Returns string from `StringValueAttribute` if present |

---

## Helper Classes

### Helpers.cs

`Assembly-CSharp/Helpers.cs`

General-purpose static utility methods.

**Methods**

| Signature | Description |
|---|---|
| `static bool IsInFrontEndScene()` | Checks if current scene is frontend |
| `static bool IsInGameplayScene()` | Checks if current scene is a level |
| `static bool IsInResultsScene()` | Checks if current scene is results |
| `static T RandomElement<T>(this IList<T> list)` | Returns random element |
| `static void Shuffle<T>(this IList<T> list)` | Fisher-Yates shuffle |
| `static string Truncate(string value, int maxLength)` | Truncates string with "..." |
| `static Vector3[] GetCorners(Bounds bounds)` | Returns 8 corner points of bounds |
| `static Bounds Encapsulate(Bounds a, Bounds b)` | Combines two bounds |
| `static float NormaliseAngle(float angle)` | Normalises to 0–360 range |
| `static float SignedAngle(Vector2 from, Vector2 to)` | Signed angle between vectors |

---

### EnumHelpers.cs

`Assembly-CSharp/EnumHelpers.cs`

**Methods**

| Signature | Description |
|---|---|
| `static string EnumToString<T>(T value) where T : Enum` | Cached enum to string conversion |
| `static T ParseEnum<T>(string value) where T : struct` | Parses string to enum |
| `static T[] GetEnumValues<T>() where T : Enum` | Returns all enum values |

---

### StaticExtensionMethods.cs

`Assembly-CSharp/StaticExtensionMethods.cs`

**Methods**

| Signature | Description |
|---|---|
| `static void MoveToLayer(this Transform transform, int layer)` | Moves transform and children to layer |
| `static T[] GetEnumValues<T>()` | Wraps `Enum.GetValues` |
| `static string GetEnumName<T>(T value)` | Wraps `Enum.GetName` |

---

### GameObjectExtensions.cs

`Assembly-CSharp/GameObjectExtensions.cs`

(Same as ExtensionMethods variant — may be a duplicate or older version.)

**Methods**

| Signature | Description |
|---|---|
| `static T GetOrAddComponent<T>(this GameObject go)` where T : Component | Gets or adds component |
| `static void SetLayerRecursively(this GameObject go, int layer)` | Sets layer on self and children |

---

### EnumCacheContiguous.cs

`Assembly-CSharp/EnumCacheContiguous.cs`

Caches string representations of contiguous enums (0, 1, 2, ...).

**Generic:** `EnumCacheContiguous<T>` where `T : Enum`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `string[]` | `Names` | Cached name array |
| `public static` | `T[]` | `Values` | Cached value array |
| `public static` | `int` | `Length` | Number of enum values |

---

### EnumCacheSlow.cs

`Assembly-CSharp/EnumCacheSlow.cs`

Caches string representations of non-contiguous enums.

**Generic:** `EnumCacheSlow<T>` where `T : Enum`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `Dictionary<T, string>` | `Names` | Value-to-name cache |

---

### EnumFlagAttribute.cs

`Assembly-CSharp/EnumFlagAttribute.cs`

**Inherits:** `PropertyAttribute`

Custom attribute for flag enum display in the Unity inspector.

---

### FindExtention.cs

`Assembly-CSharp/FindExtention.cs`

**Methods**

| Signature | Description |
|---|---|
| `static T FindObjectOfType<T>(bool includeInactive = false) where T : Component` | Finds component including inactive GameObjects |

---

### TimeHelper.cs

`Assembly-CSharp/TimeHelper.cs`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `float` | `GameTimeScale` | Current game time scale |
| `public static` | `float` | `DeltaTime` | Scaled delta time |
| `public static` | `float` | `FixedDeltaTime` | Scaled fixed delta time |

**Methods**

| Signature | Description |
|---|---|
| `static void SetTimeScale(float scale)` | Sets time scale |
| `static float GetGameTime()` | Returns elapsed game time |

---

### LayerHelper.cs

`Assembly-CSharp/LayerHelper.cs`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `int` | `Default` | Default layer index |
| `public static` | `int` | `Character` | Character layer index |
| `public static` | `int` | `InteractiveObject` | Interactive object layer index |
| `public static` | `int` | `Wall` | Wall layer index |
| `public static` | `int` | `Floor` | Floor layer index |

**Methods**

| Signature | Description |
|---|---|
| `static bool IsInLayer(GameObject go, int layer)` | Checks if GameObject is on layer |
| `static void SetLayer(GameObject go, int layer, bool recursive = false)` | Sets layer on GameObject |

---

### NavigationHelper.cs

`Assembly-CSharp/NavigationHelper.cs`

**Methods**

| Signature | Description |
|---|---|
| `static Vector3 GetNearestNavMeshPoint(Vector3 position, float maxDistance)` | Samples nearest NavMesh position |
| `static bool IsPointOnNavMesh(Vector3 position)` | Checks if position is on NavMesh |
| `static float GetPathLength(Vector3 start, Vector3 end)` | Returns path distance |

---

### Extensions.cs

`Assembly-CSharp/Extensions.cs`

**Methods**

| Signature | Description |
|---|---|
| `static bool IsNullOrEmpty<T>(this ICollection<T> collection)` | Checks for null or empty |
| `static T RandomElement<T>(this IEnumerable<T> enumerable)` | Returns random element |
| `static IEnumerable<T> ForEach<T>(this IEnumerable<T> enumerable, Action<T> action)` | Iterates with action |

---

### NumberToStringCache.cs

`Assembly-CSharp/NumberToStringCache.cs`

Caches string representations of integers to reduce allocations.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `string[]` | `Cache` | Pre-allocated string array |

**Methods**

| Signature | Description |
|---|---|
| `static string Get(int value)` | Returns cached string or allocates new |

---

### PrimeList.cs

`Assembly-CSharp/PrimeList.cs`

Pre-computed prime number list used by `PRNG`.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `int` | `ListLength` | Number of primes in array |
| `public static` | `uint[]` | `PrimeListArray` | Array of prime numbers |

---

## Data Structures

### PRNG.cs

`Assembly-CSharp/PRNG.cs`

Pseudo-random number generator using the Blum-Blum-Shub algorithm with prime modulus.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `private` | `uint` | `m_ClosestPrime` | Closest prime < max (default: 4294967291) |
| `private` | `uint` | `m_Max` | Exclusive upper bound |
| `private` | `ulong` | `m_Seed` | Current seed value |
| `private` | `uint` | `m_InitialSeed` | Original seed for reset |
| `private` | `bool` | `m_bHasLoopedAround` | Whether sequence has repeated |

**Methods**

| Signature | Description |
|---|---|
| `PRNG(uint max, uint seed)` | Constructs with bound and seed |
| `uint GetNextRandom()` | Returns next random value (seed² mod closestPrime, mirrored if seed > half) |
| `void Reset()` | Resets to initial seed |
| `bool HasLooped()` | Returns loop flag |
| `void SetSeed(uint seed)` | Sets new seed |
| `void SetCeiling(uint ceil)` | Sets new max, recomputes closest prime |
| `static uint FindClosestPrime(uint max)` | Binary search in `PrimeList` |

**Algorithm:** For max ≤ 2, returns descending from max. Otherwise uses `seed² mod closestPrime` (mirrored when seed > closestPrime/2). When seed wraps past max, resets to 0.

---

### Pair.cs

`Assembly-CSharp/Pair.cs`

**Generic:** `struct Pair<T>`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `T` | `ValueOne` | First value |
| `public` | `T` | `ValueTwo` | Second value |

**Methods**

| Signature | Description |
|---|---|
| `bool ValuesEqual(Pair<T> other)` | Checks if both values equal the other pair's values |

---

### PooledObject.cs

`Assembly-CSharp/PooledObject.cs`

**Generic:** `class PooledObject<T> : IDisposable` where `T : PooledObject<T>, new()`

Object pooling base class using `StaticObjectPool`. Thread-safe via `Interlocked`.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `private` | `int` | `disposed` | Disposed flag (1 = not disposed, 0 = disposed) |

**Methods**

| Signature | Description |
|---|---|
| `static T GetInstance()` | Pops from pool or creates new; sets disposed = 1 |
| `void Dispose()` | If not already disposed, atomically pushes back to pool |
| `~PooledObject()` | Finaliser calls `Dispose()` |

---

### StaticObjectPool.cs

`Assembly-CSharp/StaticObjectPool.cs`

**Internal static** thread-safe generic object pool.

**Nested class:** `Pool<T>` — uses `Stack<T>` with `lock` for thread safety.

**Methods**

| Signature | Description |
|---|---|
| `static void Push<T>(T obj)` | Pushes object to pool of type T |
| `static bool TryPop<T>(out T obj)` | Tries to pop; returns false if empty |
| `static T PopOrDefault<T>()` | Pops or returns default |
| `static T PopOrNew<T>()` where T : new() | Pops or creates new instance |

---

## Direction System

### Direction.cs

`Assembly-CSharp/Direction.cs`

Static direction utilities for 4-way and 8-way movement systems.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public static` | `Vector3` | `m_vDown` | `Vector2.down` |
| `public static` | `Vector3` | `m_vRight` | `Vector2.right` |
| `public static` | `Vector3` | `m_vUp` | `Vector2.up` |
| `public static` | `Vector3` | `m_vLeft` | `Vector2.left` |
| `public static` | `Vector3` | `m_vDownRight` | `(down + right).normalized` |
| `public static` | `Vector3` | `m_vUpRight` | `(up + right).normalized` |
| `public static` | `Vector3` | `m_vDownLeft` | `(down + left).normalized` |
| `public static` | `Vector3` | `m_vUpLeft` | `(up + left).normalized` |
| `public static` | `Quaternion` | `m_rotationRight` | Euler(0, 90, 0) |
| `public static` | `Quaternion` | `m_rotationDown` | Euler(90, 90, 0) |
| `public static` | `Quaternion` | `m_rotationLeft` | Euler(180, 90, 0) |
| `public static` | `Quaternion` | `m_rotationUp` | Euler(270, 90, 0) |
| `public static` | `Quaternion` | `m_rotationDownRight` | Euler(45, 90, 0) |
| `public static` | `Quaternion` | `m_rotationDownLeft` | Euler(135, 90, 0) |
| `public static` | `Quaternion` | `m_rotationUpLeft` | Euler(225, 90, 0) |
| `public static` | `Quaternion` | `m_rotationUpRight` | Euler(315, 90, 0) |
| `public static` | `Directionx8[]` | `AllDirections` | [Up, UpLeft, Left, DownLeft, Down, DownRight, Right, UpRight] |
| `public static` | `Directionx8[]` | `FourDirections` | [Up, Left, Down, Right] |

**Methods**

| Signature | Description |
|---|---|
| `static Vector3 DirectionToVector(Directionx4 direction)` | Maps Directionx4 to Vector3 |
| `static Vector3 DirectionToVector(Directionx8 direction)` | Maps Directionx8 to Vector3 |
| `static Directionx8 VectorToNearestDirection(Vector2 directionVector)` | Finds closest of all 8 directions |
| `static Directionx4 VectorToNearestDirectionx4(Vector2 directionVector)` | Finds closest of 4 directions |
| `static Directionx8 VectorToNearestDirection(Vector2 directionVector, Directionx8[] validDirections)` | Finds closest from subset |
| `static Quaternion DirectionToRotation(Directionx4 direction)` | Maps Directionx4 to Quaternion |
| `static Quaternion DirectionToRotation(Directionx8 direction)` | Maps Directionx8 to Quaternion |

---

### Directionx4.cs

`Assembly-CSharp/Directionx4.cs`

**Enum : byte**

| Member | Value |
|---|---|
| `Up` | 0 |
| `Left` | 2 |
| `Down` | 4 |
| `Right` | 6 |

---

### Directionx8.cs

`Assembly-CSharp/Directionx8.cs`

**Enum : byte**

| Member | Value |
|---|---|
| `Up` | 0 |
| `UpLeft` | 1 |
| `Left` | 2 |
| `DownLeft` | 3 |
| `Down` | 4 |
| `DownRight` | 5 |
| `Right` | 6 |
| `UpRight` | 7 |

---

### FacingDirectionIncInvalid.cs

`Assembly-CSharp/FacingDirectionIncInvalid.cs`

**Enum**

| Member | Value |
|---|---|
| `Invalid` | 0 |
| `Up` | 1 |
| `Left` | 3 |
| `Down` | 5 |
| `Right` | 7 |

Values are odd (1, 3, 5, 7) with 0 reserved for invalid, matching Directionx4 values +1.

---

### FaceDirection.cs

`Assembly-CSharp/FaceDirection.cs`

NodeCanvas `ActionTask` for setting character facing direction.

**Inherits:** `ActionTask<AICharacter>`

**Category:** `[Category("★T17 Action")]`

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `BBParameter<int>` | `m_FourWayFaceDirection` | Direction value cast from Directionx4 |

**Properties**

| Name | Description |
|---|---|
| `info` | Returns `"Face: " + direction name` |

**Methods**

| Signature | Description |
|---|---|
| `OnInit()` | Base call |
| `OnExecute()` | Sets `agent.m_Character.SetFaceDirection((FacingDirectionIncInvalid)value)` |
| `OnUpdate()` | Calls `EndAction(true)` |

---

## Subdirectory Helpers

### BitField.cs

`Assembly-CSharp/SaveHelpers/BitField.cs`

Namespace: `SaveHelpers`

Bitfield data structure for compact boolean storage.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `private` | `uint[]` | `m_Bits` | Internal bit storage |

**Methods**

| Signature | Description |
|---|---|
| `BitField(int bitCount)` | Constructs with enough uints to hold bitCount bits |
| `bool GetBit(int index)` | Gets bit at index |
| `void SetBit(int index, bool value)` | Sets bit at index |
| `void Clear()` | Clears all bits |
| `uint[] GetRawData()` | Returns raw uint array |
| `void SetRawData(uint[] data)` | Sets raw uint array |

---

### ByteArrayConversion.cs

`Assembly-CSharp/DataHelpers/ByteArrayConversion.cs`

Namespace: `DataHelpers`

**Methods**

| Signature | Description |
|---|---|
| `static byte[] ToByteArray<T>(T[] array)` where T : struct | Converts struct array to byte array |
| `static T[] FromByteArray<T>(byte[] bytes) where T : struct` | Converts byte array to struct array |
| `static byte[] ObjectToByteArray(object obj)` | Serialises object to bytes via BinaryFormatter |
| `static object ByteArrayToObject(byte[] bytes)` | Deserialises bytes to object |

---

### FloatIntConversion.cs

`Assembly-CSharp/DataHelpers/FloatIntConversion.cs`

Namespace: `DataHelpers`

**Methods**

| Signature | Description |
|---|---|
| `static int FloatToInt(float value, float multiplier)` | `Mathf.RoundToInt(value * multiplier)` |
| `static float IntToFloat(int value, float multiplier)` | `value / multiplier` |

---

### Events.cs

`Assembly-CSharp/DataPlatform/Events.cs`

Namespace: `DataPlatform`

**Enum: EventType**

| Member | Description |
|---|---|
| `Custom` | Custom event |
| `LevelStart` | Level started |
| `LevelComplete` | Level completed |
| `LevelFail` | Level failed |
| `ItemCollected` | Item collected |
| `ItemCrafted` | Item crafted |
| `CombatEvent` | Combat occurred |

**Class: EventData**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `EventType` | `Type` | Event type |
| `public` | `string` | `Name` | Event name |
| `public` | `Dictionary<string, object>` | `Parameters` | Event parameters |

---

### LOADSTATE.cs

`Assembly-CSharp/NetworkLoadable/LOADSTATE.cs`

Namespace: `NetworkLoadable`

**Enum**

| Member | Description |
|---|---|
| `NotLoaded` | Not yet loaded |
| `Loading` | Currently loading |
| `Loaded` | Load complete |
| `Error` | Load failed |

---

## Other Types

### Rock.cs

`Assembly-CSharp/Rock.cs`

**Inherits:** `MonoBehaviour`

Decorative rock prop with random material selection and hole detection.

**Fields**

| Visibility | Type | Name | Description |
|---|---|---|---|
| `public` | `Material[]` | `m_RandomMaterials` | Materials for random selection |
| `private` | `bool` | `m_RandomlySpawned` | Whether spawned randomly |
| `private` | `int` | `m_TileRow` | Tile row position |
| `private` | `int` | `m_TileColumn` | Tile column position |
| `private` | `int` | `m_TileFloor` | Floor index |

**Properties**

| Name | Type | Description |
|---|---|---|
| `TileRow` | `int` | Tile row |
| `TileColumn` | `int` | Tile column |
| `TileFloor` | `int` | Floor index |
| `RandomlySpawned` | `bool` | Random spawn flag |

**Methods**

| Signature | Description |
|---|---|
| `void Start()` | Finds floor/tile position, registers with `FloorManager`, z-offsets, checks for hole underneath, sets random material, adds to culling |
| `void OnDestroy()` | Removes from culling bucket |
| `void SetMaterial()` | Assigns random material from array to MeshRenderer |
