<?php

use App\Http\Controllers\Platform\Advisors\AdvisorApiController;
use App\Http\Controllers\Platform\Advisors\AdvisorController;
use App\Http\Controllers\Platform\Customers\CustomerApiController;
use App\Http\Controllers\Platform\Customers\CustomerController;
use App\Http\Controllers\Platform\DashboardController;
use App\Http\Controllers\Platform\Drivers\DriverApiController;
use App\Http\Controllers\Platform\Drivers\DriverController;
use App\Http\Controllers\Platform\Media\MediaController;
use App\Http\Controllers\Platform\Orders\OrderApiController;
use App\Http\Controllers\Platform\Orders\OrderController;
use App\Http\Controllers\Platform\Orders\TrashController;
use App\Http\Controllers\Platform\OrderStatuses\OrderStatusApiController;
use App\Http\Controllers\Platform\OrderStatuses\OrderStatusController;
use App\Http\Controllers\Platform\Plants\PlantApiController;
use App\Http\Controllers\Platform\Plants\PlantController;
use App\Http\Controllers\Platform\Products\ProductApiController;
use App\Http\Controllers\Platform\Products\ProductController;
use App\Http\Controllers\Platform\Pricing\PriceApiController;
use App\Http\Controllers\Platform\Pricing\PriceController;
use App\Http\Controllers\Platform\Pricing\PriceImportController;
use App\Http\Controllers\Platform\Reports\SalesReportController;
use App\Http\Controllers\Platform\Users\UserApiController;
use App\Http\Controllers\Platform\Users\UserController;
use App\Http\Controllers\Platform\Vehicles\VehicleApiController;
use App\Http\Controllers\Platform\Vehicles\VehicleController;
use App\Http\Controllers\Platform\Wholesalers\WholesalerApiController;
use App\Http\Controllers\Platform\Wholesalers\WholesalerController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Public\OrderController as PublicOrderController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

/*
|--------------------------------------------------------------------------
| Formulario público (sin autenticación)
|--------------------------------------------------------------------------
| Las rutas que entregan vista de página conservan el prefijo en español
| (/pedidos/registro). Las consultas aditivas (API) usan prefijo inglés
| /orders/* y se registran ANTES de las rutas del panel con modelo binding.
*/
Route::prefix('pedidos')->name('pedidos.')->group(function () {
    Route::get('registro', [PublicOrderController::class, 'create'])->name('registro');
    Route::post('registro', [PublicOrderController::class, 'store'])->name('registro.store');
    Route::get('{order}/confirmado', [PublicOrderController::class, 'confirmed'])->name('confirmado');
});

Route::prefix('orders')->name('orders.')->group(function () {
    Route::post('lookup-customer', [PublicOrderController::class, 'lookupCustomer'])
        ->middleware('throttle:30,1')
        ->name('customer-lookup');
    Route::post('lookup-driver', [PublicOrderController::class, 'lookupDriver'])
        ->middleware('throttle:30,1')
        ->name('driver-lookup');
    Route::post('lookup-vehicle', [PublicOrderController::class, 'lookupVehicle'])
        ->middleware('throttle:30,1')
        ->name('vehicle-lookup');
});

