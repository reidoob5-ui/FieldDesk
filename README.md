# FieldDesk

**Gestão inteligente de serviços técnicos e equipas externas.**

FieldDesk é uma aplicação web responsiva e instalável (PWA) para empresas de manutenção, assistência técnica e operações no terreno.

## O que existe no repositório

### Dashboard e módulos
- Dashboard com ordens, clientes, técnicos e materiais carregados do Supabase quando o projeto está configurado e existe uma sessão válida.
- Criação de ordens, criação de clientes, cadastro de técnicos e materiais através do dashboard.
- Alteração do estado das ordens através de uma RPC que valida permissões e transições no servidor.
- Registo de consumo de materiais por ordem, com desconto de stock e histórico transacional no servidor.
- Modo de demonstração local disponível quando não existem credenciais Supabase configuradas.
- Agenda semanal e indicadores analíticos ainda contêm elementos demonstrativos.
- Relatórios e exportação CSV.
- Interface em português, inglês e espanhol.
- Moedas configuráveis (USD, EUR, AOA).
- PWA com manifesto e service worker.
- Página de autenticação e onboarding Supabase em `login.html`.

### Fundação backend Supabase
- Migrações PostgreSQL para organizações, memberships, clientes, técnicos, ordens, histórico, materiais, anexos e aprovações.
- RLS inicial para isolamento por organização.
- Função `create_organization` que cria a organização e atribui o primeiro proprietário.
- Trigger que cria o perfil após registo Auth.
- Políticas reforçadas para restringir atualizações de ordens aos técnicos atribuídos e staff autorizado.

## Executar localmente

```bash
python -m http.server 4173
```

Abre http://localhost:4173.

## Configurar Supabase

Segue o guia [supabase/SETUP.md](./supabase/SETUP.md).

1. Cria um projeto Supabase.
2. Copia `supabase/config.example.js` para `supabase/config.js` e coloca o Project URL e a chave pública publishable/anon.
3. Liga o projeto com Supabase CLI e executa `supabase db push`.
4. Na Vercel, define `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) como variáveis de ambiente.
5. Abre `/login.html`, cria uma conta e um workspace.

Nunca coloques uma chave `service_role` no frontend. O ficheiro `supabase/config.js` está no `.gitignore`. Na Vercel, `api/config.js` entrega ao browser apenas as credenciais públicas configuradas no projeto.

## Estado real do produto

**O dashboard já tem uma camada de integração Supabase implementada no código.** Com as credenciais configuradas, migrações aplicadas e sessão/workspace válidos, ordens, clientes, técnicos e materiais são lidos do PostgreSQL; a criação de ordens/clientes/técnicos/materiais e as alterações de estado usam operações reais. Sem credenciais, a aplicação permanece em modo de demonstração. Esta integração ainda não foi validada num projeto Supabase real nem testada em produção.

Antes de produção, ainda é necessário:
- Completar a agenda e os relatórios com dados reais; rever os fluxos e permissões com testes automatizados.
- Implementar convites e gestão de membros/permissões.
- Configurar políticas de Storage para fotografias e documentos.
- Implementar checklists, assinaturas e portal de cliente.
- Implementar GPS com consentimento e políticas de retenção.
- Implementar billing, limites por plano, auditoria e notificações.
- Testes automatizados de RLS, fluxos de autenticação e isolamento entre organizações.
- Backups, monitorização, SMTP e hardening de segurança.

## Planos de lançamento (hipóteses de preço)

| Plano | Preço | Limite |
|---|---:|---:|
| Starter | $19/mês | 3 técnicos |
| Professional | $49/mês | 15 técnicos |
| Business | $99/mês | 50 técnicos |

Os preços são hipóteses iniciais para validação, não preços de mercado comprovados.
