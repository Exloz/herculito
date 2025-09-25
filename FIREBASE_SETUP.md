# 🔧 Configuración de Firebase Firestore

## ⚠️ Error de Permisos Solucionado

Si estás viendo errores de `permission-denied` en la consola, esto se debe a que Firebase necesita configurar índices compuestos para las consultas de la aplicación.

### 📋 Pasos para Solucionarlo:

#### 1. **Configurar Índices Compuestos**
Ve a la Firebase Console y configura los índices desde el archivo `firestore.indexes.json`:

```bash
# Si tienes Firebase CLI instalado
firebase deploy --only firestore:indexes
```

O manualmente en Firebase Console:
- Ve a **Firestore Database** → **Indexes**
- Crea un índice compuesto para la colección `exerciseLogs`:
  - Campo 1: `userId` (Ascending)
  - Campo 2: `date` (Ascending)

#### 2. **Verificar Reglas de Seguridad**
Las reglas en `firestore.rules` están configuradas correctamente, pero asegúrate de que estén desplegadas:

```bash
firebase deploy --only firestore:rules
```

#### 3. **Estado Temporal**
Mientras se configuran los índices, la aplicación:
- ✅ Permite crear y actualizar logs de ejercicios
- ⚠️ No carga logs existentes (temporal)
- ✅ Mantiene toda la funcionalidad de rutinas

### 🚀 Una vez Configurado:
- Los logs de ejercicios se cargarán en tiempo real
- No más errores en la consola
- Funcionalidad completa de tracking

### 🛠️ Alternativa Rápida:
Para desarrollo temporal, puedes usar reglas más permisivas:

```javascript
// SOLO PARA DESARROLLO - firestore.rules
match /exerciseLogs/{logId} {
  allow read, write: if request.auth != null;
}
```

**⚠️ No uses reglas permisivas en producción.**