Route::middleware('auth')->group(function () {
    Route::get('/panel', [DashboardController::class, 'index'])->name('dashboard');

    // Pedidos del panel (vistas)
    Route::get('/pedidos', [OrderController::class, 'index'])->name('pedidos.index');

    // Papelera de pedidos (ADR-011). Deben declararse ANTES de /pedidos/{order}
    // para que "papelera" no se interprete como id de pedido.
    Route::get('/pedidos/papelera', [TrashController::class, 'index'])->name('pedidos.papelera.index');
    Route::get('/pedidos/papelera/{order}', [TrashController::class, 'show'])->name('pedidos.papelera.show');

    Route::get('/pedidos/{order}', [OrderController::class, 'show'])->name('pedidos.show');
    Route::get('/pedidos/{order}/editar', [OrderController::class, 'edit'])->name('pedidos.edit');
    Route::put('/pedidos/{order}', [OrderController::class, 'update'])->name('pedidos.update');

    // Catálogos (vistas)
    Route::prefix('catalogos')->name('catalogos.')->group(function () {
        Route::get('asesores', [AdvisorController::class, 'index'])->name('asesores.index');
        Route::get('mayoristas', [WholesalerController::class, 'index'])->name('mayoristas.index');
        Route::get('plantas', [PlantController::class, 'index'])->name('plantas.index');
        Route::get('productos', [ProductController::class, 'index'])->name('productos.index');
        Route::get('clientes', [CustomerController::class, 'index'])->name('clientes.index');
        Route::get('conductores', [DriverController::class, 'index'])->name('conductores.index');
        Route::get('vehiculos', [VehicleController::class, 'index'])->name('vehiculos.index');
        Route::get('estados', [OrderStatusController::class, 'index'])->name('order-statuses.index');
    });

    // Usuarios internos (vista)
    Route::prefix('usuarios')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
    });

    // Precios: panel de administración + importación desde Excel (ADR-010)
    Route::prefix('precios')->name('pricing.')->group(function () {
        Route::get('/', [PriceController::class, 'index'])->name('admin');
        Route::get('exportar', [PriceController::class, 'export'])->name('export');
        Route::get('importar', [PriceImportController::class, 'index'])->name('index');
        Route::post('importar', [PriceImportController::class, 'store'])->name('upload');
        Route::get('importar/{batch}/preview', [PriceImportController::class, 'preview'])->name('preview');
        Route::post('importar/{batch}', [PriceImportController::class, 'confirm'])->name('confirm');
        Route::post('importar/{batch}/cancelar', [PriceImportController::class, 'cancel'])->name('cancel');
    });

    // Reportes (ADR-017). Vista única: la agregación completa (cards, evolución
    // diaria y productos) llega en una sola respuesta Inertia, sin API aparte.
    // La exportación a PDF (ADR-018) reutiliza los mismos filtros y el mismo
    // servicio: sigue el verbo `exportar` del export de precios.
    Route::prefix('reportes')->name('reports.')->group(function () {
        Route::get('avance-ventas', [SalesReportController::class, 'index'])->name('sales.index');
        Route::get('avance-ventas/exportar', [SalesReportController::class, 'export'])->name('sales.export');
    });

    // Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Archivos adjuntos (acceso autorizado)
    Route::get('/media/{mediaFile}/download', [MediaController::class, 'download'])->name('media.download');

    /*
    |--------------------------------------------------------------------------
    | APIs del panel (inglés)
    |--------------------------------------------------------------------------
    | Procesos HTTP/CRUD que no entregan vista de página. Conforme a ADR-003,
    | residen en el ApiController del respectivo módulo.
    */
    Route::prefix('api')->name('api.')->group(function () {
        Route::get('orders/{order}/detail', [OrderApiController::class, 'detail'])->name('orders.detail');
        Route::post('orders/{order}/status', [OrderApiController::class, 'changeStatus'])->name('orders.status');
        Route::post('orders/{order}/deposits', [OrderApiController::class, 'storeDeposit'])->name('orders.deposits.store');
        Route::delete('orders/{order}/deposits/{deposit}', [OrderApiController::class, 'destroyDeposit'])->name('orders.deposits.destroy');
        Route::post('orders/{order}/trash', [OrderApiController::class, 'trash'])->name('orders.trash');
        Route::post('orders/trash/{order}/restore', [OrderApiController::class, 'restore'])->name('orders.restore');

        Route::post('advisors', [AdvisorApiController::class, 'store'])->name('advisors.store');
        Route::put('advisors/{advisor}', [AdvisorApiController::class, 'update'])->name('advisors.update');
        Route::delete('advisors/{advisor}', [AdvisorApiController::class, 'destroy'])->name('advisors.destroy');

        Route::post('wholesalers', [WholesalerApiController::class, 'store'])->name('wholesalers.store');
        Route::put('wholesalers/{wholesaler}', [WholesalerApiController::class, 'update'])->name('wholesalers.update');
        Route::delete('wholesalers/{wholesaler}', [WholesalerApiController::class, 'destroy'])->name('wholesalers.destroy');

        Route::post('plants', [PlantApiController::class, 'store'])->name('plants.store');
        Route::put('plants/{plant}', [PlantApiController::class, 'update'])->name('plants.update');
        Route::delete('plants/{plant}', [PlantApiController::class, 'destroy'])->name('plants.destroy');

        Route::post('products', [ProductApiController::class, 'store'])->name('products.store');
        Route::put('products/{product}', [ProductApiController::class, 'update'])->name('products.update');
        Route::delete('products/{product}', [ProductApiController::class, 'destroy'])->name('products.destroy');

        Route::post('customers', [CustomerApiController::class, 'store'])->name('customers.store');
        Route::put('customers/{customer}', [CustomerApiController::class, 'update'])->name('customers.update');
        Route::delete('customers/{customer}', [CustomerApiController::class, 'destroy'])->name('customers.destroy');

        Route::post('drivers', [DriverApiController::class, 'store'])->name('drivers.store');
        Route::put('drivers/{driver}', [DriverApiController::class, 'update'])->name('drivers.update');
        Route::delete('drivers/{driver}', [DriverApiController::class, 'destroy'])->name('drivers.destroy');

        Route::post('vehicles', [VehicleApiController::class, 'store'])->name('vehicles.store');
        Route::put('vehicles/{vehicle}', [VehicleApiController::class, 'update'])->name('vehicles.update');
        Route::delete('vehicles/{vehicle}', [VehicleApiController::class, 'destroy'])->name('vehicles.destroy');

        Route::post('order-statuses', [OrderStatusApiController::class, 'store'])->name('order-statuses.store');
        Route::put('order-statuses/{order_status}', [OrderStatusApiController::class, 'update'])->name('order-statuses.update');
        Route::delete('order-statuses/{order_status}', [OrderStatusApiController::class, 'destroy'])->name('order-statuses.destroy');

        Route::post('users', [UserApiController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserApiController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserApiController::class, 'destroy'])->name('users.destroy');

        // Precios: preview del motor + CRUD de precios y relaciones (ADR-010, Fases 8+)
        Route::post('pricing/prices/preview', [PriceApiController::class, 'preview'])->name('pricing.prices.preview');
        Route::post('pricing/prices', [PriceApiController::class, 'store'])->name('pricing.prices.store');
        Route::put('pricing/prices/{wholesaler_price}', [PriceApiController::class, 'update'])->name('pricing.prices.update');
        Route::delete('pricing/prices/{wholesaler_price}', [PriceApiController::class, 'destroy'])->name('pricing.prices.destroy');
        Route::post('pricing/relations', [PriceApiController::class, 'storeRelation'])->name('pricing.relations.store');
        Route::put('pricing/relations/{plant_product}', [PriceApiController::class, 'updateRelation'])->name('pricing.relations.update');
        Route::delete('pricing/relations/{plant_product}', [PriceApiController::class, 'destroyRelation'])->name('pricing.relations.destroy');
        Route::get('pricing/relations/{plant_product}/history', [PriceApiController::class, 'history'])->name('pricing.relations.history');
    });
});

require __DIR__.'/auth.php';