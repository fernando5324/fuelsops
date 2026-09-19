<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDOException;

class SqlRun extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sql:run {file : Absolute or relative path to the SQL file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ejecuta un archivo SQL contra la base de datos actual, sentencia por sentencia';

    private const DUP_ERROR_CODES = [1050, 1060, 1061, 1062, 1091];

    public function handle(): int
    {
        $path = $this->argument('file');

        if (! is_file($path)) {
            $this->error("El archivo no existe: {$path}");

            return self::FAILURE;
        }

        $statements = $this->splitStatements((string) file_get_contents($path));

        $pdo = DB::connection()->getPdo();
        $run = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($statements as $index => $statement) {
            $clean = trim($statement);

            if ($clean === '' || $this->isBareComment($clean)) {
                continue;
            }

            try {
                $pdo->exec($clean);
                $run++;
            } catch (PDOException $e) {
                if (in_array((int) $this->driverCode($e), self::DUP_ERROR_CODES, true)) {
                    $skipped++;
                    $this->warn('#' . ($index + 1) . " ya existe (ignorado): " . $this->headline($clean));

                    continue;
                }

                $errors++;
                $this->error('#' . ($index + 1) . " error: " . $e->getMessage());
                $this->error('    ' . $this->headline($clean));
            }
        }

        $this->info("Sentencias ejecutadas: {$run}. Existentes ignoradas: {$skipped}. Errores: {$errors}.");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Split an SQL file into individual statements, respecting quoted
     * strings and comments.
     *
     * @return list<string>
     */
    private function splitStatements(string $sql): array
    {
        $statements = [];
        $current = '';
        $length = strlen($sql);
        $i = 0;
        $single = false;
        $double = false;
        $lineComment = false;
        $blockComment = false;

        while ($i < $length) {
            $char = $sql[$i];
            $next = $i + 1 < $length ? $sql[$i + 1] : '';

            if ($lineComment) {
                if ($char === "\n") {
                    $lineComment = false;
                    $current .= "\n";
                }
                $i++;

                continue;
            }

            if ($blockComment) {
                if ($char === '*' && $next === '/') {
                    $blockComment = false;
                    $current .= ' ';
                    $i += 2;

                    continue;
                }
                $i++;

                continue;
            }

            if (! $single && ! $double && $char === '-' && $next === '-') {
                $lineComment = true;
                $i += 2;

                continue;
            }

            if (! $single && ! $double && $char === '/' && $next === '*') {
                $blockComment = true;
                $i += 2;

                continue;
            }

            if ($single) {
                if ($char === '\\' && $next !== '') {
                    $current .= $char.$next;
                    $i += 2;

                    continue;
                }
                if ($char === "'") {
                    $single = false;
                }
                $current .= $char;
                $i++;

                continue;
            }

            if ($double) {
                if ($char === '\\' && $next !== '') {
                    $current .= $char.$next;
                    $i += 2;

                    continue;
                }
                if ($char === '"') {
                    $double = false;
                }
                $current .= $char;
                $i++;

                continue;
            }

            if ($char === "'") {
                $single = true;
                $current .= $char;
                $i++;

                continue;
            }

            if ($char === '"') {
                $double = true;
                $current .= $char;
                $i++;

                continue;
            }

            if ($char === ';') {
                $statements[] = $current;
                $current = '';
                $i++;

                continue;
            }

            $current .= $char;
            $i++;
        }

        if (trim($current) !== '') {
            $statements[] = $current;
        }

        return $statements;
    }

    private function isBareComment(string $statement): bool
    {
        return str_starts_with($statement, '--');
    }

    private function driverCode(PDOException $e): string
    {
        return (string) ($e->errorInfo[1] ?? $e->getCode());
    }

    private function headline(string $statement): string
    {
        $oneLine = preg_replace('/\s+/', ' ', $statement) ?? $statement;

        return mb_substr($oneLine, 0, 120);
    }
}