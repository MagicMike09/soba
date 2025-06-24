# 🎬 Test et Debug des Animations Avatar 3D

## Étapes de Test

### 1. 📋 Vérifier les noms d'animations disponibles

Quand vous chargez votre avatar 3D, regardez la console du navigateur pour :

```
🎬 Available animations: ['Idle', 'Hello', 'Talk', 'Think', 'Bye']
```

### 2. 🎯 Mapper les actions Blender aux états

**Actions créées dans Blender :**
- `Idle` → État de repos (rien ne se passe)
- `Hello` → Début de conversation 
- `Talk` → L'IA parle
- `Think` → L'IA réfléchit
- `Bye` → Fin de conversation

**Mapping dans l'application :**
- `idle` → Animation "Idle"
- `hello` → Animation "Hello"  
- `talking` → Animation "Talk"
- `thinking` → Animation "Think"
- `bye` → Animation "Bye"

### 3. 🔍 Logs de Debug à surveiller

Dans la console, vous devriez voir :

```
🎬 Available animations: [noms des animations]
🎬 Playing default animation: Idle
🎬 Looking for animation state: hello
🎬 Selected animation: Hello for state: hello
🎬 AnimationService analyzing: assistant Bonjour ! Je vous écoute...
🎬 Assistant greeting → hello
```

### 4. ✅ Tests à effectuer

#### Test 1 : Début de conversation
1. Cliquer "Converser"
2. **Attendu :** Animation "Hello" pendant 2 secondes → puis "Idle"
3. **Console :** `🎬 Selected animation: Hello for state: hello`

#### Test 2 : L'IA répond
1. Dire quelque chose à l'IA
2. **Attendu :** Animation "Think" → puis "Talk" → puis "Idle"
3. **Console :** `🎬 Selected animation: Talk for state: talking`

#### Test 3 : Utilisateur parle
1. Pendant l'enregistrement vocal
2. **Attendu :** Animation "Idle" (avatar écoute)
3. **Console :** `🎬 Selected animation: Idle for state: idle`

#### Test 4 : Fin de conversation
1. Cliquer "Arrêter"
2. **Attendu :** Animation "Bye" pendant 3 secondes → puis "Idle"
3. **Console :** `🎬 Selected animation: Bye for state: bye`

### 5. 🛠️ Problèmes courants

#### Problème : Pas d'animation visible
**Cause :** Noms d'animations ne correspondent pas
**Solution :** Vérifier les noms exacts dans les logs `🎬 Available animations`

#### Problème : Animation bloquée
**Cause :** Erreur dans le fichier GLTF ou animation corrompue
**Solution :** Re-exporter depuis Blender avec les bonnes settings

#### Problème : Mauvaise animation
**Cause :** Mapping incorrect entre état et animation
**Solution :** Vérifier les logs `🎬 Selected animation` vs état demandé

### 6. 📝 Settings d'export Blender recommandées

```
Format: glTF 2.0 (.gltf + .bin + textures)
Include: 
- Meshes ✓
- Materials ✓  
- Images ✓
- Animations ✓
- Apply Modifiers ✓

Animation:
- Use Current Frame ✗
- Export all actions ✓
- NLA Strips ✗
- Force Sample Animations ✓
```

### 7. 🔧 Debug avancé

Si les animations ne fonctionnent toujours pas, ajoutez temporairement ce code dans Avatar3D.tsx après le chargement :

```javascript
// Debug des animations
console.log('All animations details:')
gltf.animations.forEach((clip, index) => {
  console.log(`${index}: "${clip.name}" - Duration: ${clip.duration}s - Tracks: ${clip.tracks.length}`)
})
```

Cela vous donnera le détail complet de chaque animation disponible.