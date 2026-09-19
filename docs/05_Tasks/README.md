# Seguimiento de Tareas

Convenciones y reglas para el seguimiento del trabajo pendiente del
proyecto Sertoco.

El backlog completo se encuentra en `backlog.md` de esta misma carpeta.

---

## Estados

| Estado       | Significado                                                     |
|--------------|-----------------------------------------------------------------|
| `Todo`       | Pendiente, aún no iniciado.                                      |
| `In-progress`| En curso.                                                        |
| `Done`       | Completado. Cumple el criterio de aceptación definido.           |
| `Blocked`    | Bloqueado. Requiere una acción externa o una decisión previa.    |

## Prioridades

- `Alta`
- `Media`
- `Baja`

## Formato de tareas

Cada tarea en `backlog.md` se registra con el siguiente esquema:

```text
- [ ] T-XXX — Título de la tarea.
    - Prioridad: Alta | Media | Baja
    - Fase: <flujo/sección>
    - Dependencias: T-XXX, T-YYY (o "ninguna")
    - Referencias: docs/..., ADR-XXX, roadmap.md
    - Criterio de aceptación: <descripción verificable>
```

## Reglas de actualización

- Marcar como `Done` únicamente cuando la tarea cumple su criterio de
  aceptación y se verificó el resultado.
- Cambiar el estado a `In-progress` solo mientras se trabaja; la fila
  de estado debe reflejar la realidad actual.
- No eliminar tareas del histórico. Si una tarea deja de ser necesaria
  se marca como cancelada (`~~T-XXX~~`) y se deja constancia del motivo.
- Toda tarea debe enlazar la documentación relacionada: `roadmap.md`,
  ADR, diseño de base de datos o SQL.
- Al planificar nueva funcionalidad se aplica la regla del proyecto
  definida en `docs/README.md`:

1. ¿Existe un ADR relacionado?
2. ¿La funcionalidad pertenece al MVP?
3. ¿La base de datos ya la soporta?
4. ¿Debe actualizarse la documentación?
5. ¿Impacta algún módulo o plan comercial?
6. ¿Requiere eliminar o recrear la base de datos?

Las tareas nuevas se agregan manteniendo el máximo detalle y sin
resumir ni reemplazar contenido existente, según la política de
actualización de documentos del proyecto.

---

## Índice del backlog

| Sección | Flujo                                                     | Roadmap |
|---------|-----------------------------------------------------------|---------|
| A       | Base de datos y arquitectura                               | Fase 1  |
| B       | Formulario público de registro de pedidos                  | Fase 2  |
| C       | Panel interno (login + Ant Design)                         | Fase 2  |
| D       | Gestión de catálogos y estados                             | Fase 3  |
| E       | Validaciones y reglas de negocio                           | Fase 4  |
| F       | Integraciones externas (futuro)                            | Fase 5  |
| G       | Reportes y mejoras                                         | Fase 6  |