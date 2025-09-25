# Instrucciones para actualizar las reglas de Firestore

## Problema actual:
El error "permission-denied" sugiere que las reglas de Firestore están bloqueando la creación de exerciseTemplates.

## Solución temporal (para debug):
1. Ve a Firebase Console: https://console.firebase.google.com/
2. Selecciona tu proyecto "gym-tracker-app-5714f"  
3. Ve a Firestore Database → Rules
4. Reemplaza las reglas actuales con estas **TEMPORALES**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // REGLAS TEMPORALES PARA DEBUG - NO USAR EN PRODUCCIÓN
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Haz clic en "Publish"

## Una vez que funcione, usar estas reglas de producción:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /routines/{routineId} {
      allow read, write, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }

    match /workoutSessions/{sessionId} {
      allow read, write, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }

    match /exerciseHistory/{historyId} {
      allow read, write, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }

    match /exerciseLogs/{logId} {
      allow read, write, delete: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }

    match /exerciseTemplates/{templateId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null 
        && request.auth.uid == resource.data.createdBy;
    }
  }
}
```

## Cambios realizados en el código:
1. ✅ Mejorado manejo de errores en ExerciseSelector
2. ✅ Añadido mensajes de error visibles al usuario
3. ✅ Añadido botón de cancelar en formulario personalizado
4. ✅ Añadido logging detallado para debug
5. ✅ Validación de usuario autenticado antes de crear template
6. ✅ Limpiar formulario después de creación exitosa

## Próximos pasos:
1. Actualizar reglas de Firestore (temporal)
2. Probar creación de ejercicios
3. Revisar logs en consola del navegador
4. Una vez funcionando, aplicar reglas de producción