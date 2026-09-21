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
use App\Http\Controllers\Platform\OrderStatuses\OrderStatusApiController;
use App\Http\Controllers\Platform\OrderStatuses\OrderStatusController;
use App\Http\Controllers\Platform\Plants\PlantApiController;
use App\Http\Controllers\Platform\Plants\PlantController;
use App\Http\Controllers\Platform\Products\ProductApiController;
use App\Http\Controllers\Platform\Products\ProductController;
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
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

/*
|--------------------------------------------------------------------------
| Formulario público (sin autenticación)
|--------------------------------------------------------------------------
| Se registra ANTES de las rutas del panel para no colisionar con
| /pedidos/{order} (model binding).
*/
Route::prefix('pedidos')->name('pedidos.')->group(function () {
    Route::get('registro', [PublicOrderController::class, 'create'])->name('registro');
    Route::post('registro', [PublicOrderController::class, 'store'])->name('registro.store');
    Route::post('consulta-cliente', [PublicOrderController::class, 'lookupCustomer'])
        ->middleware('throttle:30,1')
        ->name('customer.lookup');
    Route::get('{order}/confirmado', [PublicOrderController::class, 'confirmed'])->name('confirmado');
});

Route::middleware('auth')->group(function () {
    Route::get('/panel', [DashboardController::class, 'index'])->name('dashboard');

    // Pedidos del panel
    Route::get('/pedidos', [OrderController::class, 'index'])->name('pedidos.index');
    Route::get('/pedidos/{order}/detalle', [OrderApiController::class, 'detail'])->name('pedidos.detail');
    Route::get('/pedidos/{order}', [OrderController::class, 'show'])->name('pedidos.show');
    Route::post('/pedidos/{order}/estado', [OrderApiController::class, 'changeStatus'])->name('pedidos.status');

    // Archivos adjuntos (acceso autorizado)
    Route::get('/archivos/{mediaFile}/descargar', [MediaController::class, 'download'])->name('media.download');

    // Catálogos
    Route::prefix('catalogos')->name('catalogos.')->group(function () {
        Route::resource('asesores', AdvisorController::class)->only(['index']);
        Route::post('asesores', [AdvisorApiController::class, 'store'])->name('advisors.store');
        Route::put('asesores/{advisor}', [AdvisorApiController::class, 'update'])->name('advisors.update');
        Route::delete('asesores/{advisor}', [AdvisorApiController::class, 'destroy'])->name('advisors.destroy');

        Route::resource('mayoristas', WholesalerController::class)->only(['index']);
        Route::post('mayoristas', [WholesalerApiController::class, 'store'])->name('wholesalers.store');
        Route::put('mayoristas/{wholesaler}', [WholesalerApiController::class, 'update'])->name('wholesalers.update');
        Route::delete('mayoristas/{wholesaler}', [WholesalerApiController::class, 'destroy'])->name('wholesalers.destroy');

        Route::resource('plantas', PlantController::class)->only(['index']);
        Route::post('plantas', [PlantApiController::class, 'store'])->name('plants.store');
        Route::put('plantas/{plant}', [PlantApiController::class, 'update'])->name('plants.update');
        Route::delete('plantas/{plant}', [PlantApiController::class, 'destroy'])->name('plants.destroy');

        Route::resource('productos', ProductController::class)->only(['index']);
        Route::post('productos', [ProductApiController::class, 'store'])->name('products.store');
        Route::put('productos/{product}', [ProductApiController::class, 'update'])->name('products.update');
        Route::delete('productos/{product}', [ProductApiController::class, 'destroy'])->name('products.destroy');

        Route::resource('clientes', CustomerController::class)->only(['index']);
        Route::post('clientes', [CustomerApiController::class, 'store'])->name('customers.store');
        Route::put('clientes/{customer}', [CustomerApiController::class, 'update'])->name('customers.update');
        Route::delete('clientes/{customer}', [CustomerApiController::class, 'destroy'])->name('customers.destroy');

        Route::resource('conductores', DriverController::class)->only(['index']);
        Route::post('conductores', [DriverApiController::class, 'store'])->name('drivers.store');
        Route::put('conductores/{driver}', [DriverApiController::class, 'update'])->name('drivers.update');
        Route::delete('conductores/{driver}', [DriverApiController::class, 'destroy'])->name('drivers.destroy');

        Route::resource('vehiculos', VehicleController::class)->only(['index']);
        Route::post('vehiculos', [VehicleApiController::class, 'store'])->name('vehicles.store');
        Route::put('vehiculos/{vehicle}', [VehicleApiController::class, 'update'])->name('vehicles.update');
        Route::delete('vehiculos/{vehicle}', [VehicleApiController::class, 'destroy'])->name('vehicles.destroy');

        Route::get('estados', [OrderStatusController::class, 'index'])->name('order-statuses.index');
        Route::post('estados', [OrderStatusApiController::class, 'store'])->name('order-statuses.store');
        Route::put('estados/{order_status}', [OrderStatusApiController::class, 'update'])->name('order-statuses.update');
        Route::delete('estados/{order_status}', [OrderStatusApiController::class, 'destroy'])->name('order-statuses.destroy');
    });

    // Usuarios internos
    Route::prefix('usuarios')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
        Route::post('/', [UserApiController::class, 'store'])->name('store');
        Route::put('/{user}', [UserApiController::class, 'update'])->name('update');
        Route::delete('/{user}', [UserApiController::class, 'destroy'])->name('destroy');
    });

    // Perfil
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';