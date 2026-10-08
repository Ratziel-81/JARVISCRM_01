# PROMPT GUARDADO — pendiente de ejecutar

> **Nota de guardado (2026-10-08, rama `develop`):** este prompt se almacena
> SIN EJECUTAR, tal como lo entregó el usuario.
>
> Decisiones registradas para la futura implementación (petición del usuario):
>
> - El tema oscuro actual se llamará **`JARVIS DARK`**.
> - El tema nuevo a crear se llamará **`NEUROMORPHISM_01`**.
> - No se trata de una sustitución: ambos temas deben **convivir** con un
>   **selector de skins** que aplique a TODO el CRM
>   (variables por tema + `data-theme` + persistencia en `localStorage`).
> - Cuando se ejecute, adaptar el apartado 4 del prompt ("Evita fondos negros…")
>   en consecuencia: esas restricciones aplican al tema `NEUROMORPHISM_01`,
>   no a `JARVIS DARK`, que se conserva intacto.

---

# PROYECTO: J.A.R.V.I.S. CRM — REDISEÑO NEUMÓRFICO LIGHT

## 1. Rol y objetivo


Actúa como un Senior Frontend Engineer especializado en React, TypeScript, Tailwind CSS 4 y diseño de interfaces SaaS premium.


Debes transformar el diseño visual de mi CRM existente, denominado J.A.R.V.I.S. CRM, desde su tema oscuro futurista actual hacia un tema claro de estilo **Soft Neumorphism / Light Neumorphism**, inspirado en el concepto visual de JARVIS de Iron Man.


El resultado debe parecer un producto SaaS empresarial premium, elegante, tecnológico, limpio y profesional.


No quiero reconstruir la aplicación desde cero. Quiero rediseñar la interfaz existente conservando su arquitectura y funcionalidades.


## 2. Arquitectura existente


El proyecto utiliza:


- React 19.
- TypeScript.
- Vite.
- Tailwind CSS 4.
- Lucide React para los iconos.
- Recharts para las gráficas.
- React Router para la navegación.
- Un servidor Express con SQLite.
- Un asistente JARVIS con conversación y funcionalidades de voz.


Archivos principales:


- `src/index.css`
- `src/App.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/dashboard/`
- `src/components/ai/AICore.tsx`
- `src/components/ai/JarvisPanel.tsx`
- `src/components/ai/QuickActions.tsx`
- `src/pages/`


Analiza el código real antes de modificarlo. Si descubres diferencias respecto a esta descripción, utiliza la implementación existente como referencia.


## 3. Reglas innegociables


1. No reconstruyas la aplicación desde cero.
2. No elimines funcionalidades existentes.
3. No cambies rutas de React Router.
4. No modifiques los modelos de datos ni las respuestas de la API.
5. No alteres el funcionamiento de la base de datos SQLite.
6. No elimines funcionalidades de voz, conversación, reconocimiento de voz ni síntesis de voz.
7. No sustituyas datos reales por datos inventados.
8. No elimines componentes existentes simplemente porque su estilo sea difícil de adaptar.
9. No instales nuevas dependencias si puedes resolverlo con las herramientas actuales.
10. No reemplaces Tailwind CSS 4 por otra solución.
11. No conviertas el proyecto en una maqueta estática.
12. Conserva la compatibilidad con TypeScript.
13. No cambies archivos del servidor salvo que exista una necesidad demostrable.
14. No hagas una sustitución global indiscriminada de colores sin comprobar los resultados.
15. No afirmes que has validado el proyecto si no has ejecutado las comprobaciones correspondientes.


Puedes reorganizar clases CSS, crear variables, añadir componentes visuales reutilizables y ajustar JSX exclusivamente cuando sea necesario para implementar el nuevo diseño.


## 4. Dirección artística


El tema debe utilizar un fondo gris claro azulado, superficies neumórficas, sombras suaves, esquinas redondeadas, tipografía legible y acentos cian.


Evita:


- Fondos negros.
- Paneles azul marino.
- Bordes cian excesivamente brillantes.
- Sombras negras duras.
- Efectos gaming.
- Gradientes exagerados.
- Exceso de elementos decorativos.
- Texto demasiado pequeño.
- Contraste insuficiente.


La identidad de JARVIS debe seguir siendo reconocible, pero de forma elegante y discreta.


## 5. Design System


Define variables CSS centralizadas en `src/index.css`.


Paleta de referencia:


- Fondo general: `#E8EDF3`
- Superficie principal: `#E8EDF3`
- Superficie clara: `#F4F7FA`
- Texto principal: `#29415D`
- Texto secundario: `#71839A`
- Texto tenue: `#93A2B5`
- Azul principal: `#329FE0`
- Cian principal: `#42C7E8`
- Cian suave: `#A8E8F8`
- Éxito: `#36B99A`
- Advertencia: `#E8B44D`
- Error: `#E77F8B`
- Bordes suaves: `rgba(255,255,255,0.75)`


