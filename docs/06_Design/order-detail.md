# Diseño UX/UI — Detalle y gestión de pedidos

## 1. Objetivo

Rediseñar la experiencia de consulta, visualización y edición de un pedido dentro del panel administrativo de Sertoco.

La implementación actual ya cuenta con una interacción que debe conservarse:

1. El administrador visualiza un listado de pedidos.
2. Al hacer clic en cualquier parte de una fila, se abre un panel lateral derecho.
3. El panel ocupa aproximadamente un tercio de la pantalla.
4. El panel muestra una vista resumida del pedido.
5. El panel contiene una acción para abrir el pedido completo.
6. Actualmente existe una pantalla individual del pedido.
7. La pantalla individual permite consultar la información completa.
8. La pantalla individual también muestra el historial de estados.

Esta interacción debe mantenerse.

El objetivo no es eliminar el flujo existente, sino **mejorarlo, organizar la información y diferenciar claramente entre consultar y editar**.

---

## 2. Flujo general

El flujo esperado debe ser:

```
Listado de pedidos
        │
        │ clic en cualquier parte de la fila
        ▼
┌─────────────────────────┐
│ Panel lateral           │
│ Vista previa del pedido │
│                         │
│ [Ver pedido]            │
│ [Editar]                │
└────────────┬────────────┘
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
     Ver         Editar
       │           │
       ▼           ▼
Detalle       Formulario
solo lectura  editable
```

La vista previa debe seguir siendo una interacción rápida desde el listado.

La pantalla individual debe ser utilizada cuando el administrador necesite revisar el pedido con mayor profundidad.

La pantalla de edición debe reutilizar la estructura del pedido, pero permitiendo modificar la información.

## 3. Principios generales

### 3.1 No eliminar información existente

La pantalla actual contiene información importante que debe seguir estando disponible.

No eliminar datos solamente porque la interfaz se vea cargada.

La solución debe ser:

Agrupar, jerarquizar y distribuir la información.

No:

Eliminar información.

Todos los datos importantes del pedido deben poder consultarse desde la vista individual.

## 4 Diferenciar tres niveles de visualización

La aplicación debe manejar tres niveles:

Nivel 1 — Listado

Información mínima necesaria para identificar rápidamente el pedido.

Nivel 2 — Vista previa

Panel lateral con información resumida pero suficiente para revisar rápidamente el pedido sin abandonar el listado.

Nivel 3 — Detalle completo

Pantalla individual donde se muestra toda la información del pedido organizada por secciones.

La edición será una variante del nivel 3.

## 5. Listado de pedidos

El listado no debe intentar mostrar toda la información del pedido.

Debe mostrar únicamente la información necesaria para identificarlo y conocer su estado.

Información sugerida:

- Número de pedido.
- Fecha.
- Cliente.
- RUC.
- Asesor.
- Conductor.
- Vehículo/cisterna.
- Total de galones.
- Total de venta.
- Estado.
- Fecha de creación o actualización.

La tabla debe evitar tener demasiadas columnas.

La información secundaria debe consultarse mediante el panel lateral o la pantalla individual.

## 6. Interacción del listado

Toda la fila debe ser clickeable.

Ejemplo:
```
┌─────────────────────────────────────────────────────────────────────┐
│ #39 │ Servicentro Kevin E.I.R.L. │ 4,000 gal │ S/ 91,866.40 │ ... │
└─────────────────────────────────────────────────────────────────────┘
                         ↓ clic
```
Al hacer clic:
```
┌─────────────────────────────────────────────┬───────────────────────┐
│                                             │ Vista previa          │
│              LISTADO                        │                       │
│                                             │ Pedido #39            │
│                                             │                       │
│                                             │ Cliente               │
│                                             │ Servicentro Kevin     │
│                                             │                       │
│                                             │ Estado                │
│                                             │ Pendiente              │
│                                             │                       │
│                                             │ Total                  │
│                                             │ S/ 91,866.40          │
│                                             │                       │
│                                             │ [Ver] [Editar]        │
└─────────────────────────────────────────────┴───────────────────────┘
```
El panel debe abrirse desde la derecha.

No debe navegar automáticamente a otra página solamente por seleccionar una fila.

