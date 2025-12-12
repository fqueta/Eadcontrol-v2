<?php

return [
    [
        "title" => "Dashboard",
        "url" => "/",
        "icon" => "Home",
        "permission" => "dashboard.view",
    ],
    [
        "title" => "Clientes",
        "url" => "/clients",
        "icon" => "Users",
        "permission" => "clients.view",
    ],
    [
        "title" => "Objetos do Serviço",
        "url" => "/service-objects",
        "icon" => "Wrench",
        "permission" => "service-objects.view",
    ],
    [
        "title" => "Catálogo",
        "icon" => "Package",
        "permission" => "catalog.view",
        "items" => [
            [
                "title" => "Produtos",
                "url" => "/products",
                "permission" => "catalog.products.view",
            ],
            [
                "title" => "Serviços",
                "url" => "/services",
                "permission" => "catalog.services.view",
            ],
            [
                "title" => "Categorias",
                "url" => "/categories",
                "permission" => "catalog.categories.view",
            ],
        ],
    ],
    [
        "title" => "Orçamentos",
        "url" => "/budgets",
        "icon" => "FileText",
        "permission" => "budgets.view",
    ],
    [
        "title" => "Ordens de Serviço",
        "url" => "/service-orders",
        "icon" => "ClipboardList",
        "permission" => "service-orders.view",
    ],
    [
        "title" => "Financeiro",
        "icon" => "DollarSign",
        "permission" => "finance.view",
        "items" => [
            [
                "title" => "Pagamentos",
                "url" => "/payments",
                "permission" => "finance.payments.view",
            ],
            [
                "title" => "Fluxo de Caixa",
                "url" => "/cash-flow",
                "permission" => "finance.cash-flow.view",
            ],
            [
                "title" => "Contas a Receber",
                "url" => "/accounts-receivable",
                "permission" => "finance.accounts-receivable.view",
            ],
            [
                "title" => "Contas a Pagar",
                "url" => "/accounts-payable",
                "permission" => "finance.accounts-payable.view",
            ],
        ],
    ],
    [
        "title" => "Relatórios",
        "icon" => "BarChart3",
        "permission" => "reports.view",
        "items" => [
            [
                "title" => "Faturamento",
                "url" => "/reports/revenue",
                "permission" => "reports.revenue.view",
            ],
            [
                "title" => "OS por Período",
                "url" => "/reports/service-orders",
                "permission" => "reports.service-orders.view",
            ],
            [
                "title" => "Produtos Mais Vendidos",
                "url" => "/reports/top-products",
                "permission" => "reports.top-products.view",
            ],
            [
                "title" => "Análise Financeira",
                "url" => "/reports/financial",
                "permission" => "reports.financial.view",
            ],
        ],
    ],
    [
        "title" => "Configurações",
        "icon" => "Settings",
        "permission" => "settings.view",
        "items" => [
            [
                "title" => "Usuários",
                "url" => "/settings/users",
                "permission" => "settings.users.view",
            ],
            [
                "title" => "Perfis de Usuário",
                "url" => "/settings/user-profiles",
                "permission" => "settings.user-profiles.view",
            ],
            [
                "title" => "Permissões",
                "url" => "/settings/permissions",
                "permission" => "settings.permissions.view",
            ],
            [
                "title" => "Status de OS",
                "url" => "/settings/os-statuses",
                "permission" => "settings.os-statuses.view",
            ],
            [
                "title" => "Formas de Pagamento",
                "url" => "/settings/payment-methods",
                "permission" => "settings.payment-methods.view",
            ],
            [
                "title" => "Sistema",
                "url" => "/settings/system",
                "permission" => "settings.system.view",
            ],
        ],
    ],
];
