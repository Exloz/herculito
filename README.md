# CityGym - Configuración de Firebase

## Variables de Entorno

Este proyecto utiliza variables de entorno para mantener seguras las credenciales de Firebase.

### Configuración Inicial

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

### Seguridad

- El archivo `.env` está incluido en `.gitignore` para prevenir que las credenciales se suban al repositorio
- Nunca compartas las credenciales reales en código público
- Para producción, configura estas variables en tu plataforma de deployment

### Estructura de Firebase

El proyecto utiliza Firestore con las siguientes colecciones:
- `workouts`: Rutinas de ejercicios
- `exerciseLogs`: Registros de progreso por usuario y fecha

### Troubleshooting

Si recibes errores sobre variables de entorno faltantes:
1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Asegúrate de que todas las variables requeridas estén definidas
3. Reinicia el servidor de desarrollo después de modificar el archivo `.env`