// Script para ejecutar desde la consola del navegador
// Migra rutinas existentes para asignar grupos musculares

async function migrateRoutines() {
  console.log('🔄 Iniciando migración de rutinas...');
  
  try {
    // Importar dinámicamente la función
    const module = await import('./src/utils/muscleGroups.js');
    await module.updateRoutinesWithMuscleGroups();
    
    console.log('✅ ¡Migración completada exitosamente!');
    console.log('🔄 Recargando página para ver cambios...');
    
    // Recargar la página después de 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    alert('Error durante la migración. Ver consola para detalles.');
  }
}

// Hacer la función disponible globalmente
window.migrateRoutines = migrateRoutines;

console.log(`
🎯 MIGRATION SCRIPT LOADED 
===============================
Para migrar rutinas existentes, ejecuta:

migrateRoutines()

Este script:
✅ Detectará automáticamente el grupo muscular de cada rutina
✅ Asignará el grupo muscular principal a cada rutina
✅ Actualizará los ejercicios con sus grupos correspondientes
✅ Recargará la página automáticamente

⚠️  Solo ejecutar UNA VEZ por proyecto
===============================
`);