## 7. Panel lateral de vista previa

El panel lateral debe mantenerse porque permite revisar pedidos rápidamente.

Debe mostrar información resumida y organizada.

No intentar reproducir absolutamente toda la pantalla de detalle dentro del panel.

Información recomendada
Encabezado

Mostrar:

- Número de pedido.
- Estado.
- Fecha.
- Cliente.

Ejemplo:
```
PEDIDO #39

Servicentro Kevin E.I.R.L.

Pendiente
21/09/2026
```
Resumen comercial

Mostrar:
```
Total galones
4,000 gal

Total venta
S/ 91,866.40
```
Si existen datos calculados importantes:
```
Compra
S/ 90,343.20

Ganancia
S/ 520.00
```
Estos valores deben presentarse visualmente como resumen y no como una tabla extensa.

Información operativa

Mostrar de forma compacta:
```
Asesor
Lima 6

Conductor
Eliseo Huerta Cierto

Licencia
M42420967

Cisterna
AVB-887

Tractor
F8S-991
```

Detalle de productos

Mostrar un resumen de los productos incluidos.

Por ejemplo:
```
Productos

Diesel B5 S-50 UV
4,000 gal

Planta: Pampilla
Mayorista: Recosac
```
No es necesario mostrar todas las columnas financieras dentro del panel lateral.

Observaciones

Mostrar las observaciones si existen.

Documentos

Si existen documentos adjuntos, mostrar una pequeña sección:
```
Documentos

📄 Factura
📄 Voucher
```
La vista previa debe permitir saber que existen documentos, pero la administración completa de archivos se realizará desde la pantalla individual.

## 8. Botones del panel lateral

El panel debe tener claramente dos acciones principales:
```
[ Ver pedido ]    [ Editar ]
```
Opcionalmente puede existir una acción secundaria para cerrar el panel.

Ver pedido

Debe abrir la pantalla individual en modo:
```
Solo lectura
```

Editar

Debe abrir la pantalla individual en modo:
```
Edición
```
No mezclar ambos modos.

## 9. Pantalla individual — modo consulta

La pantalla individual debe ser una página completa dedicada al pedido.

Debe reemplazar la actual distribución excesivamente horizontal por una estructura más organizada.

La información debe dividirse en secciones o tarjetas.

No colocar toda la información en una sola tabla gigante.

## 10. Estructura recomendada del detalle

La página debe tener aproximadamente esta estructura:

```
┌─────────────────────────────────────────────────────────────┐
│ ← Volver                                                   │
│                                                             │
│ Pedido #39                              [Estado: Pendiente] │
│ Servicentro Kevin E.I.R.L.                                 │
│ Fecha: 21/09/2026                                          │
│                                                             │
│ [Editar pedido]                                             │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ RESUMEN                                                     │
│                                                             │
│ Total galones       Total venta       Compra       Ganancia │
│ 4,000 gal           S/ 91,866.40     S/90,343.20  S/520.00│
└─────────────────────────────────────────────────────────────┘


┌───────────────────────────────┬─────────────────────────────┐
│ CLIENTE                       │ PEDIDO                      │
│                               │                             │
│ RUC                           │ Fecha                       │
│ Nombre                        │ Asesor                      │
│                               │ Estado                      │
└───────────────────────────────┴─────────────────────────────┘


┌───────────────────────────────┬─────────────────────────────┐
│ CONDUCTOR                     │ VEHÍCULO                    │
│                               │                             │
│ Nombre                        │ Cisterna                    │
│ Licencia                      │ Tractor                     │
└───────────────────────────────┴─────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ DETALLE DEL PEDIDO                                          │
│                                                             │
│ SCOP │ Planta │ Mayorista │ Producto │ Galones │ Precio... │
│                                                             │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ RESUMEN DE VENTA                                            │
│                                                             │
│ Venta al cliente                                            │
│ Compra al proveedor                                         │
│ Ganancia                                                     │
└─────────────────────────────────────────────────────────────┘


┌───────────────────────────────┬─────────────────────────────┐
│ DEPÓSITOS DEL CLIENTE         │ DEPÓSITO POR PROVEEDOR      │
│                               │                             │
│ BCP   1225595     S/38,000    │ Recosac       S/90,343.20 │
│ BCP   1232209     S/30,900    │                             │
│ ...                           │ TOTAL         S/90,343.20 │
└───────────────────────────────┴─────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ DOCUMENTOS ADJUNTOS                                         │
│                                                             │
│ 📄 Factura                                                  │
│ 📄 Comprobante                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ OBSERVACIONES                                               │
│                                                             │
│ Comparte con Primax                                         │
└─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ HISTORIAL DE ESTADOS                                        │
│                                                             │
│ ● Pendiente       21/09/2026 10:01                         │
│ │                                                           │
│ ● Atendido        21/09/2026 11:30                         │
│ │                                                           │
│ ● ...                                                       │
└─────────────────────────────────────────────────────────────┘
```
La estructura anterior es conceptual.

