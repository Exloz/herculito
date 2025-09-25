# HERCULITO - App de Seguimiento de Entrenamientos

Una aplicación React moderna para trackear entrenamientos en el gimnasio con autenticación Google y sincronización en tiempo real.

## 🚀 Características

- **🔐 Autenticación con Google**: Inicio de sesión seguro y fácil
- **🎯 Sistema de Rutinas Flexible**: Crea rutinas personalizadas con ejercicios específicos
- **📊 Seguimiento Inteligente**: Registra pesos, series y repeticiones con historial
- **🔄 Sincronización en Tiempo Real**: Datos actualizados instantáneamente via Firebase  
- **⏱️ Timer de Descanso**: Controla los tiempos entre series automáticamente
- **📈 Historial de Progreso**: Ve tu progreso y récords personales
- **📱 Diseño Responsive**: Optimizado para móviles y desktop
- **🌙 Tema Oscuro**: Interface moderna y cómoda para los ojos
- **💾 Sesiones de Entrenamiento**: Registra cada sesión con fecha, duración y notas

## 🔧 Configuración de Firebase

### Variables de Entorno

Este proyecto utiliza variables de entorno para mantener seguras las credenciales de Firebase.

#### Configuración Inicial

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Reemplaza los valores de ejemplo con tus credenciales reales de Firebase:
   - `VITE_FIREBASE_API_KEY`: Tu API Key de Firebase
   - `VITE_FIREBASE_AUTH_DOMAIN`: El dominio de autenticación de tu proyecto
   - `VITE_FIREBASE_PROJECT_ID`: El ID de tu proyecto de Firebase
   - `VITE_FIREBASE_STORAGE_BUCKET`: El bucket de almacenamiento
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: El ID del sender para messaging
   - `VITE_FIREBASE_APP_ID`: El ID de la aplicación
   - `VITE_FIREBASE_MEASUREMENT_ID`: (Opcional) ID para Google Analytics

3. **Configura Google Authentication en Firebase Console**:
   - Ve a Authentication > Sign-in method
   - Habilita Google como proveedor
   - Agrega tu dominio local (localhost:5173) a los dominios autorizados

### Estructura de Firebase

El proyecto utiliza Firestore con las siguientes colecciones:
- `routines`: Rutinas personalizables de cada usuario
- `workoutSessions`: Registro de sesiones de entrenamiento completadas
- `exerciseHistory`: Historial de pesos y récords por ejercicio
- `exerciseLogs`: Logs detallados de cada ejercicio por sesión

### Reglas de Firestore Recomendadas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura de workouts para usuarios autenticados
    match /workouts/{workoutId} {
      allow read, write: if request.auth != null;
    }
    
    // Los usuarios solo pueden leer/escribir sus propios logs
    match /exerciseLogs/{logId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

## 🛠️ Instalación y Uso

1. **Clona el repositorio**:
   ```bash
   git clone [tu-repositorio]
   cd project
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Configura las variables de entorno** (ver sección anterior)

4. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

5. **Abre tu navegador** en `http://localhost:5173`

## 📱 Uso de la Aplicación

### Primer Inicio
1. Haz clic en "Continuar con Google" para autenticarte
2. La aplicación creará automáticamente rutinas de ejemplo
3. En el Dashboard verás "¿Qué rutina quieres hacer hoy?"

### Gestión de Rutinas
1. **Crear Rutinas**: Ve a "Rutinas" → botón "+" para crear nuevas rutinas
2. **Personalizar**: Agrega ejercicios, series, repeticiones y tiempos de descanso
3. **Organizar**: Crea rutinas temáticas (Pecho, Espalda, Piernas, etc.)

### Realizar Entrenamientos
1. **Seleccionar**: En Dashboard, elige la rutina del día
2. **Ejecutar**: Para cada ejercicio:
   - Ve el último peso usado y récord personal
   - Ajusta el peso con botones +/- o entrada manual
   - Marca series completadas
   - Usa el timer automático entre series
3. **Completar**: Al terminar, guarda la sesión completa

### Seguimiento de Progreso
- **Historial**: Ve pesos anteriores y fechas
- **Récords**: Rastrea automáticamente tus mejores marcas
- **Sesiones**: Revisa entrenamientos pasados con duración y notas
- **Progreso**: Compara con sesiones anteriores

## 🏗️ Arquitectura Técnica

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS con tema oscuro
- **Backend**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Authentication con Google Provider
- **Icons**: Lucide React
- **State Management**: React Hooks personalizados

## 🔒 Seguridad

- El archivo `.env` está incluido en `.gitignore` para prevenir que las credenciales se suban al repositorio
- Las reglas de Firestore aseguran que los usuarios solo accedan a sus propios datos
- Autenticación segura via Google OAuth 2.0

## 🚢 Deployment

Para producción:
1. Configura las variables de entorno en tu plataforma de deployment
2. Ejecuta `npm run build` para generar la versión optimizada
3. Despliega la carpeta `dist` en tu hosting preferido

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Troubleshooting

### Errores de Variables de Entorno
Si recibes errores sobre variables de entorno faltantes:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Asegúrate de que todas las variables requeridas estén definidas
3. Reinicia el servidor de desarrollo después de modificar el archivo `.env`

### Problemas de Autenticación
- Verifica que Google Auth esté habilitado en Firebase Console
- Asegúrate de que tu dominio esté en la lista de dominios autorizados
- Revisa que las credenciales en `.env` sean correctas

### Problemas de Firestore
- Verifica que las reglas de Firestore permitan las operaciones necesarias
- Asegúrate de que el proyecto Firebase tenga Firestore habilitado
- Revisa la consola del navegador para errores específicos