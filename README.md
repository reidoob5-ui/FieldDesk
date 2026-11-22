# FieldDesk

**Gestão inteligente de serviços técnicos e equipas externas.**

FieldDesk é uma aplicação web responsiva e instalável (PWA) para empresas de manutenção, assistência técnica e operações no terreno.

## MVP incluído
- Dashboard operacional com indicadores e atividade recente.
- Ordens de trabalho: criação, pesquisa, filtros e atualização de estado.
- Gestão de técnicos e respetiva disponibilidade.
- Agenda operacional semanal.
- Registo de materiais e custos por intervenção.
- Relatórios com métricas de execução.
- Interface em português, inglês e espanhol.
- Moedas configuráveis (USD, EUR, AOA).
- Persistência local para demonstração, sem backend nesta primeira versão.
- PWA com manifesto e service worker.

## Executar localmente
Como é uma aplicação estática, basta servir a pasta com qualquer servidor HTTP:

```bash
python -m http.server 4173
```

Abrir http://localhost:4173.

Também pode ser publicada em GitHub Pages, Netlify ou Vercel como site estático.

## Importante: estado do produto
Esta entrega é um **MVP frontend funcional**. Os dados ficam no navegador (localStorage). Autenticação, multi-tenancy real, sincronização entre utilizadores, mapas/GPS, notificações, uploads de fotografias, assinatura digital, pagamentos e API/backend ainda precisam de ser implementados antes de uso empresarial em produção.

## Planos de lançamento (preços de teste)
| Plano | Preço | Limite |
|---|---:|---:|
| Starter | $19/mês | 3 técnicos |
| Professional | $49/mês | 15 técnicos |
| Business | $99/mês | 50 técnicos |

Os preços são hipóteses iniciais de validação, não preços de mercado comprovados.

## Próximos passos técnicos
1. Backend API e base de dados PostgreSQL.
2. Autenticação, organizações e isolamento multi-tenant.
3. RBAC: administrador, despachante, técnico e cliente.
4. Upload privado de evidências e assinatura.
5. GPS com consentimento e histórico de deslocação.
6. Aprovação de orçamento pelo cliente.
7. Billing e limites de plano.
8. Testes, observabilidade, backups e hardening de segurança.
