<?php

namespace App\Services\Media\Storage;

interface MediaStorageAdapterInterface
{
    /**
     * Faz upload de todos os arquivos de um diretório local para o storage remoto.
     *
     * @param string $localDir Caminho do diretório local com os arquivos (.m3u8, .ts, .jpg)
     * @param string $remotePrefix Prefixo da pasta no storage remoto (ex: "tenant/videos/hls/uuid")
     * @return array Lista de URLs públicas ou chaves dos arquivos enviados
     */
    public function uploadDirectory(string $localDir, string $remotePrefix): array;

    /**
     * Faz download de um arquivo do storage para um caminho local.
     *
     * @param string $remotePath Caminho ou chave do arquivo no storage
     * @param string $localDestination Caminho completo de destino no disco local
     * @return bool
     */
    public function downloadFile(string $remotePath, string $localDestination): bool;

    /**
     * Remove uma pasta/prefixo inteiro no storage.
     *
     * @param string $remotePrefix
     * @return bool
     */
    public function deleteDirectory(string $remotePrefix): bool;

    /**
     * Retorna a URL pública ou URL de streaming para o arquivo remoto.
     *
     * @param string $remotePath
     * @return string
     */
    public function getUrl(string $remotePath): string;
}