OpenCode debe adaptarla al diseño visual existente de Sertoco.

## 11. Encabezado del pedido

El encabezado debe ser visualmente importante.

Debe contener:

- Número de pedido.
- Cliente.
- Estado actual.
- Fecha.
- Asesor.
- Acción de editar.

Ejemplo:
```
Pedido #39

Servicentro Kevin E.I.R.L.

Pendiente
21/09/2026

[Editar pedido]
```

El estado debe utilizar el sistema visual de estados existente.

No utilizar únicamente texto pequeño.

## 12. Resumen financiero

Los valores financieros deben tener una jerarquía visual clara.

La información de la pantalla actual incluye:

- Venta al cliente.
- Compra al proveedor.
- Ganancia.
- Total de galones.

Estos datos deben permanecer.

Sin embargo, no deben presentarse como múltiples bloques visualmente desconectados.

Agruparlos dentro de una sección:

Resumen financiero

Ejemplo:
```
┌─────────────────────────────────────────────────────────┐
│ RESUMEN FINANCIERO                                      │
│                                                         │
│ Total galones     Venta             Compra             │
│ 4,000 gal         S/91,866.40       S/90,343.20        │
│                                                         │
│ Ganancia          Margen                                │
│ S/520.00         S/0.1300 / gal                         │
└─────────────────────────────────────────────────────────┘
```

Los cálculos existentes no deben modificarse durante este trabajo.

Este trabajo es principalmente de organización y presentación.

## 13. Detalle del pedido

El detalle de productos debe mantenerse completo.

Actualmente contiene información como:

- N°
- Factura
- SCOP
- Planta
- Mayorista
- Producto
- Comp.
- Galones
- Precio de venta
- Precio de compra
- Valor de venta
- Valor de compra
- Margen/gal
- Monto compra
- Subtotal venta

Toda esta información debe seguir disponible.

Sin embargo, debe agruparse visualmente.

La tabla puede utilizar:

- encabezado fijo;
- scroll horizontal controlado si es necesario;
- columnas agrupadas;
- formatos numéricos consistentes;
- alineación adecuada;
- resumen debajo de la tabla.

No eliminar columnas solamente para hacer la tabla más pequeña.

En pantallas pequeñas puede utilizarse scroll horizontal.

## 14. Información de depósitos

La información de depósitos debe conservarse.

Actualmente existen:
```
Depósitos del cliente
BCP
1225595
S/ 38,000.00

BCP
1232209
S/ 30,900.00

...
```

Depósito por proveedor

```
Recosac
S/ 90,343.20
```

Esta información debe permanecer dentro de una sección:

- Depósitos

con dos bloques:

- Depósitos del cliente
- Depósitos por proveedor

No mezclar ambos tipos de depósito.

## 15. Documentos adjuntos

Los documentos forman parte del pedido y deben ser visibles desde el detalle.

Debe existir una sección:

- Documentos adjuntos

Debe permitir:

- Ver documento.
- Descargar documento.
- Identificar tipo de archivo.
- Mostrar nombre.
- Mostrar tamaño si está disponible.
- Mostrar fecha si resulta relevante.

Ejemplo:

Documentos adjuntos
```
┌──────────────────────────────────────────────┐
│ 📄 factura-00001476.pdf                     │
│ PDF · 245 KB                                │
│                         [Ver] [Descargar]    │
└──────────────────────────────────────────────┘
```

## 16. Edición del pedido

Al seleccionar:

