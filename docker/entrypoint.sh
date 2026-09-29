#!/usr/bin/env bash
# ============================================================
# Sertoco - Entrypoint del contenedor
# ============================================================
# Aqui vive todo lo que solo puede ejecutarse cuando la plataforma
# YA INYECTO su entorno (PORT, DB_*, APP_KEY...). En la etapa de
# build del Dockerfile esas variables todavia no existen, por eso
# config:cache y route:cache NO se hacen en build.
#
# Variables opcionales (todas con default sensato):
#   PORT                    puerto que inyecta el PaaS
#   APACHE_PORT             puerto por defecto si no hay PORT
#   APACHE_SERVER_NAME      host del vhost; si falta, se deduce de APP_URL
#   APP_URL                 URL publica de la aplicacion
#   DB_WAIT_SECONDS         espera maxima por la base de datos (60)
#   DB_INIT_SQL             "true" crea el esquema si la BD esta vacia
#   DB_CREATE_DATABASE      "true" deja el CREATE DATABASE del esquema
#   DB_INIT_SEEDS           "true" carga SEEDS.sql despues del esquema
#   OPTIMIZE                "false" desactiva las caches de runtime
# ============================================================
set -euo pipefail

log()  { printf '[entrypoint] %s\n' "$*"; }
warn() { printf '[entrypoint] AVISO: %s\n' "$*" >&2; }
die()  { printf '[entrypoint] ERROR: %s\n' "$*" >&2; exit 1; }

APP_DIR=/var/www/html
cd "$APP_DIR"

# ------------------------------------------------------------
# 1. Puerto HTTP: PORT (PaaS) tiene prioridad sobre APACHE_PORT.
#    Si ninguno viene, se cae a 80 para no dejar Apache sin puerto.
# ------------------------------------------------------------
APACHE_PORT="${PORT:-${APACHE_PORT:-80}}"

if ! printf '%s' "$APACHE_PORT" | grep -Eq '^[0-9]+$'; then
    die "puerto no valido: PORT='${PORT:-}' APACHE_PORT='${APACHE_PORT:-}'"
fi

if [ "$APACHE_PORT" -lt 1 ] || [ "$APACHE_PORT" -gt 65535 ]; then
    die "puerto fuera de rango: $APACHE_PORT"
fi

export APACHE_PORT
log "Apache escuchara en el puerto ${APACHE_PORT}"

# ------------------------------------------------------------
# 2. ServerName a partir de APP_URL (evita el aviso de Apache
#    sobre el FQDN y hace correctas las redirecciones).
# ------------------------------------------------------------
if [ -z "${APACHE_SERVER_NAME:-}" ]; then
    APACHE_SERVER_NAME="$(printf '%s' "${APP_URL:-}" |
        sed -n 's#^[a-zA-Z][a-zA-Z0-9+.-]*://\([^/:]*\).*$#\1#p')"
    APACHE_SERVER_NAME="${APACHE_SERVER_NAME:-localhost}"
fi

export APACHE_SERVER_NAME
log "ServerName: ${APACHE_SERVER_NAME}"

# ------------------------------------------------------------
# 3. storage/ y bootstrap/cache escribibles.
#    Imprescindible con volumen montado: el volumen llega vacio y
#    TAPA los directorios que creo la imagen, asi que hay que
#    recrearlos en cada arranque.
# ------------------------------------------------------------
mkdir -p \
    storage/app/private \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

# En un bind mount de Docker Desktop el chown puede fallar o no hacer
# nada; se avisa y se sigue (el contenedor es root, asi que escribe).
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null ||
    warn "no se pudo cambiar el propietario de storage/ (volumen montado): se continua"
chmod -R ug+rwX storage bootstrap/cache 2>/dev/null || true

# ------------------------------------------------------------
# 4. APP_KEY es obligatorio para cifrar cookies y sesion.
# ------------------------------------------------------------
if [ -z "${APP_KEY:-}" ] && ! grep -qs '^APP_KEY=base64:' .env 2>/dev/null; then
    die "APP_KEY vacio: define APP_KEY en el entorno del servicio (php artisan key:generate --show)"
fi

# ------------------------------------------------------------
# 5. Base de datos: espera a que acepte conexiones.
#    (solo mysql; sqlite u otros drivers no necesitan espera)
# ------------------------------------------------------------
db_pdo() {
    php -r '
        $host = getenv("DB_HOST") ?: "127.0.0.1";
        $port = getenv("DB_PORT") ?: "3306";
        $name = getenv("DB_DATABASE") ?: "";
        $dsn  = "mysql:host={$host};port={$port}";
        if ($name !== "" && getenv("DB_SKIP_DB_NAME") !== "1") {
            $dsn .= ";dbname={$name}";
        }
        new PDO($dsn, getenv("DB_USERNAME") ?: "", getenv("DB_PASSWORD") ?: "", [PDO::ATTR_TIMEOUT => 3]);
    ' 2>/dev/null
}

wait_for_db() {
    [ "${DB_CONNECTION:-mysql}" = "mysql" ] || return 0
    [ -n "${DB_HOST:-}" ] || return 0

    local timeout="${DB_WAIT_SECONDS:-60}"
    local waited=0

    log "Esperando MySQL ${DB_HOST}:${DB_PORT:-3306} (max ${timeout}s)"
    while ! db_pdo; do
        if [ "$waited" -ge "$timeout" ]; then
            warn "MySQL no respondio tras ${timeout}s: se arranca igualmente"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
    done

    log "MySQL disponible"
}

