<?php

return [
    'required' => 'El campo :attribute es obligatorio.',
    'email' => 'El campo :attribute debe ser un correo válido.',
    'unique' => 'El campo :attribute ya se encuentra registrado.',
    'numeric' => 'El campo :attribute debe ser numérico.',
    'min' => [
        'string' => 'El campo :attribute debe tener al menos :min caracteres.',
        'numeric' => 'El campo :attribute debe ser al menos :min.',
    ],
    'max' => [
        'string' => 'El campo :attribute no debe superar :max caracteres.',
        'numeric' => 'El campo :attribute no debe superar :max.',
    ],
    'exists' => 'El valor seleccionado en :attribute no es válido.',
    'date' => 'El campo :attribute debe ser una fecha válida.',
    'file' => 'El campo :attribute debe ser un archivo.',
    'mimes' => 'El campo :attribute debe ser un archivo de tipo: :values.',
    'required_with' => 'El campo :attribute es obligatorio cuando :values está presente.',
    'gt' => 'El campo :attribute debe ser mayor que :value.',
    'gte' => 'El campo :attribute debe ser mayor o igual que :value.',
];