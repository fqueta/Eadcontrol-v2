#!/bin/bash

# Backup das configurações atuais
cp /etc/sysctl.conf /etc/sysctl.conf.bak

# Configurações para Alta Concorrência (70k+)
cat <<EOF >> /etc/sysctl.conf

# --- Otimização para 70k Conexões ---
# Aumentar limites de arquivos abertos
fs.file-max = 2097152

# Aumentar range de portas locais e conexões
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535

# Reutilização de conexões TCP (TIME_WAIT)
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Buffers de memória TCP
net.core.rmem_default = 31457280
net.core.rmem_max = 67108864
net.core.wmem_default = 31457280
net.core.wmem_max = 67108864
net.ipv4.tcp_mem = 31457280 31457280 67108864

# Proteção e Keepalive
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
EOF

# Aplicar configurações
sysctl -p

# Aumentar ulimit para a sessão atual e permanente
echo "* soft nofile 1048576" >> /etc/security/limits.conf
echo "* hard nofile 1048576" >> /etc/security/limits.conf
ulimit -n 1048576

echo "Otimizações de Kernel aplicadas!"