```
[Editar]
```

desde el listado o desde el panel lateral, debe abrirse la pantalla individual en modo edición.

La edición debe permitir modificar toda la información que actualmente sea editable.

Esto incluye como mínimo:

Datos generales
- Fecha del pedido.
- Asesor.
- Cliente.
- RUC.
- Información relacionada al pedido.

Conductor
- Licencia.
- Nombre.

Vehículo
- Cisterna.
- Tractor.

Detalle
- Factura.
- SCOP.
- Planta.
- Mayorista.
- Producto.
- Compartimentos.
- Galones.
- Precio de venta.
- Precio de compra, si corresponde al modelo actual.
- Información adicional relacionada con el detalle.

Observaciones
- Observaciones del pedido.

Documentos
- Agregar documentos.
- Visualizar documentos existentes.
- Eliminar/reemplazar documentos cuando corresponda.

No crear un editor separado para cada sección.

La página debe funcionar como un formulario completo de edición del pedido.

## 17. Modo lectura vs modo edición

La pantalla debe diferenciar claramente:

Modo lectura
```
/ orders / {id}
```

El usuario puede:

- Consultar información.
- Ver documentos.
- Descargar documentos.
- Consultar historial.
- Cambiar estado si la lógica actual lo permite.

No puede modificar los datos del pedido.

Modo edición
```
/ orders / {id} / edit
```

El usuario puede modificar los campos permitidos.

Debe existir:

```
[Guardar cambios]
[Cancelar]
```

Al cancelar:

- No guardar modificaciones.
- Regresar al modo consulta o al listado según el flujo existente.

## 18. Historial de estados

El historial de estados actual debe mantenerse.

No eliminarlo ni esconderlo en una sección difícil de encontrar.

Debe existir una sección visualmente clara:
```
Historial de estados
```

Preferiblemente utilizando una línea de tiempo vertical.

Ejemplo:
```
Historial de estados

● Pendiente
  21/09/2026 · 10:01
  Pedido recibido

│
● Atendido
  21/09/2026 · 11:30
  Pedido procesado

│
● ...
```

Si existe usuario responsable del cambio, puede mostrarse:

Por: Administrador

El historial debe ser de solo lectura.

No permitir editar o eliminar registros históricos desde esta pantalla.

## 19. Cambio de estado

El estado actual debe permanecer visible en el encabezado.

Si el sistema ya permite cambiar el estado desde la pantalla del pedido, mantener esta funcionalidad.

La acción de cambio de estado debe ser independiente de la edición de datos.

Es decir:

- Editar pedido

no significa:

- Cambiar estado

Son acciones diferentes.

## 20. Acciones de la pantalla individual

La pantalla de consulta debe tener acciones claras.

Por ejemplo:
```
[Editar pedido]

[Cambiar estado]
```

Y las acciones secundarias pueden estar agrupadas en un menú si son numerosas.

Evitar tener una fila extensa de botones de colores como la interfaz actual.

La prioridad visual debe ser:

1. Estado.
2. Editar.
3. Acciones secundarias.

## 21. No utilizar demasiados colores

La interfaz actual utiliza muchos colores diferentes para cada acción.

El nuevo diseño debe utilizar el sistema visual de Sertoco.

Colores principales:
```
Azul principal:
#1B3A6B

Naranja:
#F47920
```

Los colores deben utilizarse para jerarquía y estados, no para decorar cada botón.

No crear un botón azul, otro rojo, otro morado, otro naranja, etc. solamente para diferenciarlos.

Los colores de estado pueden mantenerse cuando tengan significado semántico.

## 22. Componentización

La implementación debe dividir la pantalla en componentes reutilizables.

Por ejemplo:
```
OrderDetail
├── OrderHeader
├── OrderSummary
├── CustomerCard
├── DriverCard
├── VehicleCard
├── OrderItems
├── FinancialSummary
├── CustomerDeposits
├── SupplierDeposits
├── OrderDocuments
├── OrderObservations
└── OrderStatusHistory
```
Para edición:
```
OrderEdit
├── OrderGeneralForm
├── CustomerSection
├── DriverSection
├── VehicleSection
├── OrderItemsForm
├── DocumentsManager
└── OrderEditActions
```
No es obligatorio utilizar exactamente estos nombres.