# ¿Existe ya la tabla de ancla del esquema?
db_has_tenants_table() {
    php -r '
        try {
            $pdo = new PDO(
                sprintf("mysql:host=%s;port=%s;dbname=%s",
                    getenv("DB_HOST") ?: "127.0.0.1",
                    getenv("DB_PORT") ?: "3306",
                    getenv("DB_DATABASE") ?: ""),
                getenv("DB_USERNAME") ?: "",
                getenv("DB_PASSWORD") ?: "",
                [PDO::ATTR_TIMEOUT => 5]
            );
            $st = $pdo->prepare(
                "SELECT COUNT(*) FROM information_schema.tables
                 WHERE table_schema = ? AND table_name = ?"
            );
            $st->execute([getenv("DB_DATABASE"), "tenants"]);
            exit($st->fetchColumn() > 0 ? 10 : 11);
        } catch (Throwable $e) {
            exit(12);
        }
    ' 2>/dev/null
}

# El proyecto NO usa migraciones: el esquema canonico es
# docs/02_Database/database.sql. Ese fichero trae
# "CREATE DATABASE IF NOT EXISTS sertocobd" y "USE sertocobd", y en
# un PaaS la base ya existe con otro nombre y el usuario puede no
# tener permiso de CREATE DATABASE. Sobre una COPIA temporal se
# quitan (o se reescriben, con DB_CREATE_DATABASE=true); el
# canonico no se toca nunca.
prepare_schema_file() {
    local source="$1"
    local target="$2"

    if [ "${DB_CREATE_DATABASE:-false}" = "true" ]; then
        if ! printf '%s' "${DB_DATABASE:-}" | grep -Eq '^[A-Za-z0-9_$-]+$'; then
            die "DB_DATABASE='${DB_DATABASE:-}' no es un nombre valido para CREATE DATABASE"
        fi
        sed -E \
            -e "s/^(CREATE DATABASE IF NOT EXISTS) .+ (CHARACTER)/\1 ${DB_DATABASE} \2/" \
            -e "/^[[:space:]]*USE[[:space:]]/d" \
            "$source" > "$target"
    else
        sed -E \
            -e "/^[[:space:]]*CREATE DATABASE/d" \
            -e "/^[[:space:]]*USE[[:space:]]/d" \
            "$source" > "$target"
    fi
}

init_schema() {
    [ "${DB_INIT_SQL:-false}" = "true" ] || return 0

    local schema="docs/02_Database/database.sql"
    local seeds="docs/02_Database/SEEDS.sql"

    if [ ! -f "$schema" ]; then
        warn "DB_INIT_SQL=true pero no existe $schema"
        return 0
    fi

    local code=0
    db_has_tenants_table || code=$?

    if [ "$code" = "10" ]; then
        log "El esquema ya existe: se omite DB_INIT_SQL"
        return 0
    fi

    if [ "$code" = "12" ]; then
        die "no se pudo inspeccionar la base de datos: revisa DB_HOST/DB_DATABASE/DB_PASSWORD"
    fi

    local tmp
    tmp="$(mktemp /tmp/sertoco-schema.XXXXXX.sql)"
    prepare_schema_file "$schema" "$tmp"

    log "Creando el esquema desde $schema"
    if ! php artisan sql:run "$tmp"; then
        rm -f "$tmp"
        die "fallo la creacion del esquema (mira las lineas 'error:' de arriba)"
    fi
    rm -f "$tmp"

    if [ "${DB_INIT_SEEDS:-false}" = "true" ] && [ -f "$seeds" ]; then
        tmp="$(mktemp /tmp/sertoco-seeds.XXXXXX.sql)"
        prepare_schema_file "$seeds" "$tmp"
        log "Cargando semillas desde $seeds"
        php artisan sql:run "$tmp" || warn "las semillas devolvieron error (siguen siendo idempotentes, se puede repetir)"
        rm -f "$tmp"
    fi
}

wait_for_db
init_schema

# ------------------------------------------------------------
# 6. Cachés de Laravel: se generan en cada arranque, ya con el
#    entorno real. Fallar aqui no debe tumbar el servicio: es
#    preferible servir sin cache que entrar en crash-loop.
# ------------------------------------------------------------
if [ "${OPTIMIZE:-true}" = "true" ]; then
    log "Generando cachés de Laravel (config, routes, views, events)"
    php artisan config:cache || warn "config:cache fallo: se sirve sin cache de configuracion"
    php artisan route:cache  || warn "route:cache fallo: se sirve sin cache de rutas"
    php artisan view:cache   || warn "view:cache fallo: se sirven las vistas sin compilar"
    php artisan event:cache  || warn "event:cache fallo: se sirve sin cache de eventos"
else
    log "OPTIMIZE=false: se omiten las cachés de Laravel"
fi

# ------------------------------------------------------------
# 7. Handoff al proceso principal (apache2-foreground por defecto;
#    un servicio de colas sobrescribe el CMD con queue:work).
# ------------------------------------------------------------
log "Arrancando: $*"
exec "$@"