Define también:


- Radios pequeños: 10 px.
- Radios medianos: 16 px.
- Radios grandes: 22 px.
- Radios extra grandes: 28 px.
- Transiciones entre 180 y 250 ms.
- Sombras elevadas.
- Sombras interiores.
- Sombras de interacción.
- Brillos cian muy sutiles.


Implementa las sombras neumórficas con una combinación de sombras claras y sombras gris azuladas. Evita utilizar sombras negras intensas.


Ejemplo de referencia:


```css
:root {
  --jarvis-bg: #E8EDF3;
  --jarvis-surface: #E8EDF3;
  --jarvis-surface-light: #F4F7FA;


  --jarvis-text: #29415D;
  --jarvis-text-secondary: #71839A;
  --jarvis-text-muted: #93A2B5;


  --jarvis-primary: #329FE0;
  --jarvis-cyan: #42C7E8;


  --jarvis-success: #36B99A;
  --jarvis-warning: #E8B44D;
  --jarvis-danger: #E77F8B;


  --jarvis-radius-sm: 10px;
  --jarvis-radius-md: 16px;
  --jarvis-radius-lg: 22px;
  --jarvis-radius-xl: 28px;


  --jarvis-shadow-raised:
    7px 7px 16px rgba(163, 177, 198, 0.42),
    -7px -7px 16px rgba(255, 255, 255, 0.92);


  --jarvis-shadow-raised-sm:
    4px 4px 9px rgba(163, 177, 198, 0.34),
    -4px -4px 9px rgba(255, 255, 255, 0.9);


  --jarvis-shadow-inset:
    inset 4px 4px 9px rgba(163, 177, 198, 0.35),
    inset -4px -4px 9px rgba(255, 255, 255, 0.9);


  --jarvis-shadow-glow:
    0 0 18px rgba(50, 159, 224, 0.16);
}
```


Adapta los valores si es necesario para que los componentes tengan una apariencia coherente.


## 6. Componentes reutilizables


Crea clases CSS reutilizables para:


- `.jarvis-surface`
- `.jarvis-card`
- `.jarvis-card-inset`
- `.jarvis-button`
- `.jarvis-button-primary`
- `.jarvis-input`
- `.jarvis-badge`
- `.jarvis-section-title`
- `.jarvis-icon-button`


No dupliques estilos innecesariamente.


Las tarjetas deben compartir el mismo lenguaje visual. Los inputs deben parecer ligeramente hundidos. Los botones principales pueden utilizar un azul suave con una sombra discreta.


Los estados hover, focus, active y disabled deben estar definidos y ser accesibles.


No utilices sombras que dificulten la lectura del contenido.


## 7. Layout global


Adapta `MainLayout.tsx`, `Sidebar.tsx` y `Topbar.tsx`.


### Fondo


- Fondo gris claro uniforme.
- Posible degradado ambiental casi imperceptible.
- Elimina la cuadrícula oscura actual o sustitúyela por una textura técnica muy tenue.


### Barra superior


- Superficie gris clara.
- Separación visual sutil.
- Logotipo J.A.R.V.I.S. con azul y cian.
- Buscador hundido mediante sombras interiores.
- Botones de notificaciones neumórficos.
- Avatar circular azul.
- Menús desplegables con el nuevo tema.


### Sidebar


- Fondo integrado con el resto de la aplicación.
- Iconos Lucide con trazos consistentes.
- Texto azul grisáceo.
- Elemento activo con relieve neumórfico y un indicador azul.
- Hover suave.
- Estado de sistema online en verde discreto.
- Mantén el comportamiento responsive y el menú móvil.


### Distribución


Mantén el panel JARVIS integrado en el layout de escritorio, siempre que el espacio disponible lo permita.


En pantallas pequeñas, conserva el comportamiento de panel superpuesto existente.


No rompas la navegación ni el espacio reservado a la barra superior.


## 8. Dashboard


Adapta los componentes existentes de `src/components/dashboard/`.


### HeroBanner


Debe funcionar como cabecera premium con:


- Saludo al usuario.
- Texto descriptivo.
- Identidad de JARVIS.
- Núcleo visual circular.
- Fondo claro y detalles técnicos discretos.


### Tarjetas KPI


Mantén los datos y la lógica existentes.


Aplica:


- Tarjetas neumórficas elevadas.
- Iconos sobre superficies circulares.
- Valores destacados.
- Variaciones porcentuales en badges.
- Gráficas pequeñas con líneas azules o cian.
- Espaciado consistente.