La intención es separar responsabilidades y evitar un componente React monolítico.

## 23. Reutilización entre vista y edición

La información visualizada en modo consulta y modo edición representa el mismo pedido.

Por lo tanto, evitar duplicar lógica innecesariamente.

Ejemplo:
```
Pedido
 ├── Datos generales
 ├── Cliente
 ├── Conductor
 ├── Vehículo
 ├── Detalles
 ├── Documentos
 └── Observaciones
```
La vista consulta esos datos para mostrarlos.

La vista edición utiliza los mismos datos para construir el formulario.

No crear modelos frontend diferentes para cada pantalla sin una razón real.

## 24. Panel lateral y pantalla individual

El panel lateral y la pantalla individual no deben competir entre sí.

Cada uno tiene una finalidad diferente.

### Panel lateral

Objetivo:

Revisar rápidamente.

Debe ser:

- Rápido.
- Resumido.
- Compacto.
- Fácil de cerrar.
- Sin demasiada información.

### Pantalla individual

Objetivo:

Revisar el pedido completo.

Debe ser:

- Completa.
- Ordenada.
- Detallada.
- Fácil de recorrer.
- Preparada para consultar documentos e historial.

### Pantalla de edición

Objetivo:

Modificar el pedido completo.

Debe ser:

- Clara.
- Funcional.
- Organizada por secciones.
- Fácil de validar.
- Con guardado explícito.

## 25. Responsive

La pantalla debe funcionar correctamente en:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

### En desktop

```
Listado + panel lateral
```

puede utilizar el espacio disponible.

### En pantallas pequeñas

- El panel lateral puede convertirse en un drawer casi completo.
- Las tarjetas pueden pasar de dos columnas a una.
- Las tablas pueden utilizar scroll horizontal.
- Las acciones deben permanecer accesibles.
- No ocultar información crítica.

## 26. Estados de interfaz

Implementar estados visuales apropiados para:

### Cargando pedido

Mostrar skeleton/loading.

### Pedido no encontrado

Mostrar una pantalla clara:

- No se encontró el pedido.

### Error

Mostrar un mensaje entendible y una acción para reintentar cuando corresponda.

### Sin documentos

Mostrar:

- No hay documentos adjuntos.

### Sin observaciones

Mostrar:

- Sin observaciones.

No dejar grandes espacios vacíos sin contexto.

## 27. Accesibilidad y usabilidad

Los elementos interactivos deben:

- Tener áreas de clic adecuadas.
- Mostrar estados hover.
- Mostrar focus.
- Tener etiquetas claras.
- No depender únicamente del color.
- Mantener buen contraste.
- Utilizar iconos acompañados de texto cuando la acción pueda ser ambigua.

No utilizar iconos sin explicación para acciones importantes.

## 28. Regla importante para OpenCode

Antes de modificar el código existente:

- Revisar cómo está implementado actualmente el listado de pedidos.
- Revisar cómo se abre el panel lateral.
- Revisar cómo se obtiene la información del pedido.
- Revisar cómo funciona actualmente el botón "Ver".
- Revisar cómo funciona el historial de estados.
- Revisar las rutas actuales.
- Revisar los componentes React existentes.
- Revisar los Services existentes.
- Revisar cómo se guardan actualmente los pedidos.
- Reutilizar la implementación existente siempre que sea posible.

No reemplazar componentes funcionales sin necesidad.

La prioridad es:
```
Reutilizar
    ↓
Refactorizar
    ↓
Mejorar
    ↓
Crear nuevos componentes solamente cuando sea necesario

```

## 29. Restricciones

No modificar durante esta tarea:

- Modelo de base de datos sin necesidad.
- Cálculos financieros existentes.
- Reglas de negocio existentes.
- Flujo de creación del pedido público.
- Historial de estados.
- Sistema de autenticación.
- Arquitectura Inertia + Services definida en ADR-003.

Si para implementar la edición completa se requiere modificar backend, primero identificar exactamente qué endpoint, controlador, validación o lógica debe modificarse.

No convertir todo el módulo a API JSON solamente para implementar esta funcionalidad.

Mantener la arquitectura híbrida definida en ADR-003.

## 30. Resultado esperado

