# Portafolio Admin

Panel para cargar proyectos del portafolio en Supabase (`proyectos` + bucket `proyectos`).

## Uso

```bash
npm install
npm run dev
```

## Primer acceso

1. Supabase Dashboard → Authentication → Users → **Add user** (email + contraseña, marcar "Auto confirm").
2. SQL editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'TU_EMAIL';
   ```
3. Entrar en la app con ese usuario.

Solo usuarios en `public.admins` pueden crear/editar/borrar proyectos y subir imágenes.
El portafolio público solo lee filas con `publicado = true`.

## Contacto

Botón **Contacto** en el panel: correo y teléfono en la tabla `perfil` (una sola fila, `id = 1`).
Crear la tabla una vez con [supabase/perfil.sql](supabase/perfil.sql). Lectura pública, escritura solo admins.

## Sobre mí

Botón **Sobre mí**: título, párrafo, tecnologías y cifras de la sección "Sobre mí" del portafolio.
Se guardan en `perfil` (`sobre_titulo`, `sobre_texto`, `sobre_stack`, `sobre_stats`); columnas en [supabase/perfil.sql](supabase/perfil.sql).
Cada cifra puede ser manual o automática: `anios` (desde el primer puesto de Trayectoria) o `proyectos` (proyectos publicados).

## Trayectoria

Botón **Trayectoria** en el panel: un registro por puesto en la tabla `trayectoria`
(puesto, empresa, ubicación, modalidad, periodo, funciones, tecnologías).
Crear la tabla una vez con [supabase/trayectoria.sql](supabase/trayectoria.sql).
`fecha_fin = null` significa puesto actual. El portafolio público solo lee filas con `publicado = true`.

## Imágenes

- La primera imagen de la galería se guarda en `imagen_principal`; el resto en `imagenes_secundarias` (en ese orden).
- Se suben a `proyectos/<id-proyecto>/<uuid>.webp`, optimizadas a WebP (máx. 2000 px).
- Al quitar imágenes o borrar un proyecto, los archivos se eliminan del storage.
