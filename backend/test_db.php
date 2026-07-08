<?php
$cols = DB::select("SHOW COLUMNS FROM cursos");
foreach($cols as $col) {
    if ($col->Field === 'parcelas' || $col->Field === 'valor_parcela') {
        echo $col->Field . " exists!\n";
    }
}
