<?php

namespace App\Jobs;

use App\Services\OrderService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\UploadedFile;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessPublicOrder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = 5;
    public $timeout = 60;

    public function __construct(public array $payload, public array $filePaths = [])
    {
    }

    public function handle(OrderService $orderService): void
    {
        $tenantId = (int) Arr::get($this->payload, "tenant_id");
        $order = null;
        DB::transaction(function () use ($orderService, &$order) {
            $order = $orderService->create($this->payload);
            foreach ($this->filePaths as $relPath) {
                $fullPath = Storage::disk("local")->path($relPath);
                if (! is_file($fullPath)) {
                    Log::warning("ProcessPublicOrder: temp file missing", ["path" => $relPath]);
                    continue;
                }
                $orderService->attachMedia($order, new UploadedFile($fullPath, basename($relPath), null, null, true));
            }
        });
        foreach ($this->filePaths as $relPath) {
            $dir = dirname($relPath);
            Storage::disk("local")->delete($relPath);
            if ($dir && $dir !== ".") {
                $tmpBase = "tmp/orders";
                if (str_starts_with($dir, $tmpBase)) {
                    Storage::disk("local")->deleteDirectory($dir);
                }
            }
        }
        Log::info("ProcessPublicOrder: processed", ["tenant_id" => $tenantId, "order_id" => $order?->id, "code" => $order?->code]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessPublicOrder: failed", ["exception" => $exception->getMessage(), "payload" => Arr::except($this->payload, ["files"])]);
    }
}