El resultado final debe sentirse como un sistema administrativo profesional.

El administrador debe poder:
```
1. Ver rápidamente todos los pedidos.
        ↓
2. Hacer clic en cualquier pedido.
        ↓
3. Revisar una vista previa en el panel lateral.
        ↓
4. Elegir "Ver" para consultar todos los detalles.
        ↓
5. Elegir "Editar" para modificar el pedido.
        ↓
6. Consultar documentos.
        ↓
7. Consultar historial de estados.
        ↓
8. Cambiar el estado cuando corresponda.
```
La información existente no debe perderse.

El objetivo principal es mejorar:
```
Jerarquía visual
       +
Agrupación de información
       +
Navegación
       +
Separación entre consulta y edición
       +
Legibilidad
       +
Experiencia administrativa
```

## 31. Criterio de aceptación

La implementación se considera correcta si:

- El listado continúa mostrando información resumida.
- Al hacer clic en una fila se abre el panel lateral.
- El panel lateral mantiene la vista previa.
- El panel lateral tiene una acción "Ver".
- El panel lateral tiene una acción "Editar".
- "Ver" abre la página individual en modo lectura.
- "Editar" abre la página individual en modo edición.
- La vista individual contiene toda la información relevante del pedido.
- La información está agrupada por secciones.
- El detalle de productos conserva sus datos actuales.
- Los depósitos del cliente siguen visibles.
- Los depósitos de proveedores siguen visibles.
- Los documentos siguen visibles.
- Las observaciones siguen visibles.
- El historial de estados sigue visible.
- El estado actual sigue claramente identificado.
- Se puede cambiar el estado sin confundirlo con la edición.
- La edición permite modificar la información permitida.
- La edición permite gestionar documentos adjuntos.
- No se eliminan datos únicamente por razones de diseño.
- La interfaz no depende de una gran cantidad de colores.
- El diseño utiliza los colores principales de Sertoco.
- La interfaz es responsive.
- Se reutilizan componentes y lógica existentes siempre que sea posible.
- No se crea una API nueva innecesariamente.
- Se mantiene la arquitectura híbrida Inertia + Services.

## 32. Importante: no implementar todavía cambios de negocio

Esta tarea es principalmente de:
```
UX.
UI.
Organización.
Navegación.
Componentización.
```

No inventar nuevos cálculos financieros ni nuevas reglas de negocio.

Si algún dato de la imagen actual no tiene todavía una definición clara en el sistema, conservar su comportamiento actual y únicamente mejorar su presentación.

Si se detecta una necesidad que implique cambiar la lógica de negocio, dejarla identificada antes de realizar una modificación estructural.


### Una decisión que me parece especialmente importante

Yo mantendría **exactamente la idea de los dos botones que planteas**, porque separa dos intenciones que actualmente están mezcladas:

**Ver** → *"Quiero revisar este pedido."*  
**Editar** → *"Quiero modificar este pedido."*

Y en el listado quedaría algo muy natural:

```
Pedidos
──────────────────────────────────────────────────────────────
#39   Servicentro Kevin   Pendiente   4,000 gal   S/91,866
#40   Otro cliente       Atendido    2,500 gal   S/...
──────────────────────────────────────────────────────────────
             ↓ clic en cualquier fila

                       ┌────────────────────────┐
                       │ Pedido #39              │
                       │ Servicentro Kevin       │
                       │                         │
                       │ Pendiente               │
                       │ 4,000 gal               │
                       │ S/ 91,866.40            │
                       │                         │
                       │ [ Ver ] [ Editar ]      │
                       └────────────────────────┘

```

Y hay otra cosa que considero importante para tu caso: no intentaría meter toda la información de la captura dentro del drawer. El drawer debe ser una vista previa, mientras que la página individual es el lugar donde realmente se conserva el nivel de detalle que necesita el administrador.

Así consigues tres niveles muy claros:

Listado → Vista rápida → Detalle completo / Edición

Eso además encaja muy bien con la arquitectura que acabamos de definir en el ADR-003: el listado y el drawer pueden obtener información dinámica mediante Services cuando sea necesario, mientras que Ver, Editar, guardar cambios y las acciones principales pueden seguir utilizando Inertia.