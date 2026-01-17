Eu posso ajudar você a configurar o projeto no seu VPS, mas como sou uma IA rodando em um ambiente isolado, não tenho acesso direto às suas chaves SSH privadas ou senhas para conectar ao servidor `84.247.139.125`.

Para contornar isso de forma segura e profissional, proponho o seguinte plano:

1. **Criar um Script de Deploy Automatizado (`deploy.sh`)**:

   * Vou criar um script em shell na raiz do seu projeto.

   * Esse script usará o comando `ssh` e `rsync` (que você já tem no seu terminal) para enviar os arquivos do projeto para o seu VPS.

   * Ele também enviará comandos remotos para instalar o Docker (se necessário), configurar as variáveis de ambiente e subir os containers usando o `docker-compose.production.yml`.

2. **Ajustar Configurações de Produção**:

   * Verificar se o `docker-compose.production.yml` está pronto (já analisei e parece bom, mas precisa de um arquivo `.env` correto).

   * Vou criar um arquivo `.env.production.example` para você preencher com as senhas reais do banco e chaves de API antes de enviar.

**Por que essa abordagem é melhor?**

* **Segurança:** Você não precisa compartilhar sua chave privada ou senha de root comigo ou colá-la no chat.

* **Reutilizável:** Você poderá rodar `./deploy.sh` sempre que quiser atualizar o projeto no servidor no futuro.

Se você preferir que eu tente conectar diretamente (o que é mais complexo e arriscado), você precisaria colar o conteúdo da sua chave privada (`id_rsa`) em um arquivo no editor, mas **recomendo fortemente** a abordagem do script.

**O que farei se você aprovar:**

1. Criarei o arquivo `deploy.sh` com a lógica de instalação e atualização.
2. Criarei o arquivo `.env.production.example`.
3. Você apenas precisará rodar `./deploy.sh` no seu terminal.