### Pipeline de ventas


- Etapas en tarjetas pequeñas.
- Indicadores de progreso.
- Empresas y oportunidades en filas neumórficas.
- Importes y probabilidades claramente legibles.
- Colores de prioridad discretos.


### Actividad reciente


- Línea temporal clara.
- Iconos circulares.
- Texto principal y secundario diferenciados.
- Indicadores de estado.
- Espaciado uniforme.


### Gráficas y módulos secundarios


Adapta los estilos de Recharts, incluidos ejes, leyendas, tooltips y cuadrículas, al tema claro.


Conserva todas las gráficas y todos los módulos existentes.


No elimines el mapa de inteligencia, los clientes recientes, las ofertas destacadas ni las próximas acciones.


## 9. Asistente J.A.R.V.I.S.


Adapta `AICore.tsx`, `JarvisPanel.tsx` y `QuickActions.tsx`.


El asistente debe destacar visualmente, sin dominar toda la interfaz.


### Núcleo


Conserva el núcleo circular, los anillos y las animaciones existentes.


Transforma su apariencia mediante:


- Centro luminoso blanco.
- Azul cielo y cian.
- Anillos concéntricos semitransparentes.
- Halo suave.
- Sombras luminosas controladas.
- Movimiento lento y elegante.


Evita un exceso de neón.


### Conversación


- Mensajes de JARVIS sobre superficies claras.
- Mensajes del usuario diferenciados sutilmente.
- Texto con contraste suficiente.
- Campo de entrada hundido.
- Botones neumórficos para micrófono y envío.
- Acciones rápidas en tarjetas compactas.
- Indicadores de escucha y procesamiento claramente visibles.


Conserva íntegramente la lógica de conversación, las peticiones al servidor, el reconocimiento de voz, la síntesis de voz, los controles de audio y los mecanismos de cancelación.


## 10. Resto de las páginas


Adapta también las pantallas existentes:


- Clientes.
- Oportunidades.
- Acciones.
- Ofertas.
- Calendario.
- Tareas.
- KPIs.
- Informes.
- Configuración.


No basta con cambiar el dashboard.


Busca los estilos oscuros escritos directamente en las clases de Tailwind, incluidos fondos arbitrarios, colores de texto, bordes, estados hover y sombras.


Reemplázalos de forma selectiva por el sistema visual nuevo.


Conserva las tablas, formularios, filtros, botones, enlaces, estados y comportamientos actuales.


Las tablas deben ser claras y legibles; los formularios deben utilizar inputs hundidos; las etiquetas de estado deben conservar su significado.


## 11. Responsive y accesibilidad


Verifica:


- Escritorio ancho.
- Portátil.
- Tablet.
- Móvil.


Evita desbordamientos horizontales.


Respeta el comportamiento actual de la navegación y del panel de JARVIS.


Conserva los atributos accesibles existentes y añade estados `focus-visible` cuando sean necesarios.


Respeta `prefers-reduced-motion` para reducir las animaciones cuando el usuario lo solicite.


Asegúrate de que el contraste del texto siga siendo adecuado sobre las superficies claras.


## 12. Estrategia de implementación


Trabaja en fases.


FASE 1: inspecciona los archivos, identifica estilos compartidos y establece un plan.


FASE 2: implementa las variables CSS y las clases neumórficas en `src/index.css`.


FASE 3: adapta `MainLayout.tsx`, `Sidebar.tsx` y `Topbar.tsx`.


FASE 4: adapta el dashboard y sus componentes.


FASE 5: adapta el asistente JARVIS.


FASE 6: adapta las demás páginas.


FASE 7: comprueba los estados interactivos y el responsive.


FASE 8: ejecuta las comprobaciones disponibles.


No intentes realizar todas las fases en una única modificación gigantesca. Termina y revisa cada fase antes de continuar.


## 13. Validación


Al terminar cada fase:


1. Ejecuta `npm run build`.
2. Corrige los errores de TypeScript o compilación introducidos por tus cambios.
3. Ejecuta `npm run lint` si resulta viable.
4. Comprueba que no se hayan eliminado funcionalidades.
5. Revisa los archivos modificados.
6. Informa de cualquier comprobación que no hayas podido ejecutar.


No ocultes errores existentes ni modifiques archivos ajenos al objetivo sin justificarlo.


## 14. Entrega final


Al finalizar, proporciona:


- Resumen de los cambios.
- Lista de archivos modificados.
- Funcionalidades conservadas.
- Comandos de validación ejecutados y resultados reales.
- Problemas pendientes, si existen.


Prioridad absoluta: conseguir una interfaz J.A.R.V.I.S. neumórfica clara, profesional, coherente y responsive, preservando la funcionalidad del CRM existente.
