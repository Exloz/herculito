# Configuración de Firebase para CityGym

## Estado Actual
La aplicación está configurada con una versión simplificada que funciona sin índices complejos de Firebase. Los logs de ejercicios se manejan localmente y se sincronizan con Firebase de forma individual.

## Pasos para Configuración Completa

### 1. Implementar Índices de Firebase

Para habilitar consultas complejas, necesitas implementar los índices definidos en `firestore.indexes.json`:

```bash
# Instalar Firebase CLI si no lo tienes
npm install -g firebase-tools

# Autenticarse con Firebase
firebase login

# Desde el directorio del proyecto, implementar los índices
firebase deploy --only firestore:indexes
```

### 2. Verificar Reglas de Seguridad

Asegúrate de que las reglas de Firestore permitan las consultas. En la consola de Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso a workouts
    match /workouts/{document=**} {
      allow read, write: if true;
    }
    
    // Permitir acceso a exerciseLogs
    match /exerciseLogs/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 3. Actualizar Hook para Consultas Completas

Una vez implementados los índices, puedes restaurar las consultas completas en `useWorkouts.ts`:

```typescript
useEffect(() => {
  if (!userId) {
    setLoading(false);
    return;
  }

  // Consulta con índice compuesto: userId + date
  const q = query(
    collection(db, 'exerciseLogs'),
    where('userId', '==', userId),
    where('date', '==', date)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const exerciseLogs: ExerciseLog[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ExerciseLog[];
    
    setLogs(exerciseLogs);
    setLoading(false);
  }, (error) => {
    console.error('Error fetching exercise logs:', error);
    setLogs([]);
    setLoading(false);
  });

  return () => unsubscribe();
}, [date, userId]);
```

## Estado de Funcionalidad

### ✅ Funcionando Actualmente
- Interfaz de seguimiento de entrenamientos (`ActiveWorkout`)
- Tarjetas de ejercicios (`ExerciseCard`) 
- Timer de entrenamientos
- Cálculo de progreso
- Actualización de pesos y series
- Estado local sincronizado

### ⏳ Pendiente (requiere índices)
- Consultas en tiempo real de Firebase
- Persistencia completa entre sesiones
- Historial de entrenamientos
- Sincronización entre múltiples dispositivos

### 🔧 Configuración de Producción
- Variables de entorno de Firebase configuradas
- Docker optimizado para producción
- Nginx con configuración SPA
- Build optimizado con Vite

## Siguientes Pasos

1. **Implementar índices de Firebase** usando el comando anterior
2. **Probar consultas complejas** en la consola de Firebase
3. **Restaurar hook completo** con consultas en tiempo real
4. **Probar funcionalidad completa** con múltiples usuarios
5. **Implementar en producción** con Docker/Dockploy

La aplicación está completamente funcional para uso local y testing. Solo necesita la configuración de índices para funcionalidad completa en producción.