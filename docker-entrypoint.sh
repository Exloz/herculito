#!/bin/sh

# Script para inyectar variables de entorno en runtime
# Reemplaza placeholders en el archivo JavaScript principal

echo "🚀 Configurando variables de entorno en runtime..."

# Archivo principal de la app
MAIN_JS=$(find /usr/share/nginx/html/assets -name "index-*.js" | head -1)

if [ -f "$MAIN_JS" ]; then
    echo "📁 Procesando: $MAIN_JS"
    
    # Reemplazar placeholders con valores reales
    sed -i "s|__VITE_FIREBASE_API_KEY__|${VITE_FIREBASE_API_KEY}|g" "$MAIN_JS"
    sed -i "s|__VITE_FIREBASE_AUTH_DOMAIN__|${VITE_FIREBASE_AUTH_DOMAIN}|g" "$MAIN_JS"
    sed -i "s|__VITE_FIREBASE_PROJECT_ID__|${VITE_FIREBASE_PROJECT_ID}|g" "$MAIN_JS"
    sed -i "s|__VITE_FIREBASE_STORAGE_BUCKET__|${VITE_FIREBASE_STORAGE_BUCKET}|g" "$MAIN_JS"
    sed -i "s|__VITE_FIREBASE_MESSAGING_SENDER_ID__|${VITE_FIREBASE_MESSAGING_SENDER_ID}|g" "$MAIN_JS"
    sed -i "s|__VITE_FIREBASE_APP_ID__|${VITE_FIREBASE_APP_ID}|g" "$MAIN_JS"
    
    echo "✅ Variables configuradas exitosamente"
else
    echo "❌ No se encontró el archivo principal de la aplicación"
fi

# Iniciar nginx
exec nginx -g "daemon off